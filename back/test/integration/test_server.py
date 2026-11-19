import inspect
import io
import logging
import secrets
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from typing import Any, Callable, Dict, List

import waitress
from waitress.adjustments import Adjustments
from flask.globals import app_ctx

from back.src import dev, main
from back.src.auth.jwt import decode_token, generate_token
from back.src.driver.app import App
from back.src.driver.config import (
    DEV_JWT_SECRET,
    KNOWN_JWT_SECRETS,
    ConfigInMemory,
    ConfigurationError,
    RaclottoConfig,
    production_config,
)
from back.src.driver.database import db
from back.src.entity.user import User
from back.src.repository.level_repository import LevelRepository
from back.src.repository.user_repository import UserRepository

SECRET = secrets.token_urlsafe(48)


class ServerTest(unittest.TestCase):
    """Builds the real app on a SQLite file that outlives a single app, as a restart would see it."""

    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.database = Path(directory.name) / "raclotto.db"
        self.log_file = Path(directory.name) / "raclotto-api.log"
        self.environ = {
            "RACLOTTO_JWT_SECRET": SECRET,
            "RACLOTTO_DATABASE_URL": f"sqlite:///{self.database}",
            "RACLOTTO_LOG_FILE": str(self.log_file),
        }

    def build(self, create: Callable[[Dict[str, str]], App] = main.create_app, **environ: str) -> App:
        app = create({**self.environ, **environ})
        # App() leaves its startup context pushed; later tests must not run inside it.
        app_ctx.pop()
        self.addCleanup(self.dispose, app)
        return app

    @staticmethod
    def dispose(app: App) -> None:
        with app.app_context():
            db.engine.dispose()
        for handler in list(app.logger.handlers):
            app.logger.removeHandler(handler)
            handler.close()

    def admin(self, app: App) -> User | None:
        with app.app_context():
            return UserRepository().by_name("admin")

    def login(self, app: App, password: str):
        return app.test_client().post(
            "/api/auth/login",
            json={"name_or_email": "admin", "password": password},
            headers={"Accept": "application/json"},
        )

    @staticmethod
    def log_files(app: App) -> List[Path]:
        return [Path(h.baseFilename) for h in app.logger.handlers if isinstance(h, logging.FileHandler)]

    def me(self, app: App, token: str):
        return app.test_client().get(
            "/api/auth/me", headers={"Accept": "application/json", "Authorization": f"Bearer {token}"}
        )


class TestJwtSecret(ServerTest):
    def assertRefused(self, environ: Dict[str, str], message: str) -> None:
        with self.assertRaises(ConfigurationError) as raised:
            main.create_app(environ)
        self.assertIn(message, str(raised.exception))

    def test_startup_fails_without_a_secret(self):
        for environ in ({}, {"RACLOTTO_JWT_SECRET": ""}):
            with self.subTest(environ=environ):
                self.assertRefused(environ, "RACLOTTO_JWT_SECRET is not set")

    def test_startup_fails_with_a_short_secret(self):
        self.assertRefused({"RACLOTTO_JWT_SECRET": "x" * 31}, "at least 32 bytes")

    def test_startup_fails_with_a_secret_that_has_been_in_source(self):
        for secret in KNOWN_JWT_SECRETS:
            with self.subTest(secret=secret):
                self.assertRefused({"RACLOTTO_JWT_SECRET": secret}, "placeholder")

    def test_tokens_are_signed_with_the_configured_secret(self):
        app = self.build(RACLOTTO_ADMIN_PASSWORD="first-boot")

        token = self.login(app, "first-boot").json["token"]
        admin = self.admin(app)
        assert admin is not None

        self.assertEqual((decode_token(token, SECRET) or {}).get("user_id"), admin.id)
        self.assertEqual(self.me(app, token).status_code, 200)
        forged = generate_token(admin.id, DEV_JWT_SECRET)
        self.assertEqual(self.me(app, forged).status_code, 401)


