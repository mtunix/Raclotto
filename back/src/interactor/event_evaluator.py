from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

from back.src.interactor.facts import Fact, PanRolled


@dataclass(frozen=True)
class Triggered:
    """An event to announce: an English message for the stored record, and the data the frontend fills into its text."""

    message: str
    data: dict[str, Any] = field(default_factory=dict)


class EventEvaluator(ABC):
    """Decides whether one event type fires for a fact.

    ``event_type`` names it in configs and stored events. ``cooldown`` is how long a session
    waits before the event can fire again, unless the event's config sets ``frequency_minutes``.
    """

    event_type: ClassVar[str]
    reacts_to: ClassVar[tuple[type[Fact], ...]] = (PanRolled,)
    cooldown: ClassVar[timedelta] = timedelta(hours=1)

    @abstractmethod
    def evaluate(self, fact: Fact) -> Triggered | None:
        """The event to announce for ``fact``, or None."""
