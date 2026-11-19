from collections.abc import Iterable

from back.src.driver.database import db
from back.src.entity.user import User
from back.src.repository.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User entities."""

    def __init__(self) -> None:
        super().__init__(User)

    def by_email(self, email: str) -> User | None:
        """
        Get user by email.

        :param email: User email
        :return: User instance or None if not found
        """
        return db.session.query(User).filter_by(email=email).first()

    def by_name(self, name: str) -> User | None:
        """
        Get user by name.

        :param name: User name
        :return: User instance or None if not found
        """
        return db.session.query(User).filter_by(name=name).first()

    def by_ids(self, ids: Iterable[int]) -> dict[int, User]:
        """The users with these ids, loaded together and keyed by id; unknown ids are left out."""
        wanted = set(ids)
        if not wanted:
            return {}
        return {user.id: user for user in db.session.query(User).filter(User.id.in_(wanted))}

    def by_email_or_name(self, identifier: str) -> User | None:
        """
        Get user by email or name.

        :param identifier: Email or name
        :return: User instance or None if not found
        """
        user = self.by_email(identifier)
        if user:
            return user
        return self.by_name(identifier)

    def get_users_in_session(self, session_id: int) -> set[int]:
        """
        Get set of user IDs in a session.

        :param session_id: Session ID
        :return: Set of user IDs
        """
        from back.src.entity.user import user_sessions

        return {
            row[0] for row in db.session.query(user_sessions.c.user_id).filter(user_sessions.c.session_id == session_id)
        }
