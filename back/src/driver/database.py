"""The app's SQLAlchemy object; a SQLite file gets the connection settings concurrent requests need (ADR 0007).

Every connection to a file runs in WAL mode, waits up to `BUSY_TIMEOUT_SECONDS` for a lock, and
begins each transaction with `BEGIN IMMEDIATE`: it takes the write lock up front, so a transaction
that reads and then writes can't fail when another one wrote in between. Readers outside the app
(the backup) never wait. The cost: a transaction holds the lock from its first query to its commit,
so nothing slow (a network call) may run inside one. In-memory databases keep the driver's
defaults; the tests share one connection between sessions, which explicit BEGINs would refuse.
"""

import sqlite3
from typing import Any

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Connection, Engine, event
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase

BUSY_TIMEOUT_SECONDS = 30


class Base(DeclarativeBase):
    """Base of every model; `db.Model` shares its metadata and registry.

    Models subclass `Base`, not `db.Model`: a type checker can't see through the attribute, and
    `db.Model` only adds `Model.query` and a `__repr__`, neither of which the app uses.
    """


def is_sqlite_file(url: URL) -> bool:
    return url.get_backend_name() == "sqlite" and url.database not in (None, "", ":memory:")


def configure_sqlite_file(engine: Engine) -> None:
    event.listen(engine, "connect", _on_connect)
    event.listen(engine, "begin", _on_begin)


def _on_connect(connection: sqlite3.Connection, _: object) -> None:
    # SQLAlchemy's recipe for SQLite transactions: the driver emits no BEGIN of its own, `_on_begin` does.
    connection.isolation_level = None
    connection.execute(f"PRAGMA busy_timeout = {BUSY_TIMEOUT_SECONDS * 1000}")
    connection.execute("PRAGMA journal_mode = WAL")
    # Durable at each checkpoint rather than each commit; WAL keeps the file consistent either way.
    connection.execute("PRAGMA synchronous = NORMAL")


def _on_begin(connection: Connection) -> None:
    connection.exec_driver_sql("BEGIN IMMEDIATE")


class _SQLAlchemy(SQLAlchemy):
    def _make_engine(self, bind_key: str | None, options: dict[str, Any], app: Flask) -> Engine:
        engine = super()._make_engine(bind_key, options, app)
        if is_sqlite_file(engine.url):
            configure_sqlite_file(engine)
        return engine


db = _SQLAlchemy(model_class=Base)


def commit_before_slow_work() -> None:
    """Commit the request's transaction early, so slow work (a network call) runs without the write lock.

    The one exception to the endpoint committing at the end; it commits whatever is written after this.
    """
    db.session.commit()
