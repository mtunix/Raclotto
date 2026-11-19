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
RETIRED_COLUMNS = frozenset({("pan", "snacked"), ("achievement", "is_global"), ("achievement", "description")})


class SchemaDriftError(RuntimeError):
    """The database lacks tables or columns the models need, even after migrating."""


def migrate(db: SQLAlchemy) -> None:
    """A new database is created and stamped at head; an existing one is upgraded to head."""
    with db.engine.begin() as connection:
        alembic = _alembic_config(connection)
        if not inspect(connection).get_table_names():
            db.metadata.create_all(connection)
            command.stamp(alembic, "head")
        else:
            command.upgrade(alembic, "head")
            # Tables added to the models before migrations existed still appear on their own.
            db.metadata.create_all(connection)
        missing = missing_columns(db, connection)
    if missing:
        raise SchemaDriftError(
            "The database is missing columns the models need; add a migration for: " + ", ".join(missing)
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
