import jwt
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Dict
from flask import current_app


def generate_token(user_id: int, secret_key: str, expiration_days: int = 7) -> str:
    """Generate a JWT token for a user."""
    now = datetime.now(timezone.utc)
    payload = {"user_id": user_id, "exp": now + timedelta(days=expiration_days), "iat": now}
    return jwt.encode(payload, secret_key, algorithm="HS256")


def decode_token(token: str, secret_key: str) -> Optional[Dict[str, Any]]:
    """Decode a JWT token and return the payload."""
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
