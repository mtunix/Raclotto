from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi, found
from back.src.api.guard import guarded, permissions
from back.src.auth.middleware import require_auth
from back.src.driver.database import db
from back.src.dto.preparation_type import CreatePrepTypeBody, PrepTypeDto
from back.src.dto.session import SessionFilterQuery
from back.src.entity.preparation_type import PreparationType
from back.src.repository.preparation_type_repository import PreparationTypeRepository
from back.src.repository.session_repository import SessionRepository


class PreparationTypeApi(BaseApi):
    url_prefix = "/preparation_type"

    def __init__(self) -> None:
        super().__init__()
        self.repository = PreparationTypeRepository()
        self.session_repository = SessionRepository()

    def _session_id(self, session_key: str | None) -> int | None:
        if session_key is None:
            return None
        return found(self.session_repository.by_key(session_key), "Session").id

    @BaseApi.endpoint(
        "",
        ["GET"],
        query=SessionFilterQuery,
        response=list[PrepTypeDto],
        operation_id="listPreparationTypes",
        errors=(404,),
    )
    @require_auth
    def list_preparation_types(self, query: SessionFilterQuery) -> list[PrepTypeDto]:
        """List the default preparation types and a session's own, or every preparation type."""
        session_id = self._session_id(query.session_key)
        prep_types = self.repository.all() if session_id is None else self.repository.by_session(session_id)
        return [PrepTypeDto.model_validate(prep_type) for prep_type in prep_types]

    @BaseApi.endpoint(
        "",
        ["POST"],
        query=SessionFilterQuery,
        body=CreatePrepTypeBody,
        response=PrepTypeDto,
        operation_id="createPreparationType",
        errors=(403, 404),
    )
    @require_auth
    def create_preparation_type(self, query: SessionFilterQuery, body: CreatePrepTypeBody) -> PrepTypeDto:
        """Add a preparation type to a session; without a session an admin adds a default type."""
        session_id = self._session_id(query.session_key)
        if session_id is None:
            with guarded():
                permissions().change_global()
        prep_type = self.repository.create({"name": body.name, "session_id": session_id})
        return PrepTypeDto.model_validate(prep_type)

    @BaseApi.endpoint(
        "/<int:prep_type_id>", ["DELETE"], status=204, operation_id="deletePreparationType", errors=(400, 404)
    )
    @require_auth
    def delete_preparation_type(self, prep_type_id: int) -> None:
        """Delete a session's preparation type; the default types stay."""
        prep_type: PreparationType = found(self.repository.by_id(prep_type_id), "Preparation type")
        if prep_type.session_id is None:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Cannot delete default preparation type",
                detail="Default preparation types cannot be deleted",
            )
        db.session.delete(prep_type)
