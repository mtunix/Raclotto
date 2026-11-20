from datetime import datetime

from sqlalchemy import select

from back.src.driver.database import db
from back.src.entity.event import Event
from back.src.entity.user import user_event_dismissals
from back.src.repository.base_repository import BaseRepository


class EventRepository(BaseRepository[Event]):
    def __init__(self) -> None:
        super().__init__(Event)

    def pending(self, session_id: int, user_id: int) -> list[Event]:
        """The session's events the user has not dismissed, newest first."""
        dismissed = select(user_event_dismissals.c.event_id).where(user_event_dismissals.c.user_id == user_id)
        return (
            db.session.query(Event)
            .filter(Event.session_id == session_id, Event.id.not_in(dismissed))
            .order_by(Event.created_at.desc(), Event.id.desc())
            .all()
        )

    def latest(self, session_id: int, event_type: str) -> Event | None:
        return (
            db.session.query(Event)
            .filter(Event.session_id == session_id, Event.event_type == event_type)
            .order_by(Event.created_at.desc(), Event.id.desc())
            .first()
        )

    def fired_since(self, session_id: int, event_type: str, since: datetime) -> bool:
        """Whether the event fired in the session after `since`."""
        return (
            db.session.query(Event.id)
            .filter(Event.session_id == session_id, Event.event_type == event_type, Event.created_at > since)
            .first()
            is not None
        )

    def dismiss_for_user(self, event_id: int, user_id: int) -> bool:
        """False when the event does not exist or the user dismissed it already."""
        if self.by_id(event_id) is None:
            return False
        dismissed = (
            db.session.query(user_event_dismissals)
            .filter(
                user_event_dismissals.c.user_id == user_id,
                user_event_dismissals.c.event_id == event_id,
            )
            .first()
        )
        if dismissed:
            return False
        db.session.execute(user_event_dismissals.insert().values(user_id=user_id, event_id=event_id))
        db.session.flush()
        return True
