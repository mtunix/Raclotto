import io
import os
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from back.src import backup, main
from back.src.backup import BackupError, back_up, database_path
from back.src.driver.database import db
from back.test.integration.test_server import ServerTest


def _make_database(path: Path) -> None:
    with closing(sqlite3.connect(path)) as connection:
        connection.execute("CREATE TABLE pan (id INTEGER PRIMARY KEY, name TEXT)")
        connection.execute("INSERT INTO pan (name) VALUES ('Käse Knauserer')")
        connection.commit()


def _pans(path: Path) -> list:
    with closing(sqlite3.connect(path)) as connection:
        return connection.execute("SELECT id, name FROM pan").fetchall()


class BackUpTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.dir = Path(directory.name)
        self.database = self.dir / "raclotto.db"
        _make_database(self.database)
        self.environ = {"RACLOTTO_DATABASE_URL": f"sqlite:///{self.database}"}

    def test_copies_the_database_to_the_destination(self):
        destination = self.dir / "backups" / "copy.db"

        self.assertEqual(backup.main([str(destination)], self.environ, stdout=io.BytesIO()), 0)

        self.assertEqual(_pans(destination), [(1, "Käse Knauserer")])

    def test_dash_writes_the_copy_to_stdout(self):
        destination = self.dir / "streamed.db"

        with destination.open("wb") as stdout:
            self.assertEqual(backup.main(["-"], self.environ, stdout=stdout), 0)

        self.assertEqual(_pans(destination), [(1, "Käse Knauserer")])

    def test_never_overwrites_an_existing_file(self):
        destination = self.dir / "copy.db"
        destination.write_bytes(b"keep me")

        with self.assertRaises(BackupError):
            back_up(self.database, destination)

        self.assertEqual(destination.read_bytes(), b"keep me")

    def test_a_missing_database_is_an_error_not_an_empty_copy(self):
        destination = self.dir / "copy.db"

        with self.assertRaises(BackupError):
            back_up(self.dir / "missing.db", destination)

        self.assertFalse((self.dir / "missing.db").exists())
        self.assertFalse(destination.exists())

    def test_only_sqlite_files_can_be_backed_up(self):
        for url in ("sqlite://", "postgresql://raclotto@localhost/raclotto"):
            with self.subTest(url=url), self.assertRaises(BackupError):
                database_path({"RACLOTTO_DATABASE_URL": url})


class DatabasePathTest(ServerTest):
    def test_finds_the_file_the_server_opens_by_default(self):
        working_directory = Path(os.getcwd())
        self.addCleanup(os.chdir, working_directory)
        os.chdir(self.database.parent)
        environ = {"RACLOTTO_DATABASE_URL": ""}

        app = self.build(main.create_app, **environ)

        with app.app_context():
            served = Path(db.engine.url.database or "")
        self.assertEqual(database_path(environ).resolve(), served.resolve())
        self.assertEqual(served.resolve(), (self.database.parent / "instance" / "raclotto.db").resolve())


if __name__ == "__main__":
    unittest.main()
