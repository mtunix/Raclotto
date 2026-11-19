"""User stats: what a profile shows about a user's pans, the ratings they got and gave, and their achievements."""

from collections import Counter
from dataclasses import dataclass
from typing import Optional, Tuple

from back.src.entity.ingredient import Ingredient
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.pan_repository import PanRepository
from back.src.repository.rating_repository import RatingRepository
from back.src.repository.session_repository import SessionRepository


@dataclass(frozen=True)
class UserStats:
    total_pans: int
    total_ratings_given: int
    average_rating_received: float
    favorite_ingredient: Optional[Ingredient]
    best_rated_ingredient: Optional[Tuple[Ingredient, float]]
    total_achievement_points: int
    average_ingredients_per_pan: float
    most_pans_session: Optional[Tuple[RaclottoSession, int]]
    sessions_participated: int
    most_ingredients_pan: Optional[Pan]


def user_stats(user: User) -> UserStats:
    """Averages are rounded to two decimals and 0 when there is nothing to average."""
    pans = PanRepository().by_user(user.id)
    pan_ids = [pan.id for pan in pans]

    # Counter keeps first-seen order, so the first ingredient or session counted wins a tie.
    ingredient_uses = Counter(ingredient.id for pan in pans for ingredient in pan.ingredients)
    favorite = None
    if ingredient_uses:
        favorite = IngredientRepository().by_id(ingredient_uses.most_common(1)[0][0])

    best = IngredientRepository().best_rated_in_pans(pan_ids)

    session_pans = Counter(pan.session_id for pan in pans if pan.session_id)
    most_pans_session = None
    if session_pans:
        session_id, count = session_pans.most_common(1)[0]
        session = SessionRepository().by_id(session_id)
        most_pans_session = (session, count) if session else None

    return UserStats(
        total_pans=len(pans),
        total_ratings_given=RatingRepository().count_by_user(user.id),
        average_rating_received=round(RatingRepository().average_for_pans(pan_ids) or 0.0, 2),
        favorite_ingredient=favorite,
        best_rated_ingredient=(best[0], float(best[1] or 0.0)) if best else None,
        # Seeded achievements always have a value; the column allows null.
        total_achievement_points=sum(achievement.value or 0 for achievement in user.achievements),
        average_ingredients_per_pan=round(sum(len(p.ingredients) for p in pans) / len(pans), 2) if pans else 0.0,
        most_pans_session=most_pans_session,
        sessions_participated=len(session_pans),
        most_ingredients_pan=max(pans, key=lambda p: len(p.ingredients)) if pans else None,
    )
