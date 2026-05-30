from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import re
# Local imports: attempt package-relative imports first (works with `import backend.app`),
# then fall back to top-level imports to preserve running as a script (python backend/app.py).
try:
    from .onboard import *  # type: ignore
except Exception:
    from onboard import *  # type: ignore

# optional agent imports
# from jgaad_ai_agent_backup import jgaad_chat_with_gemini
# import gemini_fin_path

try:
    from .logger_config import log_request, log_error, log_info  # type: ignore
except Exception:
    from logger_config import log_request, log_error, log_info  # type: ignore

try:
    from .database import (
        init_db, create_user, get_user_by_email,
        get_user_portfolio, update_portfolio_section,
        reset_user_to_sample, record_reset_audit, get_reset_audit_for_user
    )
except Exception:
    from database import (
        init_db, create_user, get_user_by_email,
        get_user_portfolio, update_portfolio_section,
        reset_user_to_sample, record_reset_audit, get_reset_audit_for_user
    )

try:
    from .auth import require_auth, create_jwt_token  # type: ignore
except Exception:
    from auth import require_auth, create_jwt_token  # type: ignore
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
import bcrypt

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'budgetiq-secret-key-change-in-production')
CORS(app, resources={r"/*": {"origins": "*"}})  # JWT tokens don't require credentials

# Initialize database on startup
try:
    db_mode = init_db()
    if db_mode == 'json':
        log_info('[WARN] Using JSON fallback storage')
    else:
        log_info('[OK] Database initialized successfully')
except Exception as e:
    log_error(f"Failed to initialize database: {str(e)}")

# =================== AUTHENTICATION ENDPOINTS ===================

@app.route('/auth/signup', methods=['POST'])
def signup():
    """Sign up with email and password"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # Create user
        from database import create_user
        user = create_user(email=email, password=password, name=name)
        
        if not user:
            return jsonify({'error': 'Email already registered'}), 409
        
        # Create JWT token for auto-login
        token = create_jwt_token(user['id'], user['email'])
        
        log_info(f"User signed up: {email}")
        return jsonify({
            'status': 'success',
            'message': 'Account created successfully',
            'user': {'id': user['id'], 'email': user['email'], 'name': user['name']},
            'token': token
        })
        
    except Exception as e:
        log_error(f"Error in signup: {str(e)}")
        return jsonify({'error': 'Signup failed', 'details': str(e)}), 500

@app.route('/auth/login', methods=['POST'])
def login():
    """Login with email and password"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        from database import get_user_by_email, verify_password
        user = get_user_by_email(email)
        
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Get the password hash using the appropriate column name
        password_hash = user.get('password_hash') or user.get('password') or user.get('password_digest')
        
        if not password_hash:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not verify_password(password, password_hash):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Create JWT token
        token = create_jwt_token(user['id'], user['email'])
        
        log_info(f"User logged in: {email}")
        return jsonify({
            'status': 'success',
            'message': 'Logged in successfully',
            'user': {'id': user['id'], 'email': user['email'], 'name': user.get('name')},
            'token': token
        })
        
    except Exception as e:
        log_error(f"Error in login: {str(e)}")
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500

@app.route('/auth/logout', methods=['POST'])
def logout():
    """Logout user"""
    # With JWT tokens, logout is handled on the client side by removing the token
    return jsonify({'status': 'success', 'message': 'Logged out successfully'})

