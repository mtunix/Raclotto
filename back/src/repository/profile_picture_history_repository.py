from typing import List, Optional

from back.src.driver.database import db
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.entity.user import User
from back.src.repository.base_repository import BaseRepository


class ProfilePictureHistoryRepository(BaseRepository[ProfilePictureHistory]):
    """Repository for ProfilePictureHistory entities."""

    def __init__(self) -> None:
        super().__init__(ProfilePictureHistory)

    def by_user_id(self, user_id: int) -> List[ProfilePictureHistory]:
        """
        Get all profile picture history entries for a user, ordered by created_at descending.

        :param user_id: User ID
        :return: List of ProfilePictureHistory instances
        """
        return (
            db.session.query(ProfilePictureHistory)
            .filter_by(user_id=user_id)
            .order_by(ProfilePictureHistory.created_at.desc())
            .all()
        )

    def get_latest_by_user_id(self, user_id: int) -> Optional[ProfilePictureHistory]:
        """
        Get the most recent profile picture for a user.

        :param user_id: User ID
        :return: ProfilePictureHistory instance or None if not found
        """
        return (
            db.session.query(ProfilePictureHistory)
            .filter_by(user_id=user_id)
            .order_by(ProfilePictureHistory.created_at.desc())
            .first()
        )

    def has_marked_candidate(self, user_id: int) -> bool:
        return db.session.query(ProfilePictureHistory).filter_by(user_id=user_id, is_candidate=True).first() is not None

    def add_profile_picture(
        self, user_id: int, profile_picture_url: Optional[str], level_id: Optional[int], is_candidate: bool
    ) -> ProfilePictureHistory:
        """Add a picture to the user's history. The caller commits."""
        history_entry = ProfilePictureHistory(
            user_id=user_id,
            profile_picture=profile_picture_url,
            level_id=level_id,
            is_candidate=is_candidate,
        )
        db.session.add(history_entry)
        db.session.flush()
        # A user loaded before sees the new picture only once its history is read again.
        user = db.session.get(User, user_id)
        if user is not None:
            db.session.expire(user, ["profile_picture_history"])
        return history_entry

    def get_candidate_by_user_id(self, user_id: int) -> Optional[ProfilePictureHistory]:
        """
        Get the candidate profile picture (marked for generation context) for a user.
        Falls back to the first/oldest picture if no candidate is marked.

        :param user_id: User ID
        :return: ProfilePictureHistory instance or None if no pictures exist
        """
        # First try to get the picture marked as candidate
        candidate = (
            db.session.query(ProfilePictureHistory)
            .filter_by(user_id=user_id, is_candidate=True)
            .first()
        )

        if candidate:
            return candidate

        # Fallback to the first (oldest) picture
        return (
            db.session.query(ProfilePictureHistory)
            .filter_by(user_id=user_id)
            .order_by(ProfilePictureHistory.created_at.asc())
            .first()
        )

    def set_candidate(self, picture: ProfilePictureHistory) -> None:
        """Make ``picture`` its user's only candidate for generation context."""
        db.session.query(ProfilePictureHistory).filter_by(user_id=picture.user_id).update({"is_candidate": False})
        picture.is_candidate = True
        db.session.flush()
