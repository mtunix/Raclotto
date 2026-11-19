"""Session events: tell the module what happened, get back the events it announced.

    events = Events().record(PanRolled(pan, user, session))

Which evaluators react to which fact, whether an event type is enabled for the
session, how often it may fire and storing what fired all live behind
``record``. A session's own config overrides the global one. Callers own the
transaction: ``record`` flushes but never commits.
"""

import logging
from datetime import datetime, timedelta
from typing import Callable, List, Optional, Sequence

from back.src.driver.database import db
from back.src.entity.event import Event
from back.src.entity.event_config import EventConfig
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.interactor.event_evaluator import EventEvaluator
from back.src.interactor.event_evaluators.pan_swap_evaluator import PanSwapEvaluator
from back.src.interactor.facts import Fact
from back.src.repository.event_config_repository import EventConfigRepository
from back.src.repository.event_repository import EventRepository

logger = logging.getLogger(__name__)


def default_evaluators() -> tuple[EventEvaluator, ...]:
    return (PanSwapEvaluator(),)


class Events:
    def __init__(
        self,
        evaluators: Optional[Sequence[EventEvaluator]] = None,
        clock: Callable[[], datetime] = datetime.now,
    ):
        self._evaluators = tuple(evaluators) if evaluators is not None else default_evaluators()
        self._clock = clock
        self._events = EventRepository()
        self._configs = EventConfigRepository()

    def record(self, fact: Fact) -> List[Event]:
        """Ask every enabled evaluator that reacts to ``fact`` and is off cooldown; store what fires."""
        session = fact.session
        now = self._clock()
        announced = []
        for evaluator in self._evaluators:
            if not isinstance(fact, evaluator.reacts_to):
                continue
            config = self._configs.effective(evaluator.event_type, session.id)
            if config is not None and not config.enabled:
                continue
            if self._events.fired_since(session.id, evaluator.event_type, now - self._cooldown(evaluator, config)):
                continue
            try:
                triggered = evaluator.evaluate(fact)
            except Exception:
                # Events are garnish on a roll; a broken evaluator must not fail the roll.
                logger.exception("Event evaluator %s failed", evaluator.event_type)
                continue
            if triggered is None:
                continue
            event = Event(
                session_id=session.id,
                event_type=evaluator.event_type,
                message=triggered.message,
                data=triggered.data,
                created_at=now,
            )
            db.session.add(event)
            announced.append(event)
        db.session.flush()
        return announced

    def pending(self, session: RaclottoSession, user: User) -> List[Event]:
        """The session's events ``user`` has not dismissed, newest first."""
        return self._events.pending(session.id, user.id)

    def dismiss(self, event_id: int, user: User) -> bool:
        """Hide an event from ``user``; False when it does not exist or is hidden already."""
        return self._events.dismiss_for_user(event_id, user.id)

    def configs(self, session: Optional[RaclottoSession]) -> List[EventConfig]:
        """The global configs and the session's own; without a session, every config."""
        return self._configs.visible_to(session.id if session else None)

    def configure(
        self,
        event_type: str,
        enabled: bool,
        frequency_minutes: Optional[int],
        session: Optional[RaclottoSession],
    ) -> EventConfig:
        """Save the session's own config, or the global one without a session. A None frequency keeps the stored one."""
        return self._configs.save(event_type, enabled, frequency_minutes, session.id if session else None)

    @staticmethod
    def _cooldown(evaluator: EventEvaluator, config: Optional[EventConfig]) -> timedelta:
        if config is not None and config.frequency_minutes is not None:
            return timedelta(minutes=config.frequency_minutes)
        return evaluator.cooldown
