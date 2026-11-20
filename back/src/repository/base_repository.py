from typing import Any

from sqlalchemy.exc import NoResultFound

from back.src.driver.database import Base, db


class BaseRepository[T: Base]:
    """Base repository with common CRUD operations."""

    def __init__(self, entity_type: type[T]):
        self.entity_type = entity_type

    def by_id(self, id: int) -> T | None:
        try:
            return db.session.get(self.entity_type, id)
        except NoResultFound:
            return None

    def all(self) -> list[T]:
        return db.session.query(self.entity_type).all()

    def create(self, data: dict[str, Any]) -> T:
        entity = self.entity_type(**data)
        db.session.add(entity)
        db.session.flush()  # Get ID without committing
        return entity
