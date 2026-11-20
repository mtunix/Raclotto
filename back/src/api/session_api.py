from back.src.api.base_api import BaseApi, found
from back.src.api.guard import guarded, permissions
from back.src.auth.middleware import get_current_user, require_auth
from back.src.dto.session import (
    CreateSessionBody,
    ListSessionsQuery,
    SessionDto,
    SessionKeyBody,
    SessionKeyQuery,
    UpdateSessionBody,
)
from back.src.dto.session_recap import SessionRecapDto
from back.src.entity.raclotto_session import RaclottoSession
from back.src.interactor.session_recap import SessionRecaps
from back.src.interactor.sessions import Sessions
from back.src.repository.session_repository import SessionRepository


class SessionApi(BaseApi):
    """Anyone signed in may create, list and read sessions; only the creator or an admin may change one."""

    url_prefix = "/sessions"

    def __init__(self) -> None:
        super().__init__()
        self.repository = SessionRepository()

    def _session(self, session_id: int) -> RaclottoSession:
        return found(self.repository.by_id(session_id), "Session")

    def _managed(self, record: RaclottoSession | None) -> RaclottoSession:
        session = found(record, "Session")
        with guarded():
            permissions().manage_session(session)
        return session

    @BaseApi.endpoint("", ["POST"], body=CreateSessionBody, response=SessionDto, operation_id="createSession")
    @require_auth
    def create_session(self, body: CreateSessionBody) -> SessionDto:
        """Create a session; its creator joins it."""
        return SessionDto.model_validate(Sessions().create(get_current_user(), body.name))

    @BaseApi.endpoint("", ["GET"], query=ListSessionsQuery, response=list[SessionDto], operation_id="listSessions")
    @require_auth
    def list_sessions(self, query: ListSessionsQuery) -> list[SessionDto]:
        """List the active sessions, or every session."""
        sessions = self.repository.all_sessions() if query.include_inactive else self.repository.active_sessions()
        return [SessionDto.model_validate(session) for session in sessions]

    @BaseApi.endpoint("/<int:session_id>", ["GET"], response=SessionDto, operation_id="getSession", errors=(404,))
    @require_auth
    def get_session(self, session_id: int) -> SessionDto:
        """Get a session by id."""
        return SessionDto.model_validate(self._session(session_id))

    @BaseApi.endpoint(
        "/by-key", ["GET"], query=SessionKeyQuery, response=SessionDto, operation_id="getSessionByKey", errors=(404,)
    )
    @require_auth
    def get_session_by_key(self, query: SessionKeyQuery) -> SessionDto:
        """Get a session by its key."""
        return SessionDto.model_validate(found(self.repository.by_key(query.session_key), "Session"))

    @BaseApi.endpoint(
        "/recap",
        ["GET"],
        query=SessionKeyQuery,
        response=SessionRecapDto,
        operation_id="getSessionRecap",
        errors=(404,),
    )
    @require_auth
    def get_recap(self, query: SessionKeyQuery) -> SessionRecapDto:
        """Sum up a session: best, worst and boldest pan, favorite ingredient, and each participant."""
        session = found(self.repository.by_key(query.session_key), "Session")
        return SessionRecapDto.of(SessionRecaps().of(session))

    @BaseApi.endpoint(
        "/<int:session_id>",
        ["PATCH"],
        body=UpdateSessionBody,
        response=SessionDto,
        operation_id="updateSession",
        errors=(403, 404),
    )
    @require_auth
    def update_session(self, session_id: int, body: UpdateSessionBody) -> SessionDto:
        """Rename a session."""
        session = self._managed(self.repository.by_id(session_id))
        Sessions().rename(session, body.name)
        return SessionDto.model_validate(session)

    @BaseApi.endpoint("/<int:session_id>", ["DELETE"], status=204, operation_id="deleteSession", errors=(403, 404))
    @require_auth
    def delete_session(self, session_id: int) -> None:
        """Delete a session."""
        Sessions().delete(self._managed(self.repository.by_id(session_id)), get_current_user())

    @BaseApi.endpoint(
        "/close", ["POST"], body=SessionKeyBody, response=SessionDto, operation_id="closeSession", errors=(403, 404)
    )
    @require_auth
    def close_session(self, body: SessionKeyBody) -> SessionDto:
        """Close a session; achievements that wait for the end are judged."""
        session = self._managed(self.repository.by_key(body.key))
        Sessions().close(session, get_current_user())
        return SessionDto.model_validate(session)

    @BaseApi.endpoint(
        "/reactivate",
        ["POST"],
        body=SessionKeyBody,
        response=SessionDto,
        operation_id="reactivateSession",
        errors=(403, 404),
    )
    @require_auth
    def reactivate_session(self, body: SessionKeyBody) -> SessionDto:
        """Reopen a closed session."""
        session = self._managed(self.repository.by_key(body.key))
        Sessions().reactivate(session)
        return SessionDto.model_validate(session)
