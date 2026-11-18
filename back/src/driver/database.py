from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base of every model; `db.Model` shares its metadata and registry.

    Models subclass `Base`, not `db.Model`: a type checker can't see through the attribute, and
    `db.Model` only adds `Model.query` and a `__repr__`, neither of which the app uses.
    """


db = SQLAlchemy(model_class=Base)
