import unittest

from back.test.support import AppTest


class HealthTest(AppTest):
    def test_answers_ok_without_signing_in(self):
        response = self.call("GET", "/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {"status": "ok"})


if __name__ == "__main__":
    unittest.main()
