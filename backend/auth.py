import os
import jwt
from functools import wraps
from flask import request, jsonify
from datetime import datetime, timedelta

SECRET_KEY = os.getenv('SECRET_KEY', 'budgetiq-secret-key-change-in-production')

def create_jwt_token(user_id, email):
    """Create a JWT token for authenticated users."""
    payload = {
        'user_id': user_id,
        'email': email,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_jwt_token(token):
    """Verify a JWT token and return the payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, 'Token has expired'
    except jwt.InvalidTokenError:
        return None, 'Invalid token'

def get_user_from_token():
    """Extract user from JWT token in Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None, 'Missing or invalid Authorization header'
    
    token = auth_header[7:]  # Remove 'Bearer ' prefix
    payload, error = verify_jwt_token(token)
    
    if error:
        return None, error
    
    return {'id': payload['user_id'], 'email': payload['email']}, None

def require_auth(f):
    """Decorator to require JWT authentication."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_info, error = get_user_from_token()
        
        if error:
            return jsonify({'error': error}), 401
        
        request.user = user_info
        return f(*args, **kwargs)
    
    return decorated_function
