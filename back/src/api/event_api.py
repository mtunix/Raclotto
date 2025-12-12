from flask import request
from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.api.serializer import serialize_single, serialize_collection, serialize_entity
from back.src.api.constants import JSONAPI_VERSION
from back.src.api.deserializer import deserialize_attributes
from back.src.auth.middleware import require_auth, get_current_user
from back.src.interactor.event_service import EventService
from back.src.repository.session_repository import SessionRepository
from back.src.driver.database import db


class EventApi(BaseApi):
    url_prefix = "/events"
    
    def __init__(self):
        super().__init__()
        self.event_service = EventService()
        self.session_repository = SessionRepository()
    
    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def get_events(self):
        """Get pending events for a session.
        
        Query parameters:
        - session_key: Session key (required)
        
        :returns List[Event]: List of pending events
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        user = get_current_user()
        session_key = request.args.get('session_key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="session_key query parameter is required"
            )
        
        # Verify session exists
        session = self.session_repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        # Get pending events
        events = self.event_service.get_pending_events(session_key, user.id)
        
        return serialize_collection(events, "event")
    
    @BaseApi.endpoint("/<int:event_id>/dismiss", ["POST"])
    @require_auth
    def dismiss_event(self, event_id: int):
        """Dismiss an event for the current user.
        
        :param event_id: Event ID
        :returns dict: Success message
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Event not found
        """
        user = get_current_user()
        
        success = self.event_service.dismiss_event(event_id, user.id)
        if not success:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Event not found",
                detail="The specified event does not exist or has already been dismissed"
            )
        
        db.session.commit()
        
        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": {
                "type": "event_dismissal",
                "id": str(event_id),
                "attributes": {
                    "dismissed": True
                }
            }
        }
    
    @BaseApi.endpoint("/configs", ["GET"])
    @require_auth
    def get_event_configs(self):
        """Get event configurations for a session.
        
        Query parameters:
        - session_key: Session key (optional, if not provided returns global configs)
        
        :returns List[EventConfig]: List of event configurations
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        session_key = request.args.get('session_key')
        session_id = None
        
        if session_key:
            session = self.session_repository.by_key(session_key)
            if session:
                session_id = session.id
        
        configs = self.event_service.get_all_configs(session_id)
        
        return serialize_collection(configs, "event_config")
    
    @BaseApi.endpoint("/configs", ["POST"])
    @require_auth
    def create_event_config(self):
        """Create or update an event configuration.
        
        Request body should contain:
        - event_type: Event type (required)
        - enabled: Whether event is enabled (required)
        - frequency_minutes: Optional frequency in minutes
        - session_key: Optional session key for session-specific config
        
        :returns EventConfig: Created or updated configuration
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        attributes = deserialize_attributes()
        event_type = attributes.get('event_type')
        enabled = attributes.get('enabled')
        frequency_minutes = attributes.get('frequency_minutes')
        session_key = attributes.get('session_key')
        
        if not event_type:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="event_type is required"
            )
        
        if enabled is None:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="enabled is required"
            )
        
        session_id = None
        if session_key:
            session = self.session_repository.by_key(session_key)
            if not session:
                raise ApiError(
                    ApiErrorCode.resource_not_found,
                    status=404,
                    title="Session not found",
                    detail="The specified session does not exist"
                )
            session_id = session.id
        
        config = self.event_service.create_or_update_config(
            event_type, enabled, frequency_minutes, session_id
        )
        db.session.commit()
        
        return serialize_single(config, "event_config")
    
    @BaseApi.endpoint("/configs/<int:config_id>", ["PATCH"])
    @require_auth
    def update_event_config(self, config_id: int):
        """Update an event configuration.
        
        Request body should contain:
        - enabled: Optional whether event is enabled
        - frequency_minutes: Optional frequency in minutes
        
        :param config_id: Configuration ID
        :returns EventConfig: Updated configuration
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Configuration not found
        """
        from back.src.repository.event_config_repository import EventConfigRepository
        
        config_repository = EventConfigRepository()
        config = config_repository.by_id(config_id)
        
        if not config:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Configuration not found",
                detail="The specified configuration does not exist"
            )
        
        attributes = deserialize_attributes()
        
        if 'enabled' in attributes:
            config.enabled = attributes['enabled']
        if 'frequency_minutes' in attributes:
            config.frequency_minutes = attributes['frequency_minutes']
        
        db.session.flush()
        db.session.commit()
        
        return serialize_single(config, "event_config")

