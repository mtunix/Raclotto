from back.src.driver.database import db
from back.src.entity.invite_token import InviteToken
from back.src.repository.base_repository import BaseRepository


class InviteTokenRepository(BaseRepository[InviteToken]):
    """Repository for InviteToken entities."""

    def __init__(self) -> None:
        super().__init__(InviteToken)

    def by_token(self, token: str) -> InviteToken | None:
        """
        Get invite token by token string.

        :param token: Token string
        :return: InviteToken instance or None if not found
        """
        return db.session.query(InviteToken).filter_by(token=token).first()

    def by_creator(self, user_id: int) -> list[InviteToken]:
        """
        Get all invite tokens created by a user.

        :param user_id: User ID who created the tokens
        :return: List of invite tokens
        """
        return (
            db.session.query(InviteToken)
            .filter_by(created_by_user_id=user_id)
            .order_by(InviteToken.created_at.desc())
            .all()
        )
