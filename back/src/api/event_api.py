from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import get_current_user, require_auth
from back.src.driver.database import db
from back.src.dto.event import EventConfigDto, EventDto, SaveEventConfigBody, UpdateEventConfigBody
from back.src.dto.session import SessionFilterQuery, SessionKeyQuery
from back.src.entity.raclotto_session import RaclottoSession
from back.src.interactor.event_service import EventService
from back.src.repository.event_config_repository import EventConfigRepository
from back.src.repository.session_repository import SessionRepository


class EventApi(BaseApi):
    url_prefix = "/events"

    def __init__(self) -> None:
        super().__init__()
        self.event_service = EventService()
        self.session_repository = SessionRepository()
        self.config_repository = EventConfigRepository()

    def _session(self, session_key: str) -> RaclottoSession:
        session = self.session_repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist"
            )
        return session

    @BaseApi.endpoint("", ["GET"], query=SessionKeyQuery, response=list[EventDto], operation_id="listEvents",
                      errors=(404,))
    @require_auth
    def get_events(self, query: SessionKeyQuery) -> list[EventDto]:
        """List a session's events the signed-in user has not dismissed, newest first."""
        self._session(query.session_key)
        events = self.event_service.get_pending_events(query.session_key, get_current_user().id)
        return [EventDto.model_validate(event) for event in events]

    @BaseApi.endpoint("/<int:event_id>/dismiss", ["POST"], status=204, operation_id="dismissEvent", errors=(404,))
    @require_auth
    def dismiss_event(self, event_id: int) -> None:
        """Hide an event from the signed-in user; other users still see it."""
        if not self.event_service.dismiss_event(event_id, get_current_user().id):
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Event not found",
                detail="The specified event does not exist or has already been dismissed"
            )
        db.session.commit()

    @BaseApi.endpoint("/configs", ["GET"], query=SessionFilterQuery, response=list[EventConfigDto],
                      operation_id="listEventConfigs")
    @require_auth
    def get_event_configs(self, query: SessionFilterQuery) -> list[EventConfigDto]:
        """List the global event configs and the session's own; without a known session, every config."""
        session = self.session_repository.by_key(query.session_key) if query.session_key is not None else None
        configs = self.event_service.get_all_configs(session.id if session else None)
        return [EventConfigDto.model_validate(config) for config in configs]

    @BaseApi.endpoint("/configs", ["POST"], body=SaveEventConfigBody, response=EventConfigDto,
                      operation_id="saveEventConfig", errors=(404,))
    @require_auth
    def create_event_config(self, body: SaveEventConfigBody) -> EventConfigDto:
        """Create or change the config of an event type, the session's own or the global one."""
        session_id = self._session(body.session_key).id if body.session_key is not None else None
        config = self.event_service.create_or_update_config(
            body.event_type, body.enabled, body.frequency_minutes, session_id
        )
        dto = EventConfigDto.model_validate(config)
        db.session.commit()
        return dto

    @BaseApi.endpoint("/configs/<int:config_id>", ["PATCH"], body=UpdateEventConfigBody, response=EventConfigDto,
                      operation_id="updateEventConfig", errors=(404,))
    @require_auth
    def update_event_config(self, config_id: int, body: UpdateEventConfigBody) -> EventConfigDto:
        """Change an event config by id."""
        config = self.config_repository.by_id(config_id)
        if not config:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Configuration not found",
                detail="The specified configuration does not exist"
            )
        for field in body.model_fields_set:
            setattr(config, field, getattr(body, field))
        dto = EventConfigDto.model_validate(config)
        db.session.commit()
        return dto
