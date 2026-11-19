import sqlite3
import tempfile
import unittest
from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config as AlembicConfig
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from flask import Flask
from flask.globals import app_ctx
from sqlalchemy import create_engine, text

import back.src.entity  # noqa: F401  registers every model on the metadata
from back.src.driver.app import App
from back.src.driver.config import ConfigInMemory
from back.src.driver.database import db
from back.src.driver.migrations import SCRIPT_LOCATION, SchemaDriftError, include_object, migrate
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.model.default_data import ACHIEVEMENTS

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"


def _head() -> str:
    config = AlembicConfig()
    config.set_main_option("script_location", str(SCRIPT_LOCATION))
    head = ScriptDirectory.from_config(config).get_current_head()
    assert head is not None
    return head


class MigrateTest(unittest.TestCase):
    """Each test starts from a SQLite file shaped like a database from some point in history."""

    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.url = f"sqlite:///{Path(self.dir.name) / 'raclotto.db'}"
        self.app = Flask("migrate-test")
        self.app.config["SQLALCHEMY_DATABASE_URI"] = self.url
        db.init_app(self.app)
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        db.session.remove()
        db.engine.dispose()
        self.ctx.pop()
        self.dir.cleanup()

    def given_database(self, *statements: str) -> None:
        """The current schema without migration history, then `statements` to age it."""
        engine = create_engine(self.url)
        with engine.begin() as connection:
            db.metadata.create_all(connection)
            for statement in statements:
                connection.execute(text(statement))
        engine.dispose()

    def query(self, sql: str) -> list:
        with db.engine.connect() as connection:
            return [tuple(row) for row in connection.execute(text(sql))]

    def test_a_new_database_is_created_and_stamped_at_head(self):
        migrate(db)

        self.assertIn(("label_en",), self.query("SELECT name FROM pragma_table_info('level')"))
        self.assertEqual(self.query("SELECT version_num FROM alembic_version"), [(_head(),)])

    def test_a_database_from_before_the_labels_gets_them_filled(self):
        self.given_database(
            "ALTER TABLE level DROP COLUMN label_en",
            "ALTER TABLE level DROP COLUMN label_de",
            "INSERT INTO level (name, required_experience) VALUES ('level.kaeseKnauserer', 100)",
            "INSERT INTO level (name, required_experience) VALUES ('level.custom', 50)",
        )

        migrate(db)

        self.assertEqual(
            self.query("SELECT name, label_en, label_de FROM level ORDER BY required_experience"),
            [
                ("level.custom", "level.custom", "level.custom"),
                ("level.kaeseKnauserer", "Cheese Miser", "Käse Knauserer"),
            ],
        )
        self.assertEqual(self.query("SELECT version_num FROM alembic_version"), [(_head(),)])

    def test_migrating_again_changes_nothing(self):
        self.given_database(
            "ALTER TABLE level DROP COLUMN label_en",
            "ALTER TABLE level DROP COLUMN label_de",
            "INSERT INTO level (name, required_experience) VALUES ('level.kaeseKnauserer', 100)",
        )
        migrate(db)
        db.engine.dispose()
        before = self.query("SELECT * FROM level")

        migrate(db)

        self.assertEqual(self.query("SELECT * FROM level"), before)
        self.assertEqual(self.query("SELECT version_num FROM alembic_version"), [(_head(),)])

    def test_an_unstamped_database_that_has_the_labels_keeps_its_own(self):
        self.given_database(
            "INSERT INTO level (name, label_en, label_de, required_experience) "
            "VALUES ('level.kaeseKnauserer', 'Renamed', 'Umbenannt', 100)",
        )

        migrate(db)

        self.assertEqual(self.query("SELECT label_en, label_de FROM level"), [("Renamed", "Umbenannt")])
        self.assertEqual(self.query("SELECT version_num FROM alembic_version"), [(_head(),)])

    def test_a_database_from_before_levels_gets_the_table(self):
        self.given_database("DROP TABLE level")

        migrate(db)

        columns = {row[0] for row in self.query("SELECT name FROM pragma_table_info('level')")}
        self.assertTrue({"name", "label_en", "label_de", "required_experience"} <= columns)

    def test_a_database_from_before_admins_makes_the_seeded_admin_one(self):
        self.given_database(
            'ALTER TABLE "user" DROP COLUMN is_admin',
            'ALTER TABLE "user" DROP COLUMN token_version',
            'INSERT INTO "user" (name, password, meat, vegetarian, vegan, fish, histamine, fructose, lactose, gluten, '
            "language, experience_points) VALUES ('admin', 'x', 0, 1, 1, 0, 1, 1, 1, 1, 'de', 0), "
            "('ana', 'x', 0, 1, 1, 0, 1, 1, 1, 1, 'de', 0)",
        )

        migrate(db)

        self.assertEqual(
            self.query('SELECT name, is_admin, token_version FROM "user" ORDER BY name'),
            [("admin", 1, 0), ("ana", 0, 0)],
        )
        self.assertEqual(self.query("SELECT version_num FROM alembic_version"), [(_head(),)])

    def test_a_database_from_before_achievement_keys_gets_them_by_title_and_keeps_descriptions(self):
        self.given_database(
            "DROP INDEX ix_achievement_key",
            "ALTER TABLE achievement DROP COLUMN key",
            "ALTER TABLE achievement ADD COLUMN description VARCHAR",
            "ALTER TABLE achievement ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT 1",
            "INSERT INTO achievement (title, description, value, hidden, is_global) VALUES "
            "('First Blood!', 'Esse die erste Pfanne', 10, 0, 0), ('First blood!', 'alt', 10, 0, 0), "
            "('First Blood!', 'doppelt', 10, 0, 0), ('Vanilla', 'Eine Zutat', 10, 0, 0)",
        )

        migrate(db)

        self.assertEqual(
            self.query("SELECT title, key FROM achievement ORDER BY id"),
            [("First Blood!", "first_blood"), ("First blood!", None), ("First Blood!", None), ("Vanilla", "vanilla")],
        )
        self.assertEqual(
            self.query("SELECT description FROM achievement ORDER BY id"),
            [("Esse die erste Pfanne",), ("alt",), ("doppelt",), ("Eine Zutat",)],
        )
        self.assertEqual(self.query("SELECT version_num FROM alembic_version"), [(_head(),)])

    def test_other_missing_columns_stop_startup_with_their_names(self):
        self.given_database('ALTER TABLE "user" DROP COLUMN glow_effect')

        with self.assertRaises(SchemaDriftError) as raised:
            migrate(db)

        self.assertIn("user.glow_effect", str(raised.exception))


