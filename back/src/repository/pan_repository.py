from sqlalchemy.exc import NoResultFound

from back.src.driver.database import db
from back.src.entity.pan import Pan
from back.src.entity.raclotto_session import RaclottoSession
from back.src.repository.base_repository import BaseRepository


class PanRepository(BaseRepository[Pan]):
    """Repository for Pan entities."""

    def __init__(self) -> None:
        super().__init__(Pan)

    def by_session(self, session_key: str, limit: int | None = None, offset: int = 0) -> list[Pan]:
        """
        Get pans for a session with optional pagination.

        :param session_key: Session key
        :param limit: Optional limit on number of results
        :param offset: Offset for pagination (default: 0)
        :return: List of pans ordered by timestamp (descending, most recent first)
        """
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
        user_id: int | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> tuple[list[Pan], int]:
        """Pans matching every given filter, newest first, and how many match in total.

        An unknown session key matches nothing. Without a limit every pan from `offset` on is returned.
        """
        query = db.session.query(Pan)
        if session_key is not None:
            query = query.join(Pan.session).filter(RaclottoSession.key == session_key)
        if user_id is not None:
            query = query.filter(Pan.user_id == user_id)
        total = query.count()
        query = query.order_by(Pan.timestamp.desc(), Pan.id.desc()).offset(offset)
        if limit is not None:
            query = query.limit(limit)
        return query.all(), total

    def by_user(self, user_id: int, limit: int | None = None, offset: int = 0) -> list[Pan]:
        """
        Get pans for a user with optional pagination.

        :param user_id: User ID
        :param limit: Optional limit on number of results
        :param offset: Offset for pagination (default: 0)
        :return: List of pans ordered by timestamp (descending, most recent first)
        """
        query = db.session.query(Pan).filter_by(user_id=user_id).order_by(Pan.timestamp.desc())

        if offset > 0:
            query = query.offset(offset)

        if limit:
            query = query.limit(limit)

        return query.all()

    def get_recent_pans(self, session_key: str | None = None, limit: int = 10) -> list[Pan]:
        """
        Get the most recent pans, optionally filtered by session and limited by count.

        :param session_key: Optional session key to filter by
        :param limit: Maximum number of results to return (default: 10)
        :return: List of pans ordered by timestamp (descending, most recent first)
        """
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
