from flask import Config


class RaclottoConfig(Config):
    STATIC_FOLDER = "static"
    TEMPLATES_FOLDER = "templates"
    DOCUMENTATION = True


class ConfigInMemory(RaclottoConfig):
    FLASK_ENV = "raclotto-dev-in-memory"
    DEBUG = True
    TESTING = True
    DOCUMENTATION = True
    VALIDATE_TOKEN = False
    SQLALCHEMY_DATABASE_URI = "sqlite://"


class ConfigProduction(RaclottoConfig):
    FLASK_ENV = "raclotto-live"
    DEBUG = False
    TESTING = False
    VALIDATE_TOKEN = True
    DOCUMENTATION = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///raclotto.db"