from datetime import datetime, timedelta
from typing import Optional

from back.src.interactor.event_evaluator import EventEvaluator, Triggered
from back.src.interactor.facts import Fact, PanRolled
from back.src.repository.pan_repository import PanRepository
from back.src.repository.user_repository import UserRepository


class PanSwapEvaluator(EventEvaluator):
    """Two users rolled pans within ``window`` of each other: they swap pans."""

    event_type = "pan_swap"
    window = timedelta(minutes=10)

    def evaluate(self, fact: Fact) -> Optional[Triggered]:
        if not isinstance(fact, PanRolled):
            return None
        pan = fact.pan
        rolled_at = pan.timestamp or datetime.now()
        nearby = [
            p for p in PanRepository().by_session(fact.session.key)
            if p.id != pan.id and p.timestamp and abs(p.timestamp - rolled_at) <= self.window
        ]
        if not nearby:
            return None
        other = max(nearby, key=lambda p: p.timestamp)
        if other.user_id == pan.user_id:
            return None

        users = UserRepository()
        roller, partner = users.by_id(pan.user_id), users.by_id(other.user_id)
        if roller is None or partner is None:
            return None
        minutes = int(self.window.total_seconds() // 60)
        return Triggered(
            message=f"Swap your pans! {roller.name} and {partner.name} created pans within {minutes} minutes of each other.",
            data={
                "pan1_id": pan.id,
                "pan1_user_id": roller.id,
                "pan1_user_name": roller.name,
                "pan2_id": other.id,
                "pan2_user_id": partner.id,
                "pan2_user_name": partner.name,
                "time_window_minutes": minutes,
            },
        )