class RetiredColumnsTest(unittest.TestCase):
    """A database from before pan.snacked, achievement.is_global and the insult table left the models keeps them."""

    # The revision before that, and the one the deployed databases were at.
    REVISIONS = ("1e2e43eb5cf6", "3d9e6b2f4a10")

    def given_database_at(self, revision: str) -> None:
        """The schema create_all built at 3d9e6b2f4a10, with old rows, upgraded to `revision`."""
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.path = Path(directory.name) / "raclotto.db"
        with sqlite3.connect(self.path) as connection:
            connection.executescript((FIXTURES / "schema_3d9e6b2f4a10.sql").read_text())
            connection.executescript(
                """
                CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
                INSERT INTO alembic_version VALUES ('3d9e6b2f4a10');
                INSERT INTO user (id, name, password, meat, vegetarian, vegan, fish, histamine, fructose, lactose,
                    gluten, language, is_admin, token_version, experience_points)
                    VALUES (1, 'ana', 'x', 0, 1, 1, 0, 1, 1, 1, 1, 'de', 0, 0, 0);
                INSERT INTO session (id, key, name, timestamp, active) VALUES (1, 's1', 's1', '2025-12-24', 1);
                INSERT INTO pan (id, user_id, timestamp, snacked, rolled_preparation_type, rolled_cheese, name,
                    session_id) VALUES (1, 1, '2025-12-24', 1, 0, 0, 'old', 1);
                INSERT INTO achievement (title, description, value, hidden, is_global)
                    VALUES ('King of the Sauce', 'old', 1, 0, 0);
                INSERT INTO insult (title) VALUES ('Lauch');
                """
            )
        connection.close()
        engine = create_engine(f"sqlite:///{self.path}")
        with engine.begin() as migrating:
            config = AlembicConfig()
            config.set_main_option("script_location", str(SCRIPT_LOCATION))
            config.attributes["connection"] = migrating
            command.upgrade(config, revision)
        engine.dispose()

    def start(self) -> App:
        config = type("Config", (ConfigInMemory,), {"SQLALCHEMY_DATABASE_URI": f"sqlite:///{self.path}"})
        app = App("retired-columns-test", db, config)
        # App() leaves its startup context pushed; the test brings its own.
        app_ctx.pop()
        self.addCleanup(self.dispose, app)
        return app

    @staticmethod
    def dispose(app: App) -> None:
        with app.app_context():
            db.session.remove()
            db.engine.dispose()

    def query(self, sql: str) -> list:
        with sqlite3.connect(self.path) as connection:
            rows = connection.execute(sql).fetchall()
        connection.close()
        return rows

    def test_the_app_starts_seeds_achievements_and_inserts_pans_while_the_old_data_stays(self):
        for revision in self.REVISIONS:
            with self.subTest(revision=revision):
                self.given_database_at(revision)
                app = self.start()

                with app.app_context():
                    db.session.add(Pan(user_id=1, session_id=1, name="new"))
                    db.session.commit()
                    self.assertEqual(db.session.get_one(User, 1).name, "ana")
                    self.assertEqual(db.session.get_one(RaclottoSession, 1).key, "s1")

                self.assertEqual(self.query("SELECT name, snacked FROM pan ORDER BY id"), [("old", 1), ("new", 0)])
                self.assertEqual(self.query("SELECT COUNT(*) FROM achievement"), [(len(ACHIEVEMENTS),)])
                self.assertEqual(
                    self.query("SELECT DISTINCT key = 'king_of_the_sauce', is_global FROM achievement ORDER BY 1"),
                    [(0, 1), (1, 0)],
                )
                self.assertEqual(
                    self.query("SELECT description FROM achievement WHERE key = 'king_of_the_sauce'"), [("old",)]
                )
                self.assertEqual(self.query("SELECT title FROM insult"), [("Lauch",)])
                self.assertEqual(self.query("SELECT version_num FROM alembic_version"), [(_head(),)])

    def test_autogenerate_proposes_no_drop(self):
        self.given_database_at(self.REVISIONS[0])
        self.start()

        engine = create_engine(f"sqlite:///{self.path}")
        with engine.connect() as connection:
            context = MigrationContext.configure(connection, opts={"include_object": include_object})
            self.assertEqual(compare_metadata(context, db.metadata), [])
        engine.dispose()


if __name__ == "__main__":
    unittest.main()
