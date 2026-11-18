from flask import request
from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.auth.middleware import require_auth, get_current_user
from back.src.api.serializer import serialize_collection, serialize_single
from back.src.api.deserializer import deserialize_attributes
from back.src.repository.preparation_type_repository import PreparationTypeRepository
from back.src.repository.session_repository import SessionRepository
from back.src.driver.database import db


class PreparationTypeApi(BaseApi):
    url_prefix = "/preparation_type"
    
    def __init__(self):
        super().__init__()
        self.repository = PreparationTypeRepository()
        self.session_repository = SessionRepository()
    
    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def list_preparation_types(self):
        """List preparation types, optionally filtered by session.
        
        Query parameters:
        - session_key: Optional session key to filter by
        
        :returns List[PrepType]: List of preparation types
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        session_key = request.args.get('session_key')
        
        if session_key:
            session = self.session_repository.by_key(session_key)
            if not session:
                raise ApiError(
                    ApiErrorCode.resource_not_found,
                    status=404,
                    title="Session not found",
                    detail="The specified session does not exist"
                )
            # Get preparation types for this session (including defaults)
            prep_types = self.repository.by_session(session.id)
        else:
            # Get all preparation types (defaults and all session-specific)
            prep_types = self.repository.all()
        
        return serialize_collection(prep_types, "preparation_type")
    
    @BaseApi.endpoint("", ["POST"])
    @require_auth
    def create_preparation_type(self):
        """Create a new preparation type.
        
        Query parameters:
        - session_key: Session key (required for session-specific types)
        
        Request body should contain:
        - name: Preparation type name (required)
        
        :returns PrepType: Created preparation type
        :status_code 201: Preparation type created successfully
        :status_code 401: Not authenticated
        """
        attributes = deserialize_attributes()
        session_key = request.args.get('session_key')
        
        if not attributes.get('name'):
            raise ApiError(
                ApiErrorCode.missing_required_body_field,
                status=400,
                title="Missing required field",
                detail="name is required"
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
        
        prep_type = self.repository.create({
            'name': attributes['name'],
            'session_id': session_id
        })
        db.session.commit()
        
        return serialize_single(prep_type, "preparation_type")
    
    @BaseApi.endpoint("/<int:prep_type_id>", ["DELETE"])
    @require_auth
    def delete_preparation_type(self, prep_type_id: int):
        """Delete a preparation type.
        
        :param prep_type_id: Preparation type ID
        :status_code 204: Success
        :status_code 401: Not authenticated
        :status_code 404: Preparation type not found
        """
        prep_type = self.repository.by_id(prep_type_id)
        if not prep_type:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Preparation type not found",
                detail="The specified preparation type does not exist"
            )
        
        # Don't allow deleting default preparation types (session_id is None)
        if prep_type.session_id is None:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Cannot delete default preparation type",
                detail="Default preparation types cannot be deleted"
            )
        
        self.repository.delete(prep_type_id)
        db.session.commit()
        
        return None, 204
