from datetime import UTC, datetime, timedelta
from typing import Any

import jwt


def generate_token(user_id: int, secret_key: str, version: int = 0, expiration_days: int = 7) -> str:
    """Generate a JWT token for a user; ``version`` is the user's token version when it was issued."""
    now = datetime.now(UTC)
    payload = {"user_id": user_id, "ver": version, "exp": now + timedelta(days=expiration_days), "iat": now}
    return jwt.encode(payload, secret_key, algorithm="HS256")


def decode_token(token: str, secret_key: str) -> dict[str, Any] | None:
    """Decode a JWT token and return the payload."""
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
