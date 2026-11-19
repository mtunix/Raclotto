from back.src.driver.database import db
from back.src.entity.preparation_type import PreparationType
from back.src.repository.base_repository import BaseRepository


class PreparationTypeRepository(BaseRepository[PreparationType]):
    """Repository for PreparationType entities."""

    def __init__(self) -> None:
        super().__init__(PreparationType)

    def by_session(self, session_id: int) -> list[PreparationType]:
        """
        Get preparation types for a session (including defaults where session_id is null).

        :param session_id: Session ID
        :return: List of preparation types
        """
        return (
            db.session.query(PreparationType)
            .filter((PreparationType.session_id == session_id) | (PreparationType.session_id.is_(None)))
            .all()
        )

    def defaults(self) -> list[PreparationType]:
        """
        Get default/system-wide preparation types (where session_id is null).

        :return: List of default preparation types
        """
        return db.session.query(PreparationType).filter(PreparationType.session_id.is_(None)).all()

    def default_types(self) -> list[PreparationType]:
        """
        Alias for defaults() method for backward compatibility.

        :return: List of default preparation types
        """
        return self.defaults()
