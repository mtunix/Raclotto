from flask import request
from back.src.api.base_api import BaseApi, ApiError, ApiErrorCode
from back.src.auth.middleware import require_auth
from back.src.repository.insult_repository import InsultRepository
from back.src.api.serializer import serialize_single, serialize_collection
from back.src.api.deserializer import deserialize_attributes
from back.src.driver.database import db


class InsultApi(BaseApi):
    url_prefix = "/insults"
    
    def __init__(self):
        super().__init__()
        self.repository = InsultRepository()
    
    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def list_insults(self):
        """List all insults.
        
        :returns List[Insult]: List of insults
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        insults = self.repository.all()
        return serialize_collection(insults, "insult")
    
    @BaseApi.endpoint("", ["POST"])
    @require_auth
    def create_insult(self):
        """Create a new insult.
        
        Request body should contain insult attributes.
        
        :returns Insult: Created insult
        :status_code 201: Insult created successfully
        :status_code 401: Not authenticated
        """
        attributes = deserialize_attributes()
        insult = self.repository.create(attributes)
        db.session.commit()
        
        return serialize_single(insult, "insult")
    
    @BaseApi.endpoint("/<int:insult_id>", ["GET"])
    @require_auth
    def get_insult(self, insult_id: int):
        """Get an insult by ID.
        
        :param insult_id: Insult ID
        :returns Insult: Insult
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Insult not found
        """
        insult = self.repository.by_id(insult_id)
        if not insult:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Insult not found",
                detail="The specified insult does not exist"
            )
        
        return serialize_single(insult, "insult")
    
    @BaseApi.endpoint("/<int:insult_id>", ["PATCH"])
    @require_auth
    def update_insult(self, insult_id: int):
        """Update an insult.
        
        :param insult_id: Insult ID
        :returns Insult: Updated insult
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Insult not found
        """
        insult = self.repository.by_id(insult_id)
        if not insult:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Insult not found",
                detail="The specified insult does not exist"
            )
        
        attributes = deserialize_attributes()
        updated = self.repository.update(insult_id, attributes)
        db.session.commit()
        
        return serialize_single(updated, "insult")
    
    @BaseApi.endpoint("/<int:insult_id>", ["DELETE"])
    @require_auth
    def delete_insult(self, insult_id: int):
        """Delete an insult.
        
        :param insult_id: Insult ID
        :status_code 204: Success
        :status_code 401: Not authenticated
        :status_code 404: Insult not found
        """
        if not self.repository.exists(insult_id):
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Insult not found",
                detail="The specified insult does not exist"
            )
        
        self.repository.delete(insult_id)
        db.session.commit()
        
        return None, 204
