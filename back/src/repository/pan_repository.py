from collections.abc import Collection
from typing import Any, Literal

from sqlalchemy import ColumnElement, Integer, SQLColumnExpression, and_, cast, func, or_, select, true
from sqlalchemy.exc import NoResultFound

from back.src.driver.database import db
from back.src.entity.pan import Pan, pan_ingredients
from back.src.entity.raclotto_session import RaclottoSession
from back.src.repository.base_repository import BaseRepository

PanOrder = Literal["timestamp", "rating", "ingredient_count"]


def _between(value: ColumnElement[int], low: int | None, high: int | None) -> ColumnElement[bool]:
    bounds = [value >= low] if low is not None else []
    if high is not None:
        bounds.append(value <= high)
    return and_(true(), *bounds)


class PanRepository(BaseRepository[Pan]):
    """Repository for Pan entities."""

    def __init__(self) -> None:
        super().__init__(Pan)

    def by_session(self, session_key: str, limit: int | None = None, offset: int = 0) -> list[Pan]:
        try:
            session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
            query = db.session.query(Pan).filter_by(session_id=session.id).order_by(Pan.timestamp.desc())

            if offset > 0:
                query = query.offset(offset)

            if limit:
                query = query.limit(limit)

            return query.all()
        except NoResultFound:
            return []

    def page(
        self,
        session_key: str | None = None,
        user_ids: Collection[int] = (),
        rating_tenths: Collection[int] = (),
        ingredient_counts: Collection[tuple[int | None, int | None]] = (),
        order: PanOrder = "timestamp",
        descending: bool = True,
        limit: int | None = None,
        offset: int = 0,
    ) -> tuple[list[Pan], int]:
        """Pans matching every given filter in `order`, ties newest first, and how many match in total.

        A collection filter matches any of its values and is skipped when empty: `rating_tenths` are average
        ratings (0 when unrated) times ten, rounded half up; `ingredient_counts` are inclusive bounds, `None`
        open. An unknown session key matches nothing. Without a limit every pan from `offset` on is returned.
        """
        rating = func.coalesce(Pan.rating, 0)
        ingredient_count = (
            select(func.count()).where(pan_ingredients.c.pan_id == Pan.id).correlate(Pan).scalar_subquery()
        )
        query = db.session.query(Pan)
        if session_key is not None:
            query = query.join(Pan.session).filter(RaclottoSession.key == session_key)
        if user_ids:
            query = query.filter(Pan.user_id.in_(user_ids))
        if rating_tenths:
            # CAST truncates, so adding a half rounds a positive value half up.
            query = query.filter(cast(rating * 10 + 0.5, Integer).in_(rating_tenths))
        if ingredient_counts:
            query = query.filter(or_(*(_between(ingredient_count, low, high) for low, high in ingredient_counts)))
        total = query.count()

        columns: dict[PanOrder, SQLColumnExpression[Any]] = {
            "timestamp": Pan.timestamp,
            "rating": rating,
            "ingredient_count": ingredient_count,
        }
        primary = columns[order]
        query = query.order_by(primary.desc() if descending else primary.asc(), Pan.timestamp.desc(), Pan.id.desc())
        query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        return query.all(), total

    def by_user(self, user_id: int, limit: int | None = None, offset: int = 0) -> list[Pan]:
        query = db.session.query(Pan).filter_by(user_id=user_id).order_by(Pan.timestamp.desc())

        if offset > 0:
            query = query.offset(offset)

        if limit:
            query = query.limit(limit)

        return query.all()

    def latest_of_user(self, session_id: int, user_id: int, limit: int) -> list[Pan]:
        """The user's newest pans in the session, newest first."""
        return (
            db.session.query(Pan)
            .filter(Pan.session_id == session_id, Pan.user_id == user_id)
            .order_by(Pan.timestamp.desc(), Pan.id.desc())
            .limit(limit)
            .all()
        )

    def get_recent_pans(self, session_key: str | None = None, limit: int = 10) -> list[Pan]:
        """Get the most recent pans, optionally filtered by session and limited by count."""
        query = db.session.query(Pan)

        if session_key:
            try:
                session = db.session.query(RaclottoSession).filter_by(key=session_key).one()
                query = query.filter(Pan.session_id == session.id)
            except NoResultFound:
                return []

        query = query.order_by(Pan.timestamp.desc())

        if limit:
            query = query.limit(limit)

        return query.all()