class TestProductionConfig(ServerTest):
    def test_production_is_not_in_debug_mode(self):
        self.assertFalse(self.build().debug)

    def test_debug_comes_only_from_the_config(self):
        class NoDebugSetting(RaclottoConfig):
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{self.database}"

        self.assertFalse(self.build(lambda _: App("raclotto-test-nodebug", db, NoDebugSetting)).debug)

    def test_serving_the_frontend_writes_nothing_to_stdout(self):
        app = self.build()

        with redirect_stdout(io.StringIO()) as stdout:
            app.test_client().get("/")

        self.assertEqual(stdout.getvalue(), "")

    def test_the_database_url_comes_from_the_environment(self):
        self.build()

        self.assertTrue(self.database.exists())

    def test_without_a_database_url_the_instance_database_is_used(self):
        config = production_config({"RACLOTTO_JWT_SECRET": SECRET})

        self.assertEqual(config.SQLALCHEMY_DATABASE_URI, "sqlite:///raclotto.db")

    def test_empty_optional_variables_fall_back_to_the_defaults(self):
        empty = dict.fromkeys(
            ("RACLOTTO_DATABASE_URL", "RACLOTTO_ADMIN_PASSWORD", "RACLOTTO_HOST", "RACLOTTO_PORT", "RACLOTTO_LOG_FILE"),
            "",
        )

        config = production_config({"RACLOTTO_JWT_SECRET": SECRET, **empty})

        self.assertEqual(
            (config.SQLALCHEMY_DATABASE_URI, config.ADMIN_PASSWORD, config.HOST, config.PORT, config.LOG_FILE),
            ("sqlite:///raclotto.db", None, "127.0.0.1", 8081, "raclotto-api.log"),
        )

    def test_an_invalid_port_is_refused(self):
        for port in ("http", "0", "65536"):
            with self.subTest(port=port):
                with self.assertRaises(ConfigurationError) as raised:
                    production_config({"RACLOTTO_JWT_SECRET": SECRET, "RACLOTTO_PORT": port})
                self.assertIn("RACLOTTO_PORT", str(raised.exception))


class TestLogFile(ServerTest):
    def test_production_logs_to_the_instance_folder_by_default(self):
        app = self.build(RACLOTTO_LOG_FILE="")

        self.assertEqual(self.log_files(app), [Path(app.instance_path) / "raclotto-api.log"])

    def test_the_dev_server_logs_to_the_instance_folder_by_default(self):
        app = self.build(dev.create_app, RACLOTTO_LOG_FILE="")

        self.assertEqual(self.log_files(app), [Path(app.instance_path) / "raclotto-api.log"])

    def test_a_relative_log_file_is_under_the_instance_folder(self):
        app = self.build(RACLOTTO_LOG_FILE="logs/api.log")

        self.assertEqual(self.log_files(app), [Path(app.instance_path) / "logs/api.log"])

    def test_failed_requests_are_logged_to_the_file_from_the_environment(self):
        app = self.build()

        app.test_client().get("/api/no-such-endpoint", headers={"Accept": "application/json"})

        self.assertIn("endpoint_not_found", self.log_file.read_text())

    def test_the_log_file_is_created_with_its_folder_on_the_first_record(self):
        log_file = self.log_file.parent / "logs" / "api.log"
        app = self.build(RACLOTTO_LOG_FILE=str(log_file))
        self.assertFalse(log_file.parent.exists())

        app.test_client().get("/api/no-such-endpoint", headers={"Accept": "application/json"})

        self.assertTrue(log_file.exists())

    def test_test_and_in_memory_configs_write_no_log_file(self):
        class Bare(RaclottoConfig):
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{self.database}"

        for config in (ConfigInMemory, Bare):
            with self.subTest(config=config.__name__):
                app = self.build(lambda _: App(f"raclotto-test-{config.__name__}", db, config))

                self.assertEqual(self.log_files(app), [])


