from typing import TypeVar, Generic, Optional, List, Type
from sqlalchemy.exc import NoResultFound
from back.src.driver.database import db, BaseModel

T = TypeVar('T', bound=BaseModel)


class BaseRepository(Generic[T]):
    """Base repository with common CRUD operations."""
    
    def __init__(self, entity_type: Type[T]):
        """
        Initialize repository with entity type.
        
        :param entity_type: The SQLAlchemy model class
        """
        self.entity_type = entity_type
    
    def by_id(self, id: int) -> Optional[T]:
        """
        Get entity by ID.
        
        :param id: Entity ID
        :return: Entity instance or None if not found
        """
        try:
            return db.session.get(self.entity_type, id)
        except NoResultFound:
            return None
    
    def all(self) -> List[T]:
        """
        Get all entities.
        
        :return: List of all entities
        """
        return db.session.query(self.entity_type).all()
    
    def create(self, data: dict) -> T:
        """
        Create a new entity.
        
        :param data: Dictionary with entity attributes
        :return: Created entity instance
        """
        entity = self.entity_type(**data)
        db.session.add(entity)
        db.session.flush()  # Get ID without committing
        return entity
    
    def update(self, id: int, data: dict) -> Optional[T]:
        """
        Update an existing entity.
        
        :param id: Entity ID
        :param data: Dictionary with attributes to update
        :return: Updated entity instance or None if not found
        """
        entity = self.by_id(id)
        if not entity:
            return None
        
        for key, value in data.items():
            if hasattr(entity, key):
                setattr(entity, key, value)
        
        db.session.flush()
        return entity
    
    def delete(self, id: int) -> bool:
        """
        Delete an entity by ID.
        
        :param id: Entity ID
        :return: True if deleted, False if not found
        """
        entity = self.by_id(id)
        if not entity:
            return False
        
        db.session.delete(entity)
        db.session.flush()
        return True
    
    def exists(self, id: int) -> bool:
        """
        Check if an entity exists.
        
        :param id: Entity ID
        :return: True if exists, False otherwise
        """
        return self.by_id(id) is not None
    
    def commit(self):
        """Commit the current transaction."""
        db.session.commit()
    
    def rollback(self):
        """Rollback the current transaction."""
        db.session.rollback()
