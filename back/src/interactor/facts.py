"""What happened in a session. Routes and the roll report facts to achievements and events."""

from dataclasses import dataclass

from back.src.entity.ingredient import Ingredient
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.rating import Rating
from back.src.entity.user import User


@dataclass(frozen=True)
class PanRolled:
    pan: Pan
    user: User
    session: RaclottoSession

    @property
    def actor(self) -> User | None:
        return self.user


@dataclass(frozen=True)
class PanRated:
    rating: Rating
    pan: Pan
    rater: User
    session: RaclottoSession

    @property
    def actor(self) -> User | None:
        return self.rater


@dataclass(frozen=True)
class IngredientAdded:
    ingredient: Ingredient
    user: User
    session: RaclottoSession

    @property
    def actor(self) -> User | None:
        return self.user


@dataclass(frozen=True)
class CatalogChanged:
    """A session's ingredient catalog was replaced or merged."""

    session: RaclottoSession
    actor: User | None = None


@dataclass(frozen=True)
class SessionClosed:
    session: RaclottoSession
    actor: User | None = None


Fact = PanRolled | PanRated | IngredientAdded | CatalogChanged | SessionClosed
