"""Login throttle: after too many failed sign-ins for one account from one address, refuse more for a while.

Invite tokens share it: wrong tokens count per address alone (``invite|<address>``).

    throttle = LoginThrottle()
    throttle.retry_after(key)   # None, or how long until the next attempt counts
    throttle.failed(key)        # after a wrong password
    throttle.succeeded(key)     # after a right one: the failures are forgotten

The failures live in memory, which fits the single waitress process; a restart forgets them.
"""

from collections.abc import Callable
from datetime import datetime, timedelta
from threading import Lock

from flask import current_app

MAX_FAILURES = 5
WINDOW = timedelta(minutes=15)
# Past this many keys, a failure first drops the keys whose failures are all outside the window.
SWEEP_ABOVE = 10_000


class LoginThrottle:
    def __init__(
        self,
        max_failures: int = MAX_FAILURES,
        window: timedelta = WINDOW,
        clock: Callable[[], datetime] = datetime.now,
        sweep_above: int = SWEEP_ABOVE,
    ):
        self._max_failures = max_failures
        self._sweep_above = sweep_above
        self._window = window
        self._clock = clock
        self._failures: dict[str, list[datetime]] = {}
        self._lock = Lock()

    def retry_after(self, key: str) -> timedelta | None:
        with self._lock:
            recent = self._recent(key)
            if len(recent) < self._max_failures:
                return None
            return recent[0] + self._window - self._clock()

    def failed(self, key: str) -> None:
        with self._lock:
            if len(self._failures) > self._sweep_above:
                for stale in list(self._failures):
                    self._recent(stale)
            self._failures[key] = [*self._recent(key), self._clock()]

    def tracked(self) -> int:
        """How many keys have failures on record."""
        return len(self._failures)

    def succeeded(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)

    def _recent(self, key: str) -> list[datetime]:
        since = self._clock() - self._window
        recent = [at for at in self._failures.get(key, []) if at > since]
        if recent:
            self._failures[key] = recent
        else:
            self._failures.pop(key, None)
        return recent


def login_throttle() -> LoginThrottle:
    """The current app's throttle, made on first use."""
    throttle: LoginThrottle = current_app.extensions.setdefault("login_throttle", LoginThrottle())
    return throttle
