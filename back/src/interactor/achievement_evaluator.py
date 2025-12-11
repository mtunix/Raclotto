from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime

from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.entity.achievement import Achievement
from back.src.entity.raclotto_session import RaclottoSession


@dataclass
class EvaluationContext:
    """Context information for evaluating achievements."""
    session: RaclottoSession
    user_pans: List[Pan]  # All pans created by the user
    session_pans: List[Pan]  # All pans in the current session
    user_ratings_count: int  # Total number of ratings given by user
    user_sessions_created: int  # Total number of sessions created by user


@dataclass
class EvaluationResult:
    """Result of an achievement evaluation."""
    unlocked: bool
    progress: Optional[float] = None  # Progress value between 0.0 and 1.0, None if not applicable


class AchievementEvaluator(ABC):
    """Base class for achievement evaluators."""
    
    @abstractmethod
    def evaluate(
        self,
        pan: Pan,
        user: User,
        context: EvaluationContext
    ) -> EvaluationResult:
        """
        Evaluate whether an achievement should be unlocked based on the new pan.
        
        :param pan: The newly created pan
        :param user: The user who created the pan
        :param context: Context information for evaluation
        :return: EvaluationResult indicating if achievement is unlocked and optional progress
        """
        pass
    
    @abstractmethod
    def calculate_progress(
        self,
        user: User,
        achievement: Achievement,
        context: EvaluationContext
    ) -> Optional[float]:
        """
        Calculate the current progress towards an achievement (0.0 to 1.0).
        
        :param user: The user
        :param achievement: The achievement to calculate progress for
        :param context: Context information for evaluation
        :return: Progress value between 0.0 and 1.0, or None if progress tracking is not applicable
        """
        pass
