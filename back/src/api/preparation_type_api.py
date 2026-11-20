from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi, found
from back.src.api.guard import guarded, permissions
from back.src.auth.middleware import require_auth
from back.src.dto.preparation_type import CreatePrepTypeBody, PrepTypeDto
from back.src.dto.session import SessionFilterQuery
from back.src.entity.raclotto_session import RaclottoSession
from back.src.interactor.preparation_types import DefaultPreparationType, PreparationTypes
from back.src.repository.preparation_type_repository import PreparationTypeRepository
from back.src.repository.session_repository import SessionRepository


class PreparationTypeApi(BaseApi):
    url_prefix = "/preparation_type"

    def __init__(self) -> None:
        super().__init__()
        self.repository = PreparationTypeRepository()
        self.session_repository = SessionRepository()

    def _session(self, session_key: str | None) -> RaclottoSession | None:
        if session_key is None:
            return None
        return found(self.session_repository.by_key(session_key), "Session")

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
        session = self._session(query.session_key)
        prep_types = self.repository.all() if session is None else self.repository.by_session(session.id)
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
        session = self._session(query.session_key)
        if session is None:
            with guarded():
                permissions().change_global()
        return PrepTypeDto.model_validate(PreparationTypes().add(body.name, session))

    @BaseApi.endpoint(
        "/<int:prep_type_id>", ["DELETE"], status=204, operation_id="deletePreparationType", errors=(400, 404)
    )
    @require_auth
    def delete_preparation_type(self, prep_type_id: int) -> None:
        """Delete a session's preparation type; the default types stay."""
        try:
            PreparationTypes().delete(found(self.repository.by_id(prep_type_id), "Preparation type"))
        except DefaultPreparationType as e:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Cannot delete default preparation type",
                detail="Default preparation types cannot be deleted",
            ) from e