class TestAdminBootstrap(ServerTest):
    def test_the_admin_is_created_with_the_password_from_the_environment(self):
        app = self.build(RACLOTTO_ADMIN_PASSWORD="first-boot")

        self.assertEqual(self.login(app, "first-boot").status_code, 200)
        admin = self.admin(app)
        assert admin is not None
        self.assertEqual(admin.email, "admin@raclotto.local")

    def test_the_admin_starts_at_the_lowest_level(self):
        app = self.build(RACLOTTO_ADMIN_PASSWORD="first-boot")

        with app.app_context():
            admin = UserRepository().by_name("admin")
            assert admin is not None
            self.assertEqual(admin.level_id, LevelRepository().all_ordered()[0].id)

    def test_without_a_password_no_admin_is_created(self):
        with self.assertLogs(level="WARNING") as logs:
            app = self.build()

        self.assertIsNone(self.admin(app))
        self.assertTrue(any("RACLOTTO_ADMIN_PASSWORD" in line for line in logs.output), logs.output)

    def test_an_existing_admin_keeps_their_password(self):
        self.build(RACLOTTO_ADMIN_PASSWORD="first-boot")

        app = self.build(RACLOTTO_ADMIN_PASSWORD="second-boot")

        self.assertEqual(self.login(app, "first-boot").status_code, 200)
        self.assertEqual(self.login(app, "second-boot").status_code, 401)


class TestServe(ServerTest):
    def serve(self, module, **environ: str) -> List[Dict[str, Any]]:
        app = self.build(module.create_app, **environ)
        calls = []
        module.serve(app, serve_with=lambda *args, **kwargs: calls.append((args, kwargs)))
        self.assertEqual([args for args, _ in calls], [(app,)])
        return [kwargs for _, kwargs in calls]

    def test_production_serves_on_loopback_port_8081_by_default(self):
        self.assertEqual(self.serve(main), [{"host": "127.0.0.1", "port": 8081}])

    def test_production_serves_on_the_host_and_port_from_the_environment(self):
        served = self.serve(main, RACLOTTO_HOST="0.0.0.0", RACLOTTO_PORT="9000")

        self.assertEqual(served, [{"host": "0.0.0.0", "port": 9000}])

    def test_production_believes_forwarded_headers_only_from_the_configured_proxy(self):
        [served] = self.serve(main, RACLOTTO_TRUSTED_PROXY="*")

        self.assertEqual(served["trusted_proxy"], "*")
        self.assertEqual(served["trusted_proxy_headers"], {"x-forwarded-for", "x-forwarded-host", "x-forwarded-proto"})
        Adjustments(**served)  # waitress rejects proxy settings it can't apply

    def test_production_logs_waitress_at_info_so_serving_on_is_shown(self):
        waitress_logger = logging.getLogger("waitress")
        self.addCleanup(waitress_logger.setLevel, waitress_logger.level)
        waitress_logger.setLevel(logging.NOTSET)

        self.serve(main)

        self.assertEqual(waitress_logger.getEffectiveLevel(), logging.INFO)

    def test_production_serves_with_waitress(self):
        self.assertIs(inspect.signature(main.serve).parameters["serve_with"].default, waitress.serve)

    def test_the_dev_server_stays_on_loopback_and_debugs_without_a_secret(self):
        app = self.build(dev.create_app, RACLOTTO_JWT_SECRET="", RACLOTTO_HOST="0.0.0.0", RACLOTTO_PORT="9000")
        calls = []

        dev.serve(app, serve_with=lambda *args, **kwargs: calls.append(kwargs))

        self.assertEqual(calls, [{"host": "127.0.0.1", "port": 9000}])
        self.assertTrue(app.debug)
        self.assertEqual(app.config["JWT_SECRET_KEY"], DEV_JWT_SECRET)
