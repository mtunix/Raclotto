from typing import TYPE_CHECKING

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import declarative_base

db = SQLAlchemy()


if TYPE_CHECKING:
    BaseModel = declarative_base()
else:
    BaseModel = db.Model