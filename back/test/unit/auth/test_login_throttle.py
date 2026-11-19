import unittest
from datetime import datetime, timedelta

from back.src.auth.throttle import LoginThrottle


class LoginThrottleTest(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 19, 20, 0)
        self.throttle = LoginThrottle(max_failures=3, window=timedelta(minutes=15), clock=lambda: self.now)

    def fail_times(self, times: int, key: str = "ip|ana") -> None:
        for _ in range(times):
            self.throttle.failed(key)
            self.now += timedelta(minutes=1)

    def test_attempts_count_until_the_limit(self):
        self.fail_times(2)
        self.assertIsNone(self.throttle.retry_after("ip|ana"))

        self.fail_times(1)
        # The first failure, at 20:00, leaves the window at 20:15.
        self.assertEqual(self.throttle.retry_after("ip|ana"), timedelta(minutes=12))

    def test_failures_older_than_the_window_are_forgotten(self):
        self.fail_times(3)
        self.now += timedelta(minutes=13)

        self.assertIsNone(self.throttle.retry_after("ip|ana"))

    def test_keys_are_counted_apart(self):
        self.fail_times(3)

        self.assertIsNone(self.throttle.retry_after("ip|ben"))

    def test_many_keys_drop_their_expired_failures(self):
        throttle = LoginThrottle(max_failures=3, window=timedelta(minutes=15), clock=lambda: self.now, sweep_above=2)
        for key in ("a", "b", "c"):
            throttle.failed(key)
        self.now += timedelta(minutes=16)

        throttle.failed("d")

        self.assertEqual(throttle.tracked(), 1)

    def test_success_forgets_the_failures(self):
        self.fail_times(3)
        self.throttle.succeeded("ip|ana")

        self.assertIsNone(self.throttle.retry_after("ip|ana"))


if __name__ == "__main__":
    unittest.main()
