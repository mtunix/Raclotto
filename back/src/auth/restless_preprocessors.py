from flask import request, g, current_app
from back.src.auth.jwt import decode_token
from back.src.api.base_api import ApiError, ApiErrorCode
from back.src.entity.user import User
from back.src.repository.user_repository import UserRepository
from back.src.driver.database import db


def require_auth_strict_preprocessor(**kwargs):
    """Strict preprocessor that requires authentication for all methods."""
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
    kwargs['user'] = user
    return kwargs
