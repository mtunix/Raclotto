from datetime import datetime

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import get_current_user, require_auth
from back.src.driver.database import db
from back.src.dto.session import (
    CreateSessionBody,
    ListSessionsQuery,
    SessionDto,
    SessionKeyBody,
    SessionKeyQuery,
    UpdateSessionBody,
)
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import user_sessions
from back.src.interactor.achievements import Achievements, SessionClosed
from back.src.repository.session_repository import SessionRepository


def _not_found() -> ApiError:
    return ApiError(
        ApiErrorCode.resource_not_found,
        status=404,
        title="Session not found",
        detail="The specified session does not exist",
    )


class SessionApi(BaseApi):
    """Any signed-in user may list, change, close, reactivate and delete any session."""

    url_prefix = "/sessions"

    def __init__(self) -> None:
        super().__init__()
        self.repository = SessionRepository()

    def _session(self, session_id: int) -> RaclottoSession:
        session = self.repository.by_id(session_id)
        if not session:
            raise _not_found()
        return session

    @BaseApi.endpoint("", ["POST"], body=CreateSessionBody, response=SessionDto, operation_id="createSession")
    @require_auth
    def create_session(self, body: CreateSessionBody) -> SessionDto:
        """Create a session; its creator joins it."""
        user = get_current_user()
        session = self.repository.create_with_key(body.name, user.id)
        # The join time counts for achievements such as "Pandler".
        db.session.execute(
            user_sessions.insert().values(user_id=user.id, session_id=session.id, joined_at=datetime.now())
        )
        dto = SessionDto.model_validate(session)
        db.session.commit()
        return dto

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
        session = self.repository.by_key(query.session_key)
        if not session:
            raise _not_found()
        return SessionDto.model_validate(session)

    @BaseApi.endpoint(
        "/<int:session_id>",
        ["PATCH"],
        body=UpdateSessionBody,
        response=SessionDto,
        operation_id="updateSession",
        errors=(404,),
    )
    @require_auth
    def update_session(self, session_id: int, body: UpdateSessionBody) -> SessionDto:
        """Rename a session."""
        session = self._session(session_id)
        session.name = body.name
        dto = SessionDto.model_validate(session)
        db.session.commit()
        return dto

    @BaseApi.endpoint("/<int:session_id>", ["DELETE"], status=204, operation_id="deleteSession", errors=(404,))
    @require_auth
    def delete_session(self, session_id: int) -> None:
        """Delete a session."""
        db.session.delete(self._session(session_id))
        db.session.commit()

    @BaseApi.endpoint(
        "/close", ["POST"], body=SessionKeyBody, response=SessionDto, operation_id="closeSession", errors=(404,)
    )
    @require_auth
    def close_session(self, body: SessionKeyBody) -> SessionDto:
        """Close a session; achievements that wait for the end are judged."""
        session = self.repository.close_session(body.key)
        if not session:
            raise _not_found()
        Achievements().record(SessionClosed(session=session, actor=get_current_user()))
        dto = SessionDto.model_validate(session)
        db.session.commit()
        return dto

    @BaseApi.endpoint(
        "/reactivate",
        ["POST"],
        body=SessionKeyBody,
        response=SessionDto,
        operation_id="reactivateSession",
        errors=(404,),
    )
    @require_auth
    def reactivate_session(self, body: SessionKeyBody) -> SessionDto:
        """Reopen a closed session."""
        session = self.repository.reactivate_session(body.key)
        if not session:
            raise _not_found()
        dto = SessionDto.model_validate(session)
        db.session.commit()
        return dto
