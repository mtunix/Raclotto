from flask import request
from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.auth.middleware import require_auth, get_current_user
from back.src.repository.session_repository import SessionRepository
from back.src.api.serializer import serialize_single, serialize_collection
from back.src.api.deserializer import deserialize_attributes
from back.src.driver.database import db


class SessionApi(BaseApi):
    url_prefix = "/sessions"
    
    def __init__(self):
        super().__init__()
        self.repository = SessionRepository()
    
    @BaseApi.endpoint("", ["POST"])
    @require_auth
    def create_session(self):
        """Create a new session.
        
        Request body should contain:
        - name: Session name
        
        :returns RaclottoSession: Created session
        :status_code 201: Session created successfully
        :status_code 401: Not authenticated
        """
        user = get_current_user()
        attributes = deserialize_attributes()
        name = attributes.get('name')
        
        if not name:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="name is required"
            )
        
        session = self.repository.create_with_key(name, user.id)
        db.session.commit()
        
        return serialize_single(session, "session")
    
    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def list_sessions(self):
        """List all active sessions.
        
        :returns List[RaclottoSession]: List of active sessions
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        sessions = self.repository.active_sessions()
        return serialize_collection(sessions, "session")
    
    @BaseApi.endpoint("/<int:session_id>", ["GET"])
    @require_auth
    def get_session(self, session_id: int):
        """Get a session by ID.
        
        :param session_id: Session ID
        :returns RaclottoSession: Session
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Session not found
        """
        session = self.repository.by_id(session_id)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        return serialize_single(session, "session")
    
    @BaseApi.endpoint("/by-key", ["GET"])
    @require_auth
    def get_session_by_key(self):
        """Get a session by key.
        
        Query parameters:
        - session_key: Session key
        
        :returns RaclottoSession: Session
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Session not found
        """
        session_key = request.args.get('session_key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="session_key query parameter is required"
            )
        
        session = self.repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        return serialize_single(session, "session")
    
    @BaseApi.endpoint("/<int:session_id>", ["PATCH"])
    @require_auth
    def update_session(self, session_id: int):
        """Update a session.
        
        :param session_id: Session ID
        :returns RaclottoSession: Updated session
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Session not found
        """
        session = self.repository.by_id(session_id)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        attributes = deserialize_attributes()
        updated = self.repository.update(session_id, attributes)
        db.session.commit()
        
        return serialize_single(updated, "session")
    
    @BaseApi.endpoint("/<int:session_id>", ["DELETE"])
    @require_auth
    def delete_session(self, session_id: int):
        """Delete a session.
        
        :param session_id: Session ID
        :status_code 204: Success
        :status_code 401: Not authenticated
        :status_code 404: Session not found
        """
        if not self.repository.exists(session_id):
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        self.repository.delete(session_id)
        db.session.commit()
        
        return None, 204
    
    @BaseApi.endpoint("/close", ["POST"])
    @require_auth
    def close_session(self):
        """Close a session.
        
        Request body should contain:
        - key: Session key
        
        :returns RaclottoSession: Closed session
        :status_code 200: Session closed
        :status_code 401: Not authenticated
        :status_code 404: Session not found
        """
        attributes = deserialize_attributes()
        session_key = attributes.get('key')
        
        if not session_key:
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="key is required"
            )
        
        session = self.repository.close_session(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        
        db.session.commit()
        return serialize_single(session, "session")
