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
    JWT_SECRET_KEY = "dev-secret-key-change-in-production"
    JWT_EXPIRATION_DAYS = 7
    INVITE_TOKEN_EXPIRATION_DAYS = 7


class ConfigProduction(RaclottoConfig):
    FLASK_ENV = "raclotto-live"
    DEBUG = False
    TESTING = False
    VALIDATE_TOKEN = True
    DOCUMENTATION = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///raclotto.db"
    JWT_SECRET_KEY = "production-secret-key-must-be-changed"
    JWT_EXPIRATION_DAYS = 7
    INVITE_TOKEN_EXPIRATION_DAYS = 7