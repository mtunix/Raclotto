"""
Legacy raclotto_api module - kept for backward compatibility.
New code should use back.src.api.base_api instead.
"""

# Re-export ApiError and ApiErrorCode from base_api for backward compatibility
from back.src.api.base_api import ApiError, ApiErrorCode

__all__ = ['ApiError', 'ApiErrorCode']
