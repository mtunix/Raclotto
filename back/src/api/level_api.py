from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import require_auth
from back.src.dto.level import LevelDto
from back.src.repository.level_repository import LevelRepository


class LevelApi(BaseApi):
    url_prefix = "/levels"

    def __init__(self) -> None:
        super().__init__()
        self.repository = LevelRepository()

    @BaseApi.endpoint("", ["GET"], response=list[LevelDto])
    @require_auth
    def list_levels(self) -> list[LevelDto]:
        """List all levels ordered by required experience."""
        return [LevelDto.model_validate(level) for level in self.repository.all_ordered()]

    @BaseApi.endpoint("/<int:level_id>", ["GET"], response=LevelDto, errors=(404,))
    @require_auth
    def get_level(self, level_id: int) -> LevelDto:
        """Get a level by id."""
        level = self.repository.by_id(level_id)
        if not level:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Level not found",
                detail="The specified level does not exist"
            )
        return LevelDto.model_validate(level)
