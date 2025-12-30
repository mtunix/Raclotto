from typing import List, Optional

from back.src.driver.database import db
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.repository.base_repository import BaseRepository


class ProfilePictureHistoryRepository(BaseRepository[ProfilePictureHistory]):
    """Repository for ProfilePictureHistory entities."""

    def __init__(self):
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

    def add_profile_picture(
        self, user_id: int, profile_picture_url: str, level_id: Optional[int] = None
    ) -> ProfilePictureHistory:
        """
        Add a new profile picture to the user's history.

        If no candidate picture exists for this user, the new picture is automatically
        set as the candidate for generation context.

        :param user_id: User ID
        :param profile_picture_url: URL or path to the profile picture
        :param level_id: Optional level ID at the time the picture was added
        :return: Created ProfilePictureHistory instance
        """
        # Check if user already has a candidate picture
        existing_candidate = (
            db.session.query(ProfilePictureHistory)
            .filter_by(user_id=user_id, is_candidate=True)
            .first()
        )

        # If no candidate exists, mark this new picture as candidate
        is_candidate = existing_candidate is None

        history_entry = ProfilePictureHistory(
            user_id=user_id,
            profile_picture=profile_picture_url,
            level_id=level_id,
            is_candidate=is_candidate,
        )
        db.session.add(history_entry)
        db.session.commit()
        return history_entry

    def get_by_level(
        self, user_id: int, level_id: int
    ) -> Optional[ProfilePictureHistory]:
        """
        Get the profile picture a user had at a specific level.

        :param user_id: User ID
        :param level_id: Level ID
        :return: ProfilePictureHistory instance or None if not found
        """
        return (
            db.session.query(ProfilePictureHistory)
            .filter_by(user_id=user_id, level_id=level_id)
            .first()
        )

    def count_by_user_id(self, user_id: int) -> int:
        """
        Get the number of profile pictures in a user's history.

        :param user_id: User ID
        :return: Count of profile pictures
        """
        return (
            db.session.query(ProfilePictureHistory).filter_by(user_id=user_id).count()
        )

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

    def set_candidate(self, picture_id: int) -> bool:
        """
        Set a profile picture as the candidate for generation context.
        Unmarks any previous candidate for the same user.

        :param picture_id: Picture ID to mark as candidate
        :return: True if successful, False otherwise
        """
        try:
            # Get the picture to find its user_id
            picture = (
                db.session.query(ProfilePictureHistory).filter_by(id=picture_id).first()
            )
            if not picture:
                return False

            # Unmark all other pictures for this user
            db.session.query(ProfilePictureHistory).filter_by(
                user_id=picture.user_id
            ).update({"is_candidate": False})

            # Mark this picture as candidate
            picture.is_candidate = True
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            return False
