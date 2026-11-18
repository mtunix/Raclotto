from back.src.api.base_api import BaseApi
from back.src.auth.middleware import require_auth
from back.src.repository.level_repository import LevelRepository
from back.src.api.serializer import serialize_collection, serialize_single
from back.src.api.constants import JSONAPI_VERSION


class LevelApi(BaseApi):
    url_prefix = "/levels"
    
    def __init__(self):
        super().__init__()
        self.repository = LevelRepository()
    
    @BaseApi.endpoint("", ["GET"])
    @require_auth
    def list_levels(self):
        """List all levels ordered by required experience.
        
        :returns dict: Response with levels data
        :status_code 200: Success
        :status_code 401: Not authenticated
        """
        levels = self.repository.all_ordered()
        
        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": serialize_collection(levels, "level")
        }
    
    @BaseApi.endpoint("/<int:level_id>", ["GET"])
    @require_auth
    def get_level(self, level_id: int):
        """Get a level by ID.
        
        :param level_id: Level ID
        :returns Level: Level
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 404: Level not found
        """
        from back.src.api.base_api import ApiError, ApiErrorCode
        
        level = self.repository.by_id(level_id)
        if not level:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Level not found",
                detail="The specified level does not exist"
            )
        
        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": serialize_single(level, "level")
        }

