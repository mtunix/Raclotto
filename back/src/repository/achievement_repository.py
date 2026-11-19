from sqlalchemy import func

from back.src.driver.database import db
from back.src.entity.achievement import Achievement
from back.src.entity.user import User, user_achievements
from back.src.repository.base_repository import BaseRepository


class AchievementRepository(BaseRepository[Achievement]):
    """Repository for Achievement entities (public read-only)."""

    def __init__(self) -> None:
        super().__init__(Achievement)

    def by_title(self, title: str | None) -> Achievement | None:
        """
        Find achievement by title.

        :param title: Achievement title
        :return: Achievement instance or None if not found
        """
        return db.session.query(Achievement).filter_by(title=title).first()

    def standings(self) -> list[tuple[int, str, int, int]]:
        """(user_id, name, total_points, achievement_count) of every user, most points first, then by name."""
        points = (
            db.session.query(
                user_achievements.c.user_id,
                func.sum(Achievement.value).label("total_points"),
                func.count(Achievement.id).label("achievement_count"),
            )
            .join(Achievement, Achievement.id == user_achievements.c.achievement_id)
            .group_by(user_achievements.c.user_id)
            .subquery()
        )
        total_points = func.coalesce(points.c.total_points, 0)
        rows = (
            db.session.query(User.id, User.name, total_points, func.coalesce(points.c.achievement_count, 0))
            .outerjoin(points, User.id == points.c.user_id)
            .order_by(total_points.desc(), User.name.asc())
            .all()
        )
        return [(user_id, name, int(total or 0), int(count or 0)) for user_id, name, total, count in rows]
