from back.src.driver.database import db
from back.src.entity.level import Level
from back.src.repository.base_repository import BaseRepository


class LevelRepository(BaseRepository[Level]):
    """Repository for Level entities."""

    def __init__(self) -> None:
        super().__init__(Level)

    def by_experience(self, experience_points: int) -> Level | None:
        """Get the highest level that the user has achieved based on experience points."""
        # Get the highest level where required_experience <= experience_points
        return (
            db.session.query(Level)
            .filter(Level.required_experience <= experience_points)
            .order_by(Level.required_experience.desc())
            .first()
        )

    def all_ordered(self) -> list[Level]:
        """Get all levels ordered by required_experience ascending."""
        return db.session.query(Level).order_by(Level.required_experience.asc()).all()

    def next_level(self, current_level: Level) -> Level | None:
        return (
            db.session.query(Level)
            .filter(Level.required_experience > current_level.required_experience)
            .order_by(Level.required_experience.asc())
            .first()
        )
