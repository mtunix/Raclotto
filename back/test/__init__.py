import os
import unittest
import warnings

from sqlalchemy.exc import SAWarning


class _SAWarningsFail(unittest.TestSuite):
    def run(self, result: unittest.TestResult, debug: bool = False) -> unittest.TestResult:
        # Here rather than at import: the runner resets the warning filters before it runs the suite.
        with warnings.catch_warnings():
            warnings.simplefilter("error", SAWarning)
            return super().run(result, debug)


def load_tests(loader: unittest.TestLoader, tests: unittest.TestSuite, pattern: str | None) -> unittest.TestSuite:
    """Discovering the suite makes every SQLAlchemy warning an error, so none goes unnoticed."""
    return _SAWarningsFail([tests, loader.discover(os.path.dirname(__file__), pattern or "test*.py")])
