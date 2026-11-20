from back.src.api.base_api import BaseApi, found, not_found
from back.src.api.guard import guarded, permissions
from back.src.auth.middleware import get_current_user, require_auth
from back.src.driver.database import db
from back.src.dto.event import EventConfigDto, EventDto, SaveEventConfigBody, UpdateEventConfigBody
from back.src.dto.session import SessionFilterQuery, SessionKeyQuery
from back.src.entity.raclotto_session import RaclottoSession
from back.src.interactor.events import Events
from back.src.repository.event_config_repository import EventConfigRepository
from back.src.repository.session_repository import SessionRepository


class EventApi(BaseApi):
    """A session's event configs are its creator's to change, the global ones an admin's."""

    url_prefix = "/events"

    def __init__(self) -> None:
        super().__init__()
        self.events = Events()
        self.session_repository = SessionRepository()
        self.config_repository = EventConfigRepository()

    def _session(self, session_key: str) -> RaclottoSession:
        return found(self.session_repository.by_key(session_key), "Session")

    def _configurable(self, session: RaclottoSession | None) -> None:
        with guarded():
            if session is None:
                permissions().change_global()
            else:
                permissions().manage_session(session)

    @BaseApi.endpoint(
        "", ["GET"], query=SessionKeyQuery, response=list[EventDto], operation_id="listEvents", errors=(404,)
    )
    @require_auth
    def get_events(self, query: SessionKeyQuery) -> list[EventDto]:
        """List a session's events the signed-in user has not dismissed, newest first."""
        events = self.events.pending(self._session(query.session_key), get_current_user())
        return [EventDto.model_validate(event) for event in events]

    @BaseApi.endpoint("/<int:event_id>/dismiss", ["POST"], status=204, operation_id="dismissEvent", errors=(404,))
    @require_auth
    def dismiss_event(self, event_id: int) -> None:
        """Hide an event from the signed-in user; other users still see it."""
        if not self.events.dismiss(event_id, get_current_user()):
            raise not_found("Event", "The specified event does not exist or has already been dismissed")
        db.session.commit()

    @BaseApi.endpoint(
        "/configs", ["GET"], query=SessionFilterQuery, response=list[EventConfigDto], operation_id="listEventConfigs"
    )
    @require_auth
    def get_event_configs(self, query: SessionFilterQuery) -> list[EventConfigDto]:
        """List the session's effective config per event type, its own over the global; without a known session, all."""
        session = self.session_repository.by_key(query.session_key) if query.session_key is not None else None
        configs = self.events.configs(session)
        return [EventConfigDto.model_validate(config) for config in configs]

    @BaseApi.endpoint(
        "/configs",
        ["POST"],
        body=SaveEventConfigBody,
        response=EventConfigDto,
        operation_id="saveEventConfig",
        errors=(403, 404),
    )
    @require_auth
    def create_event_config(self, body: SaveEventConfigBody) -> EventConfigDto:
        """Create or change the config of an event type, the session's own or the global one."""
        session = self._session(body.session_key) if body.session_key is not None else None
        self._configurable(session)
        config = self.events.configure(body.event_type, body.enabled, body.frequency_minutes, session)
        dto = EventConfigDto.model_validate(config)
        db.session.commit()
        return dto

    @BaseApi.endpoint(
        "/configs/<int:config_id>",
        ["PATCH"],
        body=UpdateEventConfigBody,
        response=EventConfigDto,
        operation_id="updateEventConfig",
        errors=(403, 404),
    )
    @require_auth
    def update_event_config(self, config_id: int, body: UpdateEventConfigBody) -> EventConfigDto:
        """Change an event config by id."""
        config = found(self.config_repository.by_id(config_id), "Configuration")
        self._configurable(config.session)
        for field in body.model_fields_set:
            setattr(config, field, getattr(body, field))
        dto = EventConfigDto.model_validate(config)
        db.session.commit()
        return dto