@app.route('/auth/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current logged in user"""
    try:
        user_id = request.user['id']
        from database import get_user_by_email
        
        # You might want to query the database for more info
        return jsonify({
            'status': 'success',
            'user': request.user
        })
    except Exception as e:
        return jsonify({'error': 'Failed to get user'}), 500

@app.route('/user/data', methods=['GET'])
@require_auth
def get_user_portfolio_data():
    """Get portfolio data for the authenticated user"""
    try:
        user_id = request.user['id']
        # Fetch stored portfolio data for this user (DB or JSON fallback)
        portfolio_data = get_user_portfolio(user_id)
        if not portfolio_data:
            # If no stored data, seed the user with the sample portfolio (if available)
            try:
                reset_user_to_sample(user_id)
                portfolio_data = get_user_portfolio(user_id)
            except Exception:
                portfolio_data = {
                    'portfolio': {},
                    'monthlyData': [],
                    'assetAllocation': [],
                    'incomeStreams': [],
                    'liabilities': [],
                    'investmentGoals': [],
                    'recentActivity': [],
                    'expenseCategories': [],
                    'riskTolerance': 'moderate'
                }

        log_info(f"Portfolio data fetched for user: {request.user.get('email')}")
        return jsonify(portfolio_data)
    except Exception as e:
        log_error(f"Error fetching portfolio data: {str(e)}")
        return jsonify({'error': 'Failed to fetch portfolio data'}), 500

# =================== GENERAL ENDPOINTS ===================
@app.route('/', methods=['GET'])
def home():
    log_info('Home endpoint accessed')
    return jsonify({
        'status': 'BudgetIQ API is running',
        'version': '2.0',
        'database': 'PostgreSQL',
        'auth': 'JWT'
    })

# =================== USER DATA APIS (MULTI-USER) ===================

@app.route('/portfolio', methods=['GET'])
@require_auth
def get_portfolio():
    """Get portfolio summary"""
    try:
        user_id = request.user['id']
        portfolio_data = get_user_portfolio(user_id)
        return jsonify(portfolio_data.get('portfolio', {}) if portfolio_data else {})
        
    except Exception as e:
        log_error(f"Error retrieving portfolio: {str(e)}")
        return jsonify({'error': 'Failed to retrieve portfolio', 'details': str(e)}), 500

@app.route('/portfolio', methods=['POST'])
@require_auth
def update_portfolio():
    """Update the portfolio summary for the authenticated user."""
    try:
        user_id = request.user['id']
        payload = request.get_json() or {}
        portfolio_data = payload.get('portfolio', payload)

        if update_portfolio_section(user_id, 'portfolio', portfolio_data):
            updated = get_user_portfolio(user_id)
            return jsonify({'status': 'success', 'message': 'Portfolio summary updated successfully', 'portfolioData': updated})
        return jsonify({'error': 'Failed to update portfolio summary'}), 500
    except Exception as e:
        log_error(f"Error updating portfolio: {str(e)}")
        return jsonify({'error': 'Failed to update portfolio summary', 'details': str(e)}), 500

@app.route('/portfolio/monthly', methods=['POST'])
@require_auth
def update_monthly_portfolio_data():
    """Update the monthly portfolio data for the authenticated user."""
    try:
        user_id = request.user['id']
        payload = request.get_json()

        if update_portfolio_section(user_id, 'monthlyData', payload):
            updated = get_user_portfolio(user_id)
            return jsonify({'status': 'success', 'message': 'Monthly data updated successfully', 'portfolioData': updated})
        return jsonify({'error': 'Failed to update monthly data'}), 500
    except Exception as e:
        log_error(f"Error updating monthly data: {str(e)}")
        return jsonify({'error': 'Failed to update monthly data', 'details': str(e)}), 500

@app.route('/portfolio/assets', methods=['POST'])
@require_auth
def update_asset_allocation():
    """Update asset allocation for the authenticated user."""
    try:
        user_id = request.user['id']
        payload = request.get_json()

        if update_portfolio_section(user_id, 'assetAllocation', payload):
            updated = get_user_portfolio(user_id)
            return jsonify({'status': 'success', 'message': 'Asset allocation updated successfully', 'portfolioData': updated})
        return jsonify({'error': 'Failed to update asset allocation'}), 500
    except Exception as e:
        log_error(f"Error updating asset allocation: {str(e)}")
        return jsonify({'error': 'Failed to update asset allocation', 'details': str(e)}), 500

@app.route('/portfolio/monthly', methods=['GET'])
@require_auth
def get_monthly_data():
    """Get monthly portfolio data"""
    try:
        user_id = request.user['id']
        portfolio_data = get_user_portfolio(user_id)
        return jsonify(portfolio_data.get('monthlyData', {}) if portfolio_data else {})
        
    except Exception as e:
        log_error(f"Error retrieving monthly data: {str(e)}")
        return jsonify({'error': 'Failed to retrieve monthly data', 'details': str(e)}), 500

@app.route('/portfolio/assets', methods=['GET'])
@require_auth
def get_asset_allocation():
    """Get asset allocation data"""
    try:
        user_id = request.user['id']
        portfolio_data = get_user_portfolio(user_id)
        return jsonify(portfolio_data.get('assetAllocation', {}) if portfolio_data else {})
        
    except Exception as e:
        log_error(f"Error retrieving asset allocation: {str(e)}")
        return jsonify({'error': 'Failed to retrieve asset allocation', 'details': str(e)}), 500

@app.route('/income', methods=['GET'])
@require_auth
def get_income():
    """Get income streams"""
    try:
        user_id = request.user['id']
        portfolio_data = get_user_portfolio(user_id)
        return jsonify(portfolio_data.get('incomeStreams', []) if portfolio_data else [])
        
    except Exception as e:
        log_error(f"Error retrieving income: {str(e)}")
        return jsonify({'error': 'Failed to retrieve income', 'details': str(e)}), 500

@app.route('/income', methods=['POST'])
@require_auth
def update_income():
    """Update income streams"""
    try:
        user_id = request.user['id']
        income_data = request.get_json()
        
        if update_portfolio_section(user_id, 'incomeStreams', income_data):
            log_info(f"Income updated")
            updated = get_user_portfolio(user_id)
            return jsonify({'status': 'success', 'message': 'Income updated successfully', 'portfolioData': updated})
        else:
            return jsonify({'error': 'Failed to update income'}), 500
            
    except Exception as e:
        log_error(f"Error updating income: {str(e)}")
        return jsonify({'error': 'Failed to update income', 'details': str(e)}), 500

@app.route('/expenses', methods=['GET'])
@require_auth
def get_expenses():
    """Get expense categories"""
    try:
        user_id = request.user['id']
        portfolio_data = get_user_portfolio(user_id)
        return jsonify(portfolio_data.get('expenseCategories', []) if portfolio_data else [])
        
    except Exception as e:
        log_error(f"Error retrieving expenses: {str(e)}")
        return jsonify({'error': 'Failed to retrieve expenses', 'details': str(e)}), 500

@app.route('/expenses', methods=['POST'])
@require_auth
def update_expenses():
    """Update expense categories"""
    try:
        user_id = request.user['id']
        expense_data = request.get_json()
        
        if update_portfolio_section(user_id, 'expenseCategories', expense_data):
            log_info(f"Expenses updated")
            updated = get_user_portfolio(user_id)
            return jsonify({'status': 'success', 'message': 'Expenses updated successfully', 'portfolioData': updated})
        else:
            return jsonify({'error': 'Failed to update expenses'}), 500
            
    except Exception as e:
        log_error(f"Error updating expenses: {str(e)}")
        return jsonify({'error': 'Failed to update expenses', 'details': str(e)}), 500

@app.route('/goals', methods=['GET'])
@require_auth
def get_goals():
    """Get investment goals"""
    try:
        user_id = request.user['id']
        portfolio_data = get_user_portfolio(user_id)
        return jsonify(portfolio_data.get('investmentGoals', []) if portfolio_data else [])
        
    except Exception as e:
        log_error(f"Error retrieving goals: {str(e)}")
        return jsonify({'error': 'Failed to retrieve goals', 'details': str(e)}), 500

@app.route('/goals', methods=['POST'])
@require_auth
def update_goals():
    """Update investment goals"""
    try:
        user_id = request.user['id']
        goals_data = request.get_json()
        
        if update_portfolio_section(user_id, 'investmentGoals', goals_data):
            log_info(f"Goals updated")
            updated = get_user_portfolio(user_id)
            return jsonify({'status': 'success', 'message': 'Goals updated successfully', 'portfolioData': updated})
        else:
            return jsonify({'error': 'Failed to update goals'}), 500
            
    except Exception as e:
        log_error(f"Error updating goals: {str(e)}")
        return jsonify({'error': 'Failed to update goals', 'details': str(e)}), 500

@app.route('/liabilities', methods=['GET'])
@require_auth
def get_liabilities():
    """Get liabilities"""
    try:
        user_id = request.user['id']
        portfolio_data = get_user_portfolio(user_id)
        return jsonify(portfolio_data.get('liabilities', []) if portfolio_data else [])
        
    except Exception as e:
        log_error(f"Error retrieving liabilities: {str(e)}")
        return jsonify({'error': 'Failed to retrieve liabilities', 'details': str(e)}), 500

@app.route('/liabilities', methods=['POST'])
@require_auth
def update_liabilities():
    """Update liabilities"""
    try:
        user_id = request.user['id']
        liabilities_data = request.get_json()
        
        if update_portfolio_section(user_id, 'liabilities', liabilities_data):
            log_info(f"Liabilities updated")
            updated = get_user_portfolio(user_id)
            return jsonify({'status': 'success', 'message': 'Liabilities updated successfully', 'portfolioData': updated})
        else:
            return jsonify({'error': 'Failed to update liabilities'}), 500
            
    except Exception as e:
        log_error(f"Error updating liabilities: {str(e)}")
        return jsonify({'error': 'Failed to update liabilities', 'details': str(e)}), 500

@app.route('/risk-tolerance', methods=['GET'])
@require_auth
def get_risk_tolerance():
    """Get risk tolerance"""
    try:
        user_id = request.user['id']
        portfolio_data = get_user_portfolio(user_id)
        return jsonify({'riskTolerance': portfolio_data.get('riskTolerance', 'moderate') if portfolio_data else 'moderate'})
        
    except Exception as e:
        log_error(f"Error retrieving risk tolerance: {str(e)}")
        return jsonify({'error': 'Failed to retrieve risk tolerance', 'details': str(e)}), 500

@app.route('/risk-tolerance', methods=['POST'])
@require_auth
def update_risk_tolerance():
    """Update risk tolerance"""
    try:
        user_id = request.user['id']
        data = request.get_json()
        risk_tolerance = data.get('riskTolerance', 'moderate')
        
        if update_portfolio_section(user_id, 'riskTolerance', risk_tolerance):
            log_info(f"Risk tolerance updated")
            updated = get_user_portfolio(user_id)
            return jsonify({'status': 'success', 'message': 'Risk tolerance updated successfully', 'portfolioData': updated})
        else:
            return jsonify({'error': 'Failed to update risk tolerance'}), 500
            
    except Exception as e:
        log_error(f"Error updating risk tolerance: {str(e)}")
        return jsonify({'error': 'Failed to update risk tolerance', 'details': str(e)}), 500

@app.route('/debug/inspect', methods=['GET'])
@require_auth
def debug_inspect():
    """Temporary debug endpoint to inspect auth and stored portfolio for current user."""
    try:
        user = request.user
        user_id = user.get('id')
        pd = get_user_portfolio(user_id)
        log_info(f"[DEBUG] Inspect requested for user: {user.get('email')} (id={user_id})")
        return jsonify({
            'user': user,
            'portfolio_data_raw': pd
        })
    except Exception as e:
        log_error(f"Debug inspect failed: {e}")
        return jsonify({'error': 'Debug inspect failed', 'details': str(e)}), 500


@app.route('/portfolio/reset-to-sample', methods=['POST'])
@require_auth
def reset_portfolio_to_sample():
    """Reset the authenticated user's portfolio to the sample dataset."""
    try:
        user_id = request.user['id']
        success = reset_user_to_sample(user_id)
        if success:
            actor = request.user.get('email')
            try:
                record_reset_audit(user_id, actor_email=actor, action='reset_to_sample', details={'via': 'api'})
            except Exception:
                pass
            log_info(f"User {actor} portfolio reset to sample")
            return jsonify({'status': 'success', 'message': 'Portfolio reset to sample data'})
        return jsonify({'error': 'Failed to reset portfolio'}), 500
    except Exception as e:
        log_error(f"Error in reset_portfolio_to_sample: {str(e)}")
        return jsonify({'error': 'Failed to reset portfolio', 'details': str(e)}), 500


@app.route('/portfolio/reset-history', methods=['GET'])
@require_auth
def get_reset_history():
    """Return recent reset audit entries for the authenticated user."""
    try:
        user_id = request.user['id']
        entries = get_reset_audit_for_user(user_id, limit=50)
        return jsonify({'status': 'success', 'entries': entries})
    except Exception as e:
        log_error(f"Error fetching reset history: {e}")
        return jsonify({'error': 'Failed to fetch reset history', 'details': str(e)}), 500

# =================== DYNAMIC APIS ===================
@app.route('/agent', methods=['POST'])
def agent():
    try:
        inp = request.form.get('input')
        if not inp:
            return jsonify({'error': 'No input provided'}), 400

        print(f"Received query: {inp}")
        
        # First try direct Gemini response
        try:
            direct_response = jgaad_chat_with_gemini(inp)
            if direct_response:
                return jsonify({
                    'output': direct_response,
                    'source': 'gemini',
                    'status': 'success'
                })
        except Exception as e:
            print(f"Gemini direct response failed: {str(e)}")
        
        # Fallback to agent if Gemini fails
        try:
            process = subprocess.Popen(
                ['python', 'agent.py', inp],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )
            
            output = []
            while True:
                line = process.stdout.readline()
                if not line and process.poll() is not None:
                    break
                if line:
                    print(f"Agent output: {line.strip()}")
                    output.append(line)
            
            output_str = ''.join(output)
            process.wait()

            final_answer = re.search(r'<Response>(.*?)</Response>', output_str, re.DOTALL)
            if final_answer:
                return jsonify({
                    'output': final_answer.group(1).strip(),
                    'thought': output_str,
                    'source': 'agent',
                    'status': 'success'
                })
            else:
                return jsonify({
                    'error': 'Could not extract response from agent',
                    'raw_output': output_str
                }), 500
                
        except Exception as e:
            print(f"Agent processing failed: {str(e)}")
            return jsonify({
                'error': f'Agent processing failed: {str(e)}',
                'status': 'error'
            }), 500
            
    except Exception as e:
        print(f"General error in /agent endpoint: {str(e)}")
        return jsonify({
            'error': f'An unexpected error occurred: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/ai-financial-path', methods=['POST'])
def ai_financial_path():
    if 'input' not in request.form:
        return jsonify({'error': 'No input provided'}), 400
        
    input_text = request.form.get('input','')
    risk = request.form.get('risk', 'conservative')
    print(input_text)
    try:
        response = gemini_fin_path.get_gemini_response(input_text, risk)
        return jsonify(response)
    except Exception as e:
        print(f"Error in ai_financial_path: {str(e)}")
        return jsonify({'error': 'Something went wrong', 'details': str(e)}), 500

# =================== STATIC APIS ===================
@app.route('/auto-bank-data', methods=['GET'])
def AutoBankData():
    return bank_data

@app.route('/auto-mf-data', methods=['GET'])
def AutoMFData():
    return mf_data


# =================== CONENCTION APIS ===================

# =================== BOTS ===================
# @

if __name__ == "__main__":
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', '5000'))
    app.run(host=host, port=port, debug=True)