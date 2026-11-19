import tempfile
import unittest
from pathlib import Path

from alembic.config import Config as AlembicConfig
from alembic.script import ScriptDirectory
from flask import Flask
from sqlalchemy import create_engine, text

import back.src.entity  # noqa: F401  registers every model on the metadata
from back.src.driver.database import db
from back.src.driver.migrations import SCRIPT_LOCATION, SchemaDriftError, migrate


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


if __name__ == "__main__":
    unittest.main()
