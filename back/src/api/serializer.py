from typing import List, Any, Dict
from datetime import datetime
from back.src.api.base_api import ApiError
from back.src.api.constants import JSONAPI_VERSION


def serialize_entity(entity: Any, entity_type: str) -> Dict:
    """
    Serialize a single entity to JSON API format.
    
    :param entity: Entity instance
    :param entity_type: Entity type name (e.g., "session", "ingredient")
    :return: JSON API formatted dict
    """
    if entity is None:
        return None
    
    # Get attributes from entity
    attributes = {}
    if hasattr(entity, 'as_dict'):
        attributes = entity.as_dict()
        # Convert datetime fields to ISO format strings
        for key, value in attributes.items():
            if isinstance(value, datetime):
                attributes[key] = value.isoformat()
    else:
        # Fallback: get all columns
        for column in entity.__table__.columns:
            value = getattr(entity, column.name)
            # Convert datetime to ISO format string
            if isinstance(value, datetime):
                value = value.isoformat()
            attributes[column.name] = value
    
    # Remove id from attributes (it's in the top level)
    entity_id = attributes.pop('id', getattr(entity, 'id', None))
    
    return {
        "type": entity_type,
        "id": str(entity_id) if entity_id is not None else None,
        "attributes": attributes
    }


def serialize_collection(entities: List[Any], entity_type: str) -> Dict:
    """
    Serialize a collection of entities to JSON API format.
    
    :param entities: List of entity instances
    :param entity_type: Entity type name
    :return: JSON API formatted dict with data array
    """
    data = [serialize_entity(entity, entity_type) for entity in entities]
    
    return {
        "jsonapi": {"version": JSONAPI_VERSION},
        "data": data
    }


def serialize_single(entity: Any, entity_type: str) -> Dict:
    """
    Serialize a single entity to full JSON API response format.
    
    :param entity: Entity instance
    :param entity_type: Entity type name
    :return: Full JSON API response dict
    """
    data = serialize_entity(entity, entity_type)
    
    return {
        "jsonapi": {"version": JSONAPI_VERSION},
        "data": data
    }


def serialize_error(error: ApiError) -> Dict:
    """
    Serialize an ApiError to JSON API error format.
    
    :param error: ApiError instance
    :return: JSON API error response dict
    """
    return {
        "jsonapi": {"version": JSONAPI_VERSION},
        "errors": [error.to_dict()]
    }
