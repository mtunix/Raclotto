from typing import Dict, Any
from flask import request


def deserialize_attributes(data: Dict = None) -> Dict:
    """
    Extract attributes from JSON API payload.
    
    :param data: Request JSON data (or None to get from request)
    :return: Dictionary of attributes
    """
    if data is None:
        data = request.json or {}
    
    # Handle JSON API format: {"data": {"type": "...", "attributes": {...}}}
    if "data" in data and isinstance(data["data"], dict):
        if "attributes" in data["data"]:
            return data["data"]["attributes"]
        # If no attributes key, return the data dict itself (minus type and id)
        result = data["data"].copy()
        result.pop("type", None)
        result.pop("id", None)
        return result
    
    # Fallback: assume data is already attributes
    return data


def deserialize_entity_type(data: Dict = None) -> str:
    """
    Extract entity type from JSON API payload.
    
    :param data: Request JSON data (or None to get from request)
    :return: Entity type string
    """
    if data is None:
        data = request.json or {}
    
    # Handle JSON API format: {"data": {"type": "..."}}
    if "data" in data and isinstance(data["data"], dict):
        return data["data"].get("type", "")
    
    return ""


def deserialize_id(data: Dict = None) -> Any:
    """
    Extract entity ID from JSON API payload.
    
    :param data: Request JSON data (or None to get from request)
    :return: Entity ID
    """
    if data is None:
        data = request.json or {}
    
    # Handle JSON API format: {"data": {"id": ...}}
    if "data" in data and isinstance(data["data"], dict):
        return data["data"].get("id")
    
    return None
