from back.src.driver.database import db
from back.src.entity.invite_token import InviteToken
from back.src.repository.base_repository import BaseRepository


class InviteTokenRepository(BaseRepository[InviteToken]):
    """Repository for InviteToken entities."""

    def __init__(self) -> None:
        super().__init__(InviteToken)

    def by_token(self, token: str) -> InviteToken | None:
        return db.session.query(InviteToken).filter_by(token=token).first()

    def by_creator(self, user_id: int) -> list[InviteToken]:
        return (
            db.session.query(InviteToken)
            .filter_by(created_by_user_id=user_id)
            .order_by(InviteToken.created_at.desc())
            .all()
        )
