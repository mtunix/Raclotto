from back.src.driver.database import db
from back.src.entity.event_config import EventConfig
from back.src.repository.base_repository import BaseRepository


class EventConfigRepository(BaseRepository[EventConfig]):
    def __init__(self) -> None:
        super().__init__(EventConfig)

    def own(self, event_type: str, session_id: int | None) -> EventConfig | None:
        """The config stored for exactly this session, or the global one for None."""
        scope = EventConfig.session_id.is_(None) if session_id is None else EventConfig.session_id == session_id
        return db.session.query(EventConfig).filter(EventConfig.event_type == event_type, scope).first()

    def effective(self, event_type: str, session_id: int) -> EventConfig | None:
        """The session's own config, else the global one."""
        return self.own(event_type, session_id) or self.own(event_type, None)

    def visible_to(self, session_id: int | None) -> list[EventConfig]:
        """The global configs and the session's own; without a session, every config."""
        query = db.session.query(EventConfig)
        if session_id is not None:
            query = query.filter((EventConfig.session_id == session_id) | EventConfig.session_id.is_(None))
        return query.all()

    def save(
        self, event_type: str, enabled: bool, frequency_minutes: int | None, session_id: int | None
    ) -> EventConfig:
        config = self.own(event_type, session_id)
        if config is None:
            config = EventConfig(event_type=event_type, session_id=session_id)
            db.session.add(config)
        config.enabled = enabled
        if frequency_minutes is not None:
            config.frequency_minutes = frequency_minutes
        db.session.flush()
        return config
