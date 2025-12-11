import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
from flask import current_app


def generate_token(user_id: int, secret_key: str, expiration_days: int = 7) -> str:
    """Generate a JWT token for a user."""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=expiration_days),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, secret_key, algorithm='HS256')


def verify_token(token: str, secret_key: str) -> bool:
    """Verify if a JWT token is valid."""
    try:
        jwt.decode(token, secret_key, algorithms=['HS256'])
        return True
    except jwt.ExpiredSignatureError:
        return False
    except jwt.InvalidTokenError:
        return False


def decode_token(token: str, secret_key: str) -> Optional[Dict]:
    """Decode a JWT token and return the payload."""
    try:
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
