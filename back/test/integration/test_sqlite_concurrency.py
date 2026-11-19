import http.client
import json
import sqlite3
import threading
import time
from contextlib import closing

from flask.globals import app_ctx
from waitress.server import BaseWSGIServer, create_server

from back.src import main
from back.src.auth.jwt import generate_token
from back.src.driver.app import App
from back.src.driver.database import BUSY_TIMEOUT_SECONDS, db
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.repository.level_repository import LevelRepository
from back.test.integration.test_server import SECRET, ServerTest


class SqliteConcurrencyTest(ServerTest):
    """The production app on a database file, written to by several threads at once."""

    def seed(self, app: App, users: int) -> list[int]:
        with app.app_context():
            session = RaclottoSession(key="s1", name="s1")
            db.session.add(session)
            db.session.flush()
            for kind in (IngredientType.FILL, IngredientType.SAUCE):
                for i in range(4):
                    db.session.add(Ingredient(name=f"{kind.name} {i}", type=kind, session_id=session.id, vegan=True))
            level = LevelRepository().by_experience(0)
            assert level is not None
            added = [User(name=f"guest{i}", password="x", experience_points=0, level_id=level.id) for i in range(users)]
            db.session.add_all(added)
            db.session.commit()
            return [user.id for user in added]

    def test_a_file_database_runs_in_wal_mode_and_waits_for_locks(self):
        app = self.build()
        names = ("journal_mode", "busy_timeout", "synchronous")

        with app.app_context(), db.engine.connect() as connection:
            pragmas = [connection.exec_driver_sql(f"PRAGMA {name}").scalar() for name in names]

        # synchronous 1 is NORMAL.
        self.assertEqual(pragmas, ["wal", BUSY_TIMEOUT_SECONDS * 1000, 1])

    def test_startup_leaves_the_database_unlocked(self):
        app = main.create_app(self.environ)
        self.addCleanup(self.dispose, app)
        # As in production, the startup context stays pushed while the server runs.
        self.addCleanup(app_ctx.pop)

        with closing(sqlite3.connect(self.database, timeout=0, isolation_level=None)) as other:
            other.execute("BEGIN IMMEDIATE")
            other.execute("ROLLBACK")

    def test_a_roll_commits_while_a_reader_holds_a_snapshot(self):
        app = self.build()
        [user_id] = self.seed(app, 1)
        token = generate_token(user_id, SECRET)

        # A long read, like the backup's, from outside the app.
        with closing(sqlite3.connect(self.database, isolation_level=None)) as reader:
            reader.execute("BEGIN")
            reader.execute("SELECT count(*) FROM pan").fetchone()
            response = app.test_client().post(
                "/api/pans/generate?session_key=s1",
                json={},
                headers={"Accept": "application/json", "Authorization": f"Bearer {token}"},
            )
            reader.execute("ROLLBACK")

        self.assertEqual(response.status_code, 200, response.json)

    def test_a_transaction_reads_what_another_committed_before_it_writes(self):
        app = self.build()
        [user_id] = self.seed(app, 1)
        first_read = threading.Event()
        failures: list[BaseException] = []

        def award(xp: int, pause: float) -> None:
            try:
                with app.app_context():
                    user = db.session.get(User, user_id)
                    assert user is not None
                    first_read.set()
                    time.sleep(pause)
                    user.experience_points += xp
                    db.session.commit()
            except BaseException as error:
                failures.append(error)

        slow = threading.Thread(target=award, args=(10, 0.2))
        slow.start()
        first_read.wait()
        award(5, 0)
        slow.join()

        self.assertEqual(failures, [])
        with app.app_context():
            user = db.session.get(User, user_id)
            assert user is not None
            self.assertEqual(user.experience_points, 15)

    def test_guests_rolling_and_rating_at_once_all_succeed(self):
        app = self.build()
        user_ids = self.seed(app, 6)
        server = create_server(app, host="127.0.0.1", port=0, threads=6)
        assert isinstance(server, BaseWSGIServer)
        port = int(server.getsockname()[1])
        threading.Thread(target=server.run, daemon=True).start()
        self.addCleanup(server.close)
        start = threading.Barrier(len(user_ids))
        statuses: list[int] = []

        def guest(user_id: int) -> None:
            connection = http.client.HTTPConnection("127.0.0.1", port, timeout=60)
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {generate_token(user_id, SECRET)}",
            }

            def call(method: str, path: str, body: dict | None = None) -> dict:
                connection.request(method, "/api" + path, json.dumps(body) if body is not None else None, headers)
                response = connection.getresponse()
                payload = response.read()
                statuses.append(response.status)
                return json.loads(payload) if response.status == 200 else {}

            start.wait()
            for _ in range(3):
                outcome = call("POST", "/pans/generate?session_key=s1", {})
                if outcome:
                    call("POST", "/ratings", {"pan_id": outcome["pan"]["id"], "rating": 4})
                call("GET", "/pans?session_key=s1")
            connection.close()

        guests = [threading.Thread(target=guest, args=(user_id,)) for user_id in user_ids]
        for thread in guests:
            thread.start()
        for thread in guests:
            thread.join()

        self.assertEqual(statuses, [200] * len(user_ids) * 9)
        with app.app_context():
            self.assertEqual(db.session.query(Pan).count(), len(user_ids) * 3)
