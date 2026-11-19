"""Pan history: the pans of a session or a user, sorted and filtered as a whole and served a page at a time,
and the values a session's pans offer to filter them by.

A pan's rating is the average of its ratings, 0 when it has none; a rating filter matches it rounded half up
to one decimal. Ties in any sort go to the newer pan.
"""

import math
from collections.abc import Collection
from dataclasses import dataclass
from typing import Literal

from back.src.entity.pan import Pan
from back.src.entity.user import User
from back.src.repository.pan_repository import PanOrder, PanRepository
from back.src.repository.user_repository import UserRepository

PanSort = Literal["time", "rating", "counts"]
SortDirection = Literal["asc", "desc"]
IngredientCountRange = Literal["1-3", "4-6", "7-9", "10+"]

# Inclusive bounds of each range's ingredient count; `None` is open.
_RANGE_BOUNDS: dict[IngredientCountRange, tuple[int | None, int | None]] = {
    "1-3": (None, 3),
    "4-6": (4, 6),
    "7-9": (7, 9),
    "10+": (10, None),
}

_ORDERS: dict[PanSort, PanOrder] = {"time": "timestamp", "rating": "rating", "counts": "ingredient_count"}


def _count_range(count: int) -> IngredientCountRange:
    return next(name for name, (_, high) in _RANGE_BOUNDS.items() if high is None or count <= high)


def _tenths(rating: float) -> int:
    return math.floor(rating * 10 + 0.5)


@dataclass(frozen=True)
class PanFilter:
    session_key: str | None = None
    # Each filter matches a pan by any of its values; an empty one matches every pan.
    user_ids: Collection[int] = ()
    ratings: Collection[float] = ()
    ingredient_counts: Collection[IngredientCountRange] = ()


@dataclass(frozen=True)
class FilterOptions:
    authors: list[User]
    # Rounded to one decimal, best first; unrated pans offer none.
    ratings: list[float]
    ingredient_counts: list[IngredientCountRange]


class PanHistory:
    def __init__(self, pans: PanRepository | None = None, users: UserRepository | None = None):
        self._pans = pans or PanRepository()
        self._users = users or UserRepository()

    def page(
        self,
        pan_filter: PanFilter,
        sort: PanSort = "time",
        direction: SortDirection = "desc",
        limit: int | None = None,
        offset: int = 0,
    ) -> tuple[list[Pan], int]:
        """One page of the matching pans in order, and how many match in total."""
        return self._pans.page(
            session_key=pan_filter.session_key,
            user_ids=pan_filter.user_ids,
            rating_tenths={_tenths(rating) for rating in pan_filter.ratings},
            ingredient_counts=[_RANGE_BOUNDS[name] for name in pan_filter.ingredient_counts],
            order=_ORDERS[sort],
            descending=direction == "desc",
            limit=limit,
            offset=offset,
        )

    def filter_options(self, session_key: str) -> FilterOptions:
        """The authors, ratings and ingredient count ranges of the session's pans; an unknown session has none."""
        pans = self._pans.by_session(session_key)
        authors = self._users.by_ids(pan.user_id for pan in pans)
        tenths = {_tenths(pan.rating) for pan in pans} - {0}
        counts = {_count_range(len(pan.ingredients)) for pan in pans}
        return FilterOptions(
            authors=sorted(authors.values(), key=lambda user: (user.name.casefold(), user.id)),
            ratings=[tenth / 10 for tenth in sorted(tenths, reverse=True)],
            ingredient_counts=[name for name in _RANGE_BOUNDS if name in counts],
        )
