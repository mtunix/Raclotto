from typing import Any

from sqlalchemy.exc import NoResultFound

from back.src.driver.database import Base, db


class BaseRepository[T: Base]:
    """Base repository with common CRUD operations."""

    def __init__(self, entity_type: type[T]):
        """
        Initialize repository with entity type.

        :param entity_type: The SQLAlchemy model class
        """
        self.entity_type = entity_type

    def by_id(self, id: int) -> T | None:
        """
        Get entity by ID.

        :param id: Entity ID
        :return: Entity instance or None if not found
        """
        try:
            return db.session.get(self.entity_type, id)
        except NoResultFound:
            return None

    def all(self) -> list[T]:
        """
        Get all entities.

        :return: List of all entities
        """
        return db.session.query(self.entity_type).all()

    def create(self, data: dict[str, Any]) -> T:
        """
        Create a new entity.

        :param data: Dictionary with entity attributes
        :return: Created entity instance
        """
        entity = self.entity_type(**data)
        db.session.add(entity)
        db.session.flush()  # Get ID without committing
        return entity
