import os
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine

import back.src.entity  # noqa: F401  registers every model on the metadata
from back.src.driver.database import BaseModel

config = context.config
if config.config_file_name is not None and config.attributes.get("connection") is None:
    fileConfig(config.config_file_name)

target_metadata = BaseModel.metadata

REPO_ROOT = Path(__file__).resolve().parents[2]


def _cli_url() -> str:
    return os.environ.get(
        "RACLOTTO_DATABASE_URL", f"sqlite:///{REPO_ROOT / 'instance' / 'raclotto.db'}"
    )


def _run(connection) -> None:
    # SQLite can't alter most columns in place; batch mode rebuilds the table instead.
    context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    context.configure(url=_cli_url(), target_metadata=target_metadata, literal_binds=True, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()
elif config.attributes.get("connection") is not None:
    _run(config.attributes["connection"])
else:
    with create_engine(_cli_url()).begin() as connection:
        _run(connection)
