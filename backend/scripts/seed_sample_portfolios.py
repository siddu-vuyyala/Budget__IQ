"""
Seed existing users' portfolios with the sample portfolio where their portfolio is empty.
Run this from the `backend` folder:

    python scripts/seed_sample_portfolios.py

It will update either the JSON fallback (`data_store.json`) or Postgres `portfolio_data` rows depending on `DATABASE_URL`.
"""
import sys, os
# Ensure the parent `backend` directory is on sys.path so we can import `database`
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from database import USE_JSON_FALLBACK, JSON_DATA_FILE, SAMPLE_PORTFOLIO, get_db_connection
import json
import os

if SAMPLE_PORTFOLIO is None:
    print('No SAMPLE_PORTFOLIO found; aborting.')
    exit(1)

def is_meaningful(pd):
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
    print('Using JSON fallback; updating', JSON_DATA_FILE)
    with open(JSON_DATA_FILE, 'r+', encoding='utf-8') as f:
        data = json.load(f)
        pd_store = data.get('portfolio_data', {})
        updated = 0
        for user_id, pd in list(pd_store.items()):
            if not is_meaningful(pd):
                pd_store[user_id] = json.loads(json.dumps(SAMPLE_PORTFOLIO))
                updated += 1
        data['portfolio_data'] = pd_store
        f.seek(0)
        json.dump(data, f, indent=2)
        f.truncate()
    print('Updated', updated, 'user portfolios in JSON store.')
else:
    print('Using Postgres; updating portfolio_data rows')
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT user_id FROM portfolio_data
            WHERE (monthly_data IS NULL OR monthly_data = '[]'::jsonb OR monthly_data = '{}'::jsonb)
              AND (asset_allocation IS NULL OR asset_allocation = '[]'::jsonb OR asset_allocation = '{}'::jsonb)
              AND (income_streams IS NULL OR income_streams = '[]'::jsonb OR income_streams = '{}'::jsonb)
              AND (expense_categories IS NULL OR expense_categories = '[]'::jsonb OR expense_categories = '{}'::jsonb)
              AND (investment_goals IS NULL OR investment_goals = '[]'::jsonb OR investment_goals = '{}'::jsonb)
              AND (liabilities IS NULL OR liabilities = '[]'::jsonb OR liabilities = '{}'::jsonb)
        """)
        rows = cursor.fetchall()
        updated = 0
        for (user_id,) in rows:
            cursor.execute(
                '''UPDATE portfolio_data SET portfolio=%s, monthly_data=%s, asset_allocation=%s, income_streams=%s,
                   expense_categories=%s, investment_goals=%s, liabilities=%s, last_updated = CURRENT_TIMESTAMP WHERE user_id=%s''',
                (
                    json.dumps(SAMPLE_PORTFOLIO.get('portfolio', {})),
                    json.dumps(SAMPLE_PORTFOLIO.get('monthlyData', [])),
                    json.dumps(SAMPLE_PORTFOLIO.get('assetAllocation', [])),
                    json.dumps(SAMPLE_PORTFOLIO.get('incomeStreams', [])),
                    json.dumps(SAMPLE_PORTFOLIO.get('expenseCategories', [])),
                    json.dumps(SAMPLE_PORTFOLIO.get('investmentGoals', [])),
                    json.dumps(SAMPLE_PORTFOLIO.get('liabilities', [])),
                    user_id
                )
            )
            updated += 1
        conn.commit()
        print('Updated', updated, 'rows in portfolio_data')
    except Exception as e:
        print('Error during migration:', e)
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
