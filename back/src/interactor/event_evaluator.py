from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime

from back.src.entity.event import Event
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.pan import Pan


class EventEvaluator(ABC):
    """Base class for event evaluators."""
    
    @abstractmethod
    def evaluate(
        self,
        session: RaclottoSession,
        context: dict
    ) -> Optional[Event]:
        """
        Evaluate whether an event should be triggered.
        
        :param session: The session to evaluate events for
        :param context: Context information (e.g., newly created pan)
        :return: Event instance if event should be triggered, None otherwise
        """
        pass
    
    @abstractmethod
    def get_event_type(self) -> str:
        """
        Get the event type this evaluator handles.
        
        :return: Event type string
        """
        pass

