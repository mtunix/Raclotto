from functools import wraps
from flask import request, g
from back.src.auth.jwt import decode_token
from back.src.api.base_api import ApiError, ApiErrorCode
from back.src.entity.user import User
from back.src.repository.user_repository import UserRepository
from back.src.driver.database import db


def get_current_user():
    """Get the current authenticated user from the request context."""
    return getattr(g, 'current_user', None)


def get_optional_user():
    """
    Optionally get the current user from the token if present.
    Does not raise an error if no token is provided (unlike require_auth).
    Returns None if no token or invalid token.
    """
    # First check if user is already in context (from require_auth)
    user = getattr(g, 'current_user', None)
    if user:
        return user
    
    # Try to get user from token if present
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    # Extract token from "Bearer <token>" format
    try:
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
    except (IndexError, AttributeError):
        return None
    
    # Get secret key from app config
    from flask import current_app
    secret_key = current_app.config.get('JWT_SECRET_KEY')
    if not secret_key:
        return None
    
    # Decode and verify token
    payload = decode_token(token, secret_key)
    if not payload:
        return None
    
    # Get user from database
    user_id = payload.get('user_id')
    if not user_id:
        return None
    
    user_repository = UserRepository()
    user = user_repository.by_id(user_id)
    return user


def require_auth(func):
    """Decorator to require authentication for an endpoint."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=401,
                title="Authentication required",
                detail="Missing Authorization header"
            )

        # Extract token from "Bearer <token>" format
        try:
            token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        except IndexError:
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=401,
                title="Invalid token format",
                detail="Authorization header must be in format 'Bearer <token>'"
            )

        # Get secret key from app config
        from flask import current_app
        secret_key = current_app.config.get('JWT_SECRET_KEY')
        if not secret_key:
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=500,
                title="Server configuration error",
                detail="JWT_SECRET_KEY not configured"
            )

        # Decode and verify token
        payload = decode_token(token, secret_key)
        if not payload:
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=401,
                title="Invalid or expired token",
                detail="The provided token is invalid or has expired"
            )

        # Get user from database
        user_id = payload.get('user_id')
        if not user_id:
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=401,
                title="Invalid token payload",
                detail="Token does not contain user_id"
            )

        user_repository = UserRepository()
        user = user_repository.by_id(user_id)
        if not user:
            raise ApiError(
                ApiErrorCode.invalid_token,
                status=401,
                title="User not found",
                detail="User associated with token no longer exists"
            )

        # Store user in request context
        g.current_user = user

        return func(*args, **kwargs)

    return wrapper
