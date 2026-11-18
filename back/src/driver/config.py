"""App configurations; `production_config` and `development_config` are the only readers of the environment."""

from typing import Mapping, Optional, Type

from flask import Config

DEV_JWT_SECRET = "dev-secret-key-change-in-production"
# Secrets that have been in source; anyone can forge tokens signed with them.
KNOWN_JWT_SECRETS = frozenset({DEV_JWT_SECRET, "production-secret-key-must-be-changed"})
MIN_JWT_SECRET_BYTES = 32


class ConfigurationError(RuntimeError):
    """The environment can't configure the app safely."""


class RaclottoConfig(Config):
    ADMIN_PASSWORD: Optional[str] = None
    HOST = "127.0.0.1"
    PORT = 8081
    # The reverse proxy whose X-Forwarded-* headers waitress believes; None: believe none.
    TRUSTED_PROXY: Optional[str] = None
    # None: no log file.
    LOG_FILE: Optional[str] = None


class ConfigInMemory(RaclottoConfig):
    DEBUG = True
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    JWT_SECRET_KEY = DEV_JWT_SECRET
    INVITE_TOKEN_EXPIRATION_DAYS = 7


class ConfigProduction(RaclottoConfig):
    DEBUG = False
    TESTING = False
    # Relative to the app's instance folder: instance/raclotto.db, as the Alembic CLI defaults to.
    SQLALCHEMY_DATABASE_URI = "sqlite:///raclotto.db"
    JWT_SECRET_KEY: Optional[str] = None
    INVITE_TOKEN_EXPIRATION_DAYS = 7
    # Relative to the app's instance folder, like the database.
    LOG_FILE: Optional[str] = "raclotto-api.log"


class ConfigDevelopment(ConfigProduction):
    DEBUG = True
    JWT_SECRET_KEY = DEV_JWT_SECRET


def production_config(environ: Mapping[str, str]) -> Type[ConfigProduction]:
    """ConfigProduction completed from the environment; raises ConfigurationError for an unusable JWT secret."""
    secret = environ.get("RACLOTTO_JWT_SECRET", "")
    if not secret:
        raise ConfigurationError("RACLOTTO_JWT_SECRET is not set; production needs its own JWT signing secret.")
    if secret in KNOWN_JWT_SECRETS:
        raise ConfigurationError("RACLOTTO_JWT_SECRET is a published placeholder; generate a new secret.")
    if len(secret.encode()) < MIN_JWT_SECRET_BYTES:
        raise ConfigurationError(f"RACLOTTO_JWT_SECRET must be at least {MIN_JWT_SECRET_BYTES} bytes long.")
    return _from_environment(ConfigProduction, environ, JWT_SECRET_KEY=secret)


def development_config(environ: Mapping[str, str]) -> Type[ConfigProduction]:
    """The production database and bootstrap with debug on and the dev JWT secret."""
    return _from_environment(ConfigDevelopment, environ)


def database_url(environ: Mapping[str, str]) -> str:
    """The SQLAlchemy URL both servers use; a relative SQLite path is under the instance folder."""
    return environ.get("RACLOTTO_DATABASE_URL") or ConfigProduction.SQLALCHEMY_DATABASE_URI


def _from_environment(base: Type[ConfigProduction], environ: Mapping[str, str], **overrides: object) -> Type[ConfigProduction]:
    settings = {
        "SQLALCHEMY_DATABASE_URI": database_url(environ),
        "ADMIN_PASSWORD": environ.get("RACLOTTO_ADMIN_PASSWORD") or None,
        "HOST": environ.get("RACLOTTO_HOST") or base.HOST,
        "PORT": _port(environ.get("RACLOTTO_PORT")) or base.PORT,
        "LOG_FILE": environ.get("RACLOTTO_LOG_FILE") or base.LOG_FILE,
        "TRUSTED_PROXY": environ.get("RACLOTTO_TRUSTED_PROXY") or None,
        **overrides,
    }
    return type(base.__name__, (base,), settings)


def _port(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    try:
        port = int(value)
    except ValueError:
        port = 0
    if not 0 < port < 65536:
        raise ConfigurationError(f"RACLOTTO_PORT must be a port number (1-65535), got {value!r}.")
    return port
