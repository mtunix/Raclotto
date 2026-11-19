import tempfile
import unittest
from pathlib import Path

from flask.globals import app_ctx

from back.src.driver.app import App
from back.src.driver.database import db
from back.test.support import ConfigTest

INDEX = '<div id="root"></div>'


class FrontendTest(unittest.TestCase):
    """The backend serves the frontend build; the browser router owns every path that isn't a file."""

    directory: tempfile.TemporaryDirectory[str]
    app: App

    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        build = Path(cls.directory.name)
        (build / "index.html").write_text(INDEX)
        (build / "robots.txt").write_text("User-agent: *")
        (build / "static" / "js").mkdir(parents=True)
        (build / "static" / "js" / "main.1a2b.js").write_text("console.log(1)")
        cls.app = App("raclotto-frontend-test", db, ConfigTest, frontend_folder=build)
        # App() leaves its startup context pushed; the requests below bring their own.
        app_ctx.pop()

    @classmethod
    def tearDownClass(cls):
        with cls.app.app_context():
            db.engine.dispose()
        cls.directory.cleanup()

    def get(self, path: str):
        response = self.app.test_client().get(path)
        self.addCleanup(response.close)
        return response

    def test_files_of_the_build_are_served(self):
        for path, body in (("/robots.txt", "User-agent: *"), ("/static/js/main.1a2b.js", "console.log(1)")):
            with self.subTest(path=path):
                response = self.get(path)
                self.assertEqual((response.status_code, response.text), (200, body))

    def test_app_routes_get_the_index_so_reloads_and_invite_links_work(self):
        for path in ("/", "/login", "/register?token=abc", "/0b6f1c9e-3c1d-4f7a-9a51-2f1f0e1d7c11/history"):
            with self.subTest(path=path):
                response = self.get(path)
                self.assertEqual((response.status_code, response.text), (200, INDEX))

    def test_a_missing_asset_is_a_404_not_the_index(self):
        response = self.get("/static/js/main.old.js")

        self.assertEqual(response.status_code, 404)

    def test_unknown_api_paths_stay_json_404s(self):
        for path in ("/api", "/api/no-such-endpoint"):
            with self.subTest(path=path):
                response = self.get(path)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json["errors"][0]["code"], "api_error_code.endpoint_not_found")

    def test_paths_outside_the_build_are_not_served(self):
        response = self.get("/../../etc/passwd")

        self.assertNotIn("root:", response.text)


if __name__ == "__main__":
    unittest.main()
