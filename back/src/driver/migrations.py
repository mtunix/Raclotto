"""Brings the app's database to the models' schema at startup, through Alembic revisions."""

from pathlib import Path

from alembic import command
from alembic.config import Config as AlembicConfig
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Table, inspect
from sqlalchemy.engine import Connection
from sqlalchemy.sql.schema import SchemaItem

SCRIPT_LOCATION = Path(__file__).resolve().parents[2] / "migrations"

# Left the models but stay in the database, so reverting their removal brings their data back.
RETIRED_TABLES = frozenset({"insult"})
RETIRED_COLUMNS = frozenset(
    {("pan", "snacked"), ("achievement", "is_global"), ("achievement", "description"), ("invite_token", "email")}
)


class SchemaDriftError(RuntimeError):
    """The database lacks tables or columns the models need, even after migrating."""


class ForeignKeyViolationError(RuntimeError):
    """After migrating, rows reference rows that don't exist."""


def migrate(db: SQLAlchemy) -> None:
    """A new database is created and stamped at head; an existing one is upgraded to head.

    Foreign keys are off meanwhile: batch operations rebuild a table by dropping and renaming it,
    which enforcement would refuse or cascade. `PRAGMA foreign_key_check` after the revisions
    (``migrations/env.py``) refuses a result that violates one (ADR 0009).
    """
    with db.engine.connect() as connection:
        # Before the transaction begins: inside one, SQLite ignores the pragma.
        _set_foreign_keys(connection, False)
        try:
            with connection.begin():
                missing = _migrate(db, connection)
        finally:
            _set_foreign_keys(connection, True)
    if missing:
        raise SchemaDriftError(
            "The database is missing columns the models need; add a migration for: " + ", ".join(missing)
        )


def _migrate(db: SQLAlchemy, connection: Connection) -> list[str]:
    alembic = _alembic_config(connection)
    if not inspect(connection).get_table_names():
        db.metadata.create_all(connection)
        command.stamp(alembic, "head")
    else:
        command.upgrade(alembic, "head")
        # Tables added to the models before migrations existed still appear on their own.
        db.metadata.create_all(connection)
    return missing_columns(db, connection)


def _set_foreign_keys(connection: Connection, enforced: bool) -> None:
    # On the driver's connection: SQLAlchemy's would begin the transaction first.
    cursor = connection.connection.cursor()
    cursor.execute(f"PRAGMA foreign_keys = {'ON' if enforced else 'OFF'}")
    cursor.close()


def raise_on_foreign_key_violations(connection: Connection) -> None:
    """Fail when a row references one that doesn't exist."""
    violations = connection.exec_driver_sql("PRAGMA foreign_key_check").all()
    if violations:
        tables = sorted({row[0] for row in violations})
        raise ForeignKeyViolationError(
            f"{len(violations)} rows reference rows that don't exist, in: {', '.join(tables)}"
        )


def missing_columns(db: SQLAlchemy, connection: Connection) -> list[str]:
    inspector = inspect(connection)
    missing = []
    for table in db.metadata.sorted_tables:
        present = {column["name"] for column in inspector.get_columns(table.name)}
        missing += [f"{table.name}.{column.name}" for column in table.columns if column.name not in present]
    return missing


def include_object(
    item: SchemaItem, name: str | None, type_: str, reflected: bool, compare_to: SchemaItem | None
) -> bool:
    """Alembic's autogenerate filter: never propose dropping a retired table or column."""
    if isinstance(item, Table):
        return name not in RETIRED_TABLES
    if isinstance(item, Column) and isinstance(item.table, Table):
        return (item.table.name, name) not in RETIRED_COLUMNS
    return True


def _alembic_config(connection: Connection) -> AlembicConfig:
    config = AlembicConfig()
    config.set_main_option("script_location", str(SCRIPT_LOCATION))
    config.attributes["connection"] = connection
    return config
