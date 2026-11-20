"""Ingredient catalog: change a session's ingredients and let achievements react.

    ingredient = IngredientCatalog().add(user, session, fields)
    result = IngredientCatalog().reimport(user, session, items)
    counts = IngredientCatalog().available_counts(session_key, diet)

Every change reports its fact (``IngredientAdded`` or ``CatalogChanged``) to
achievements in the same transaction, which the endpoint commits (ADR 0008).
"""

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.raclotto_session import RaclottoSession
from back.src.entity.user import User
from back.src.interactor.achievements import Achievements
from back.src.interactor.diet import Diet
from back.src.interactor.facts import CatalogChanged, IngredientAdded
from back.src.repository.ingredient_repository import IngredientRepository

Fields = dict[str, Any]


@dataclass(frozen=True)
class CatalogItem:
    """One ingredient of an import list; ``id`` and ``session_id`` say where an exported one came from."""

    fields: Fields
    id: int | None = None
    session_id: int | None = None


@dataclass(frozen=True)
class Reimported:
    created: int
    updated: int
    # Unlisted ingredients now unavailable, those that already were included.
    unavailable: int


@dataclass(frozen=True)
class AvailableCounts:
    """A session's available fills and sauces: those a diet allows, and all of them."""

    fills: int
    sauces: int
    total_fills: int
    total_sauces: int


class CatalogError(Exception):
    """An import list item the session cannot take. ``index`` is its position in the list."""

    OTHER_SESSION = "other_session"
    UNKNOWN_INGREDIENT = "unknown_ingredient"

    def __init__(self, kind: str, index: int, detail: str):
        super().__init__(detail)
        self.kind = kind
        self.index = index
        self.detail = detail


class IngredientCatalog:
    def __init__(self, achievements: Achievements | None = None):
        self._achievements = achievements or Achievements()
        self._ingredients = IngredientRepository()

    def add(self, user: User, session: RaclottoSession, fields: Fields) -> Ingredient:
        ingredient = self._ingredients.create({**fields, "session": session})
        self._achievements.record(IngredientAdded(ingredient=ingredient, user=user, session=session))
        return ingredient

    def update(self, user: User, ingredient: Ingredient, changes: Fields) -> None:
        for name, value in changes.items():
            setattr(ingredient, name, value)
        self._changed(user, ingredient.session)

    def set_available(self, user: User, ingredient: Ingredient, available: bool) -> None:
        """Unavailable ingredients stay in the session and their pans; rolls skip them."""
        if available:
            self._ingredients.mark_available(ingredient.id)
        else:
            self._ingredients.mark_unavailable(ingredient.id)
        self._changed(user, ingredient.session)

    def available_counts(self, session_key: str, diet: Diet) -> AvailableCounts:
        """Zero for a session that does not exist."""
        counts = self._ingredients.count_available(session_key, diet)
        fills = counts.get(IngredientType.FILL, (0, 0))
        sauces = counts.get(IngredientType.SAUCE, (0, 0))
        return AvailableCounts(fills=fills[0], sauces=sauces[0], total_fills=fills[1], total_sauces=sauces[1])

    def import_new(self, user: User, session: RaclottoSession, items: Sequence[CatalogItem]) -> list[Ingredient]:
        """Add every item as a new ingredient, whatever ``id`` and ``session_id`` it names."""
        created = self._ingredients.bulk_create([dict(item.fields) for item in items], session.id)
        self._changed(user, session)
        return created

    def reimport(self, user: User, session: RaclottoSession, items: Sequence[CatalogItem]) -> Reimported:
        """Make the session's catalog the list: update listed ids, create the rest, make the unlisted unavailable."""
        current_ids = {ingredient.id for ingredient in self._ingredients.by_session(session.key)}

        to_create: list[Fields] = []
        to_update: list[Fields] = []
        listed_ids = set()
        for index, item in enumerate(items):
            if item.session_id is not None and item.session_id != session.id:
                raise CatalogError(
                    CatalogError.OTHER_SESSION,
                    index,
                    f"ingredients[{index}] belongs to a different session. "
                    f"All ingredients must belong to session_id {session.id}",
                )
            if item.id is None:
                to_create.append(dict(item.fields))
                continue
            if item.id not in current_ids:
                raise CatalogError(
                    CatalogError.UNKNOWN_INGREDIENT,
                    index,
                    f"ingredients[{index}] with id {item.id} does not exist in this session",
                )
            to_update.append({"id": item.id, **item.fields})
            listed_ids.add(item.id)

        created = self._ingredients.bulk_create(to_create, session.id) if to_create else []
        updated = self._ingredients.bulk_update(to_update) if to_update else []
        unlisted = current_ids - listed_ids
        unavailable = self._ingredients.mark_unavailable_by_ids(list(unlisted)) if unlisted else 0
        self._changed(user, session)
        return Reimported(created=len(created), updated=len(updated), unavailable=unavailable)

    def _changed(self, user: User, session: RaclottoSession) -> None:
        self._achievements.record(CatalogChanged(session=session, actor=user))
