from collections.abc import Iterator
from contextlib import contextmanager

from back.src.api.base_api import ApiError, ApiErrorCode
from back.src.auth.middleware import get_current_user
from back.src.interactor.permissions import Forbidden, Permissions


def permissions() -> Permissions:
    """The signed-in user's permissions; only behind `@require_auth`."""
    return Permissions(get_current_user())


@contextmanager
def guarded() -> Iterator[None]:
    """A `Forbidden` raised inside becomes a 403; declare 403 in the endpoint's `errors=`."""
    try:
        yield
    except Forbidden as error:
        raise ApiError(ApiErrorCode.forbidden, status=403, title="Forbidden", detail=str(error)) from error
