"""Copy the SQLite database while the server runs: `python -m back.src.backup DEST`, or `-` for stdout.

Reads the database URL like the servers do (environment, then `.env`). The copy is taken through
SQLite's backup API, so it is consistent even mid-write, unlike copying the file.
"""

import os
import shutil
import sqlite3
import sys
import tempfile
from collections.abc import Mapping, Sequence
from contextlib import closing
from pathlib import Path
from typing import BinaryIO

from dotenv import load_dotenv
from sqlalchemy.engine import make_url

from back.src.driver.config import database_url

# The servers' instance folder: Flask puts it under the working directory.
INSTANCE_FOLDER = Path("instance")


class BackupError(RuntimeError):
    """The backup can't be taken; nothing was written."""


def database_path(environ: Mapping[str, str]) -> Path:
    url = make_url(database_url(environ))
    if url.get_backend_name() != "sqlite" or url.database in (None, "", ":memory:"):
        raise BackupError(f"Only a SQLite database file can be backed up, not {url.render_as_string()}")
    assert url.database is not None
    path = Path(url.database)
    return path if path.is_absolute() else INSTANCE_FOLDER / path


def back_up(source: Path, destination: Path) -> None:
    if not source.is_file():
        raise BackupError(f"There is no database at {source}")
    if destination.exists():
        raise BackupError(f"{destination} already exists")
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        # Read-only, so a mistyped URL can't create an empty database instead.
        with (
            closing(sqlite3.connect(f"{source.resolve().as_uri()}?mode=ro", uri=True)) as live,
            closing(sqlite3.connect(destination)) as copy,
        ):
            live.backup(copy)
    except BaseException:
        destination.unlink(missing_ok=True)
        raise


def main(argv: Sequence[str], environ: Mapping[str, str], stdout: BinaryIO) -> int:
    if len(argv) != 1:
        print("usage: python -m back.src.backup DEST   (DEST - writes to stdout)", file=sys.stderr)
        return 2
    try:
        source = database_path(environ)
        if argv[0] != "-":
            back_up(source, Path(argv[0]))
            return 0
        if stdout.isatty():
            raise BackupError("Refusing to write a database to a terminal; redirect stdout to a file")
        with tempfile.TemporaryDirectory() as directory:
            copy = Path(directory) / "raclotto.db"
            back_up(source, copy)
            with copy.open("rb") as file:
                shutil.copyfileobj(file, stdout)
            stdout.flush()
        return 0
    except (BackupError, sqlite3.Error) as error:
        print(f"Backup failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    load_dotenv()
    sys.exit(main(sys.argv[1:], os.environ, sys.stdout.buffer))
