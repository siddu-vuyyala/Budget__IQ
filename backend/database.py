import os
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import json
from dotenv import load_dotenv
import bcrypt

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
USE_JSON_FALLBACK = not bool(DATABASE_URL)
JSON_DATA_FILE = os.path.join(os.path.dirname(__file__), 'data_store.json')
SAMPLE_PORTFOLIO_FILE = os.path.join(os.path.dirname(__file__), 'sample_portfolio.json')

# Load sample portfolio for default display
try:
    with open(SAMPLE_PORTFOLIO_FILE, 'r', encoding='utf-8') as _sf:
        SAMPLE_PORTFOLIO = json.load(_sf)
except Exception:
    SAMPLE_PORTFOLIO = None

def get_db_connection():
    """Create and return a database connection."""
    if USE_JSON_FALLBACK:
        raise RuntimeError('JSON fallback active; no DB connection available')
    return psycopg2.connect(DATABASE_URL)

def init_db():
    """Initialize database tables if they don't exist."""
    global USE_JSON_FALLBACK
    if USE_JSON_FALLBACK:
        # Ensure JSON file exists with base structure
        if not os.path.exists(JSON_DATA_FILE):
            base = {"next_user_id": 1, "users": [], "portfolio_data": {}}
            with open(JSON_DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(base, f, indent=2)
        print('[OK] JSON fallback initialized at', JSON_DATA_FILE)
        return 'json'

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
    except psycopg2.OperationalError as e:
        USE_JSON_FALLBACK = True
        print(f"[WARN] PostgreSQL unavailable, falling back to JSON storage: {e}")
        if not os.path.exists(JSON_DATA_FILE):
            base = {"next_user_id": 1, "users": [], "portfolio_data": {}}
            with open(JSON_DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(base, f, indent=2)
        return 'json'

    cursor = conn.cursor()
    
    try:
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                name VARCHAR(255),
                google_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Check if password_hash column exists, if not add it
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='users' AND column_name='password_hash'
        """)
        if not cursor.fetchone():
            print("Adding password_hash column to users table...")
            try:
                cursor.execute('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);')
            except:
                pass  # Column might already exist or be a different name
        
        # Portfolio data table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS portfolio_data (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                portfolio JSONB DEFAULT '{}',
                monthly_data JSONB DEFAULT '{}',
                asset_allocation JSONB DEFAULT '{}',
                income_streams JSONB DEFAULT '[]',
                expense_categories JSONB DEFAULT '[]',
                investment_goals JSONB DEFAULT '[]',
                liabilities JSONB DEFAULT '[]',
                risk_tolerance VARCHAR(50) DEFAULT 'moderate',
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
        ''')

        # Reset audit table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reset_audit (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                actor_email VARCHAR(255),
                action VARCHAR(255),
                details JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        print("[OK] Database tables initialized successfully")
        return 'postgres'
    except Exception as e:
        print(f"[ERROR] Error initializing database: {e}")
        if conn:
            conn.rollback()
        return 'postgres'
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def create_user(email: str, password: str = None, name: str = None, google_id: str = None):
    """Create new user."""
    import uuid
    # JSON fallback implementation
    if USE_JSON_FALLBACK:
        with open(JSON_DATA_FILE, 'r+', encoding='utf-8') as f:
            data = json.load(f)
            users = data.get('users', [])
            # Check existing
            if any(u['email'].lower() == email.lower() for u in users):
                return None

            user_id = data.get('next_user_id', 1)
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8') if password else None
            user = {'id': user_id, 'email': email, 'name': name or None, 'password_hash': password_hash}
            users.append(user)
            data['next_user_id'] = user_id + 1
            data['users'] = users
            # Create portfolio skeleton for new user. We intentionally do NOT
            # pre-populate each user's storage with the sample portfolio here.
            # The app will display the shared SAMPLE_PORTFOLIO for users who
            # haven't provided their own data yet. This keeps the sample the
            # same for everyone until they edit/save their portfolio.
            portfolio_data = data.get('portfolio_data', {})
            portfolio_data[str(user_id)] = {
                'portfolio': {}, 'monthlyData': [], 'assetAllocation': [],
                'incomeStreams': [], 'expenseCategories': [], 'investmentGoals': [],
                'liabilities': [], 'riskTolerance': 'moderate'
            }
            data['portfolio_data'] = portfolio_data
            f.seek(0)
            json.dump(data, f, indent=2)
            f.truncate()
            return user

    # PostgreSQL implementation (unchanged)
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Hash password if provided
        password_hash = None
        if password:
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Get the actual columns in the users table
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='users'
        """)
        columns = {row['column_name'] for row in cursor.fetchall()}
        
        # Determine which password column to use
        password_col = None
        if 'password_hash' in columns:
            password_col = 'password_hash'
        elif 'password' in columns:
            password_col = 'password'
        elif 'password_digest' in columns:
            password_col = 'password_digest'
        
        # Build INSERT statement dynamically based on available columns
        insert_cols = ['email']
        insert_vals = ['%s']
        insert_params = [email]
        
        # Handle clerk_id if it exists and doesn't allow NULL
        if 'clerk_id' in columns:
            insert_cols.append('clerk_id')
            insert_vals.append('%s')
            insert_params.append(f'local_{uuid.uuid4().hex[:16]}')  # Generate a unique clerk_id
        
        if password_col and password_hash:
            insert_cols.append(password_col)
            insert_vals.append('%s')
            insert_params.append(password_hash)
        
        if 'name' in columns and name:
            insert_cols.append('name')
            insert_vals.append('%s')
            insert_params.append(name)
        
        if 'google_id' in columns and google_id:
            insert_cols.append('google_id')
            insert_vals.append('%s')
            insert_params.append(google_id)
        
        return_cols = ['id', 'email']
        if 'name' in columns:
            return_cols.append('name')
        
        insert_sql = f"""
            INSERT INTO users ({', '.join(insert_cols)})
            VALUES ({', '.join(insert_vals)})
            RETURNING {', '.join(return_cols)}
        """
        
        cursor.execute(insert_sql, insert_params)
        user = cursor.fetchone()
        
        # Create portfolio for new user: populate with sample if available
        try:
            # Insert an empty skeleton row for the new user's portfolio_data.
            # We do NOT populate it with SAMPLE_PORTFOLIO here so that the
            # frontend can show the shared sample until the user makes edits.
            cursor.execute('''
                INSERT INTO portfolio_data (user_id, portfolio, monthly_data, asset_allocation, income_streams, expense_categories, investment_goals, liabilities, risk_tolerance)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                user['id'],
                json.dumps({}),
                json.dumps([]),
                json.dumps([]),
                json.dumps([]),
                json.dumps([]),
                json.dumps([]),
                json.dumps([]),
                'moderate'
            ))
        except psycopg2.IntegrityError:
            # Portfolio already exists
            pass
        
        conn.commit()
        return dict(user)
        
    except psycopg2.IntegrityError as e:
        conn.rollback()
        print(f"[ERROR] Integrity error: {e}")
        return None  # User already exists or constraint violation
    except Exception as e:
        print(f"[ERROR] Error creating user: {e}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

def get_user_by_email(email: str):
    """Get user by email (including password hash for login)."""
    if USE_JSON_FALLBACK:
        with open(JSON_DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for u in data.get('users', []):
                if u.get('email', '').lower() == email.lower():
                    return u
            return None

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get the actual columns in the users table
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='users'
        """)
        columns = {row['column_name'] for row in cursor.fetchall()}
        
        # Build SELECT statement dynamically based on available columns
        select_cols = ['id', 'email']
        
        if 'name' in columns:
            select_cols.append('name')
        
        # Find which password column exists
        password_col = None
        if 'password_hash' in columns:
            password_col = 'password_hash'
            select_cols.append(password_col)
        elif 'password' in columns:
            password_col = 'password'
            select_cols.append(password_col)
        elif 'password_digest' in columns:
            password_col = 'password_digest'
            select_cols.append(password_col)
        
        select_sql = f"SELECT {', '.join(select_cols)} FROM users WHERE email = %s"
        cursor.execute(select_sql, (email,))
        user = cursor.fetchone()
        return dict(user) if user else None
    except Exception as e:
        print(f"[ERROR] Error fetching user: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash."""
    try:
        # Ensure password is bytes
        password_bytes = password.encode('utf-8') if isinstance(password, str) else password
        # Ensure password_hash is bytes
        hash_bytes = password_hash.encode('utf-8') if isinstance(password_hash, str) else password_hash
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception as e:
        print(f"[ERROR] Password verification error: {e}")
        return False

def get_user_portfolio(user_id: int):
    """Get complete portfolio data for a user."""
    def normalize_list(value):
        return value if isinstance(value, list) else []

    def normalize_dict(value):
        return value if isinstance(value, dict) else {}

    def is_meaningful(pd):
        # Check if any lists or portfolio values have non-empty / non-zero content
        if not pd or not isinstance(pd, dict):
            return False
        lists = ['monthlyData', 'assetAllocation', 'incomeStreams', 'expenseCategories', 'investmentGoals', 'liabilities']
        for key in lists:
            v = pd.get(key) if isinstance(pd.get(key), list) else []
            if len(v) > 0:
                return True
        portfolio = pd.get('portfolio') if isinstance(pd.get('portfolio'), dict) else {}
        for val in portfolio.values():
            try:
                if float(val) and float(val) != 0:
                    return True
            except Exception:
                continue
        return False

    if USE_JSON_FALLBACK:
        with open(JSON_DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            pd = data.get('portfolio_data', {}).get(str(user_id))
            # If no data or only empty placeholders, return sample if available
            if not is_meaningful(pd):
                return json.loads(json.dumps(SAMPLE_PORTFOLIO)) if SAMPLE_PORTFOLIO else None
            return {
                'portfolio': normalize_dict(pd.get('portfolio')),
                'monthlyData': normalize_list(pd.get('monthlyData')),
                'assetAllocation': normalize_list(pd.get('assetAllocation')),
                'incomeStreams': normalize_list(pd.get('incomeStreams')),
                'expenseCategories': normalize_list(pd.get('expenseCategories')),
                'investmentGoals': normalize_list(pd.get('investmentGoals')),
                'liabilities': normalize_list(pd.get('liabilities')),
                'riskTolerance': pd.get('riskTolerance', 'moderate')
            }

    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute('''
            SELECT portfolio, monthly_data, asset_allocation, income_streams,
                   expense_categories, investment_goals, liabilities, risk_tolerance
            FROM portfolio_data WHERE user_id = %s
        ''', (user_id,))
        
        result = cursor.fetchone()
        if result:
            packed = {
                'portfolio': normalize_dict(result['portfolio']),
                'monthlyData': normalize_list(result['monthly_data']),
                'assetAllocation': normalize_list(result['asset_allocation']),
                'incomeStreams': normalize_list(result['income_streams']),
                'expenseCategories': normalize_list(result['expense_categories']),
                'investmentGoals': normalize_list(result['investment_goals']),
                'liabilities': normalize_list(result['liabilities']),
                'riskTolerance': result['risk_tolerance'] or 'moderate'
            }
            if not is_meaningful(packed):
                return json.loads(json.dumps(SAMPLE_PORTFOLIO)) if SAMPLE_PORTFOLIO else packed
            return packed
        # No stored portfolio: return sample as starter if available
        return json.loads(json.dumps(SAMPLE_PORTFOLIO)) if SAMPLE_PORTFOLIO else None
    except Exception as e:
        print(f"[ERROR] Error fetching portfolio: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

def update_portfolio_section(user_id: int, section: str, data):
    """Update a specific section of user portfolio."""
    section_map = {
        'portfolio': 'portfolio',
        'monthlyData': 'monthlyData',
        'assetAllocation': 'assetAllocation',
        'incomeStreams': 'incomeStreams',
        'expenseCategories': 'expenseCategories',
        'investmentGoals': 'investmentGoals',
        'liabilities': 'liabilities',
        'riskTolerance': 'riskTolerance'
    }
    if section not in section_map:
        print(f"[ERROR] Unknown section: {section}")
        return False

    if USE_JSON_FALLBACK:
        try:
            with open(JSON_DATA_FILE, 'r+', encoding='utf-8') as f:
                store = json.load(f)
                pd = store.get('portfolio_data', {})
                user_pd = pd.get(str(user_id))
                if not user_pd:
                    # Initialize empty portfolio if missing
                    user_pd = {'portfolio': {}, 'monthlyData': [], 'assetAllocation': [], 'incomeStreams': [],
                               'expenseCategories': [], 'investmentGoals': [], 'liabilities': [], 'riskTolerance': 'moderate'}
                if section_map[section] == 'riskTolerance':
                    user_pd['riskTolerance'] = data
                else:
                    user_pd[section_map[section]] = data
                pd[str(user_id)] = user_pd
                store['portfolio_data'] = pd
                f.seek(0)
                json.dump(store, f, indent=2)
                f.truncate()
                return True
        except Exception as e:
            print(f"[ERROR] JSON update failed: {e}")
            return False

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        section_map_db = {
            'portfolio': 'portfolio',
            'monthlyData': 'monthly_data',
            'assetAllocation': 'asset_allocation',
            'incomeStreams': 'income_streams',
            'expenseCategories': 'expense_categories',
            'investmentGoals': 'investment_goals',
            'liabilities': 'liabilities',
            'riskTolerance': 'risk_tolerance'
        }
        db_section = section_map_db.get(section)
        if not db_section:
            print(f"[ERROR] Unknown section: {section}")
            return False
        
        # Build update query
        if db_section == 'risk_tolerance':
            cursor.execute(f'''
                UPDATE portfolio_data
                SET {db_section} = %s, last_updated = CURRENT_TIMESTAMP
                WHERE user_id = %s
            ''', (data, user_id))
        else:
            cursor.execute(f'''
                UPDATE portfolio_data
                SET {db_section} = %s, last_updated = CURRENT_TIMESTAMP
                WHERE user_id = %s
            ''', (json.dumps(data), user_id))
        
        conn.commit()
        return True
    except Exception as e:
        print(f"[ERROR] Error updating portfolio: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()
        conn.close()


def reset_user_to_sample(user_id: int):
    """Reset a user's portfolio to the sample portfolio."""
    if SAMPLE_PORTFOLIO is None:
        print("[WARN] No sample portfolio available to reset user to.")
        return False

    if USE_JSON_FALLBACK:
        try:
            with open(JSON_DATA_FILE, 'r+', encoding='utf-8') as f:
                store = json.load(f)
                pd = store.get('portfolio_data', {})
                pd[str(user_id)] = json.loads(json.dumps(SAMPLE_PORTFOLIO))
                store['portfolio_data'] = pd
                f.seek(0)
                json.dump(store, f, indent=2)
                f.truncate()
                return True
        except Exception as e:
            print(f"[ERROR] JSON reset failed: {e}")
            return False

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO portfolio_data (user_id, portfolio, monthly_data, asset_allocation, income_streams, expense_categories, investment_goals, liabilities, risk_tolerance)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE SET
              portfolio = EXCLUDED.portfolio,
              monthly_data = EXCLUDED.monthly_data,
              asset_allocation = EXCLUDED.asset_allocation,
              income_streams = EXCLUDED.income_streams,
              expense_categories = EXCLUDED.expense_categories,
              investment_goals = EXCLUDED.investment_goals,
              liabilities = EXCLUDED.liabilities,
              risk_tolerance = EXCLUDED.risk_tolerance,
              last_updated = CURRENT_TIMESTAMP
        ''', (
            user_id,
            json.dumps(SAMPLE_PORTFOLIO.get('portfolio', {})),
            json.dumps(SAMPLE_PORTFOLIO.get('monthlyData', [])),
            json.dumps(SAMPLE_PORTFOLIO.get('assetAllocation', [])),
            json.dumps(SAMPLE_PORTFOLIO.get('incomeStreams', [])),
            json.dumps(SAMPLE_PORTFOLIO.get('expenseCategories', [])),
            json.dumps(SAMPLE_PORTFOLIO.get('investmentGoals', [])),
            json.dumps(SAMPLE_PORTFOLIO.get('liabilities', [])),
            SAMPLE_PORTFOLIO.get('riskTolerance', 'moderate')
        ))
        conn.commit()
        cursor.close()
        # Record audit in DB if possible
        try:
            record_reset_audit(user_id, actor_email=None, action='reset_to_sample', details={'method': 'api'})
        except Exception:
            pass
        return True
    except Exception as e:
        print(f"[ERROR] Failed to reset user to sample: {e}")
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return False
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def record_reset_audit(user_id: int, actor_email: str = None, action: str = 'reset_to_sample', details: dict = None):
    """Record a reset action in audit logs (JSON fallback or Postgres)."""
    details = details or {}
    if USE_JSON_FALLBACK:
        try:
            with open(JSON_DATA_FILE, 'r+', encoding='utf-8') as f:
                store = json.load(f)
                audits = store.get('reset_audit', [])
                audits.append({
                    'user_id': user_id,
                    'actor_email': actor_email,
                    'action': action,
                    'details': details,
                    'created_at': datetime.utcnow().isoformat() + 'Z'
                })
                store['reset_audit'] = audits
                f.seek(0)
                json.dump(store, f, indent=2)
                f.truncate()
                return True
        except Exception as e:
            print(f"[ERROR] JSON audit write failed: {e}")
            return False

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO reset_audit (user_id, actor_email, action, details)
            VALUES (%s, %s, %s, %s)
        ''', (user_id, actor_email, action, json.dumps(details)))
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        print(f"[ERROR] Failed to write reset audit: {e}")
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        return False
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


def get_reset_audit_for_user(user_id: int, limit: int = 20):
    """Fetch reset audit entries for a user."""
    if USE_JSON_FALLBACK:
        with open(JSON_DATA_FILE, 'r', encoding='utf-8') as f:
            store = json.load(f)
            audits = store.get('reset_audit', [])
            return [a for a in audits if a.get('user_id') == user_id][-limit:]

    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('''
            SELECT id, user_id, actor_email, action, details, created_at
            FROM reset_audit WHERE user_id = %s ORDER BY created_at DESC LIMIT %s
        ''', (user_id, limit))
        rows = cursor.fetchall()
        cursor.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"[ERROR] Failed to fetch reset audit: {e}")
        return []
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass

