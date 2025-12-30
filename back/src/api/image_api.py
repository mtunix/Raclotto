import base64
import logging
from typing import Optional, cast

from flask import request

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.api.constants import JSONAPI_VERSION
from back.src.auth.middleware import get_current_user, require_auth
from back.src.driver.database import db
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.repository.profile_picture_history_repository import (
    ProfilePictureHistoryRepository,
)

logger = logging.getLogger(__name__)


class ImageApi(BaseApi):
    url_prefix = "/images"

    def __init__(self):
        super().__init__()
        self._init_gemini_client()
        self.profile_picture_repository = ProfilePictureHistoryRepository()

    def _init_gemini_client(self):
        """Initialize Google Gemini client."""
        try:
            import os

            import google.genai as genai

            api_key = os.getenv("GOOGLE_GENAI_API_KEY")
            if not api_key:
                logger.warning("GOOGLE_GENAI_API_KEY environment variable not set")
                self.client = None
            else:
                self.client = genai.Client(api_key=api_key)
        except ImportError:
            logger.error("google-genai package not installed")
            self.client = None

    def generate_profile_picture_for_user(
        self, user_id: int, level_id: Optional[int] = None
    ) -> bool:
        """Generate a profile picture for a user and save it to their history.

        This method can be called internally without HTTP context, for example
        when a user levels up in the LevelService.

        :param user_id: User ID to generate picture for
        :param level_id: Optional level ID to associate with the picture
        :return: True if successful, False otherwise
        """
        if not self.client:
            logger.error(
                "Gemini client not configured, cannot generate profile picture"
            )
            return False

        try:
            from back.src.repository.user_repository import UserRepository

            user_repository = UserRepository()
            user = user_repository.by_id(user_id)

            if not user:
                logger.error(f"User with ID {user_id} not found")
                return False

            # Create a prompt based on user's level
            prompt = self._generate_prompt_for_user(user, level_id)

            logger.info(
                f"Generating profile picture with prompt: {prompt[:50]}... for user {user_id}"
            )

            # Get the candidate profile picture as context for Gemini
            # Falls back to first/oldest picture if no candidate is marked
            latest_picture = self.profile_picture_repository.get_candidate_by_user_id(
                user_id
            )

            # Build contents list for Gemini API call
            contents: list = [prompt]
            if latest_picture is not None:
                picture_url = cast(Optional[str], latest_picture.profile_picture)
                if picture_url:
                    try:
                        # Extract base64 from data URL if needed
                        if picture_url.startswith("data:image/"):
                            # Extract base64 from data URL format
                            base64_str = picture_url.split(",", 1)[1]
                        else:
                            base64_str = picture_url

                        # Add the existing picture to the request so Gemini can use it as reference
                        contents.append(
                            {
                                "inline_data": {
                                    "mime_type": "image/png",
                                    "data": base64_str,
                                }
                            }
                        )
                        logger.info(
                            f"Including existing profile picture as context for user {user_id}"
                        )
                    except Exception as e:
                        logger.warning(
                            f"Could not include existing picture as context: {e}"
                        )

            # Call Gemini API to generate image
            response = self.client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=contents,
            )

            image_base64 = None

            # Process response parts
            if response and response.parts:
                for part in response.parts:
                    if part.inline_data is not None:
                        try:
                            image = part.as_image()
                            if (
                                image
                                and hasattr(image, "image_bytes")
                                and image.image_bytes
                            ):
                                image_base64 = base64.b64encode(
                                    image.image_bytes
                                ).decode("utf-8")
                                break
                        except Exception as e:
                            logger.error(f"Failed to process image from response: {e}")
                            continue

            if not image_base64:
                logger.error(f"No valid image generated for user {user_id}")
                return False

            # Convert base64 to data URL for storage
            image_data_url = f"data:image/png;base64,{image_base64}"

            # Use level_id from parameter or user's current level
            picture_level_id: Optional[int] = (
                level_id if level_id is not None else cast(Optional[int], user.level_id)
            )

            # Save the generated image to the user's profile picture history
            try:
                profile_picture_entry = (
                    self.profile_picture_repository.add_profile_picture(
                        user_id=user_id,
                        profile_picture_url=image_data_url,
                        level_id=picture_level_id,
                    )
                )
                logger.info(
                    f"Profile picture generated for user {user_id}, entry id: {profile_picture_entry.id}, level_id: {picture_level_id}"
                )
                return True
            except Exception as e:
                logger.error(f"Failed to save profile picture to history: {e}")
                return False

        except Exception as e:
            logger.error(f"Profile picture generation error: {e}", exc_info=True)
            return False

    def _generate_prompt_for_user(self, user, level_id: Optional[int] = None) -> str:
        """Generate an appropriate prompt for profile picture generation based on user's level.

        :param user: User entity
        :param level_id: Optional level ID to use in prompt (defaults to user's current level)
        :return: Prompt string for image generation
        """
        from back.src.repository.level_repository import LevelRepository

        level_repo = LevelRepository()

        # Use provided level_id or user's current level
        actual_level_id: Optional[int] = (
            level_id if level_id is not None else cast(Optional[int], user.level_id)
        )
        level = level_repo.by_id(actual_level_id) if actual_level_id else None
        if not level:
            raise ValueError

        # Get localized level label based on user's language preference
        user_language = getattr(user, "language", "en").lower()
        if user_language == "de":
            level_label = level.label_de
        else:
            level_label = level.label_en

        # Build base prompt with localized level label
        prompt = f"adjust the picture to show the original person which has now achieved the rank {level_label} which corresponds to rank {level.id} of 20 of the progression in raclotto. Please be a little bit over the top and unhinged. Raclotto is a combination of raclette and lotto. Make sure to include the {level_label} in the picture as best as possible. Please keep in mind that the image should be suitable to be displayed in a circular format as an avatar."
        return prompt

    @BaseApi.endpoint("/profile-picture-history/<int:user_id>", ["GET"])
    @require_auth
    def get_profile_picture_history(self, user_id: int):
        """Get all profile picture history entries for a user.

        :param user_id: User ID
        :returns: List of profile picture entries with timestamps and level info
        :status_code 200: Success
        :status_code 404: User not found
        :status_code 401: Not authenticated
        """
        from back.src.repository.user_repository import UserRepository

        user_repository = UserRepository()
        user = user_repository.by_id(user_id)

        if not user:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="User not found",
                detail=f"User with ID {user_id} does not exist",
            )

        history_entries = self.profile_picture_repository.by_user_id(user_id)

        from datetime import datetime

        history_data = [
            {
                "id": entry.id,
                "profile_picture": entry.profile_picture,
                "created_at": entry.created_at.isoformat()
                if isinstance(entry.created_at, datetime)
                else None,
                "level_id": entry.level_id,
                "level_name": entry.level.name if entry.level else None,
                "is_candidate": entry.is_candidate,
            }
            for entry in history_entries
        ]

        return {
            "jsonapi": {"version": JSONAPI_VERSION},
            "data": {
                "type": "profile_picture_history",
                "attributes": {
                    "history": history_data,
                    "total_count": len(history_data),
                    "user_id": user_id,
                    "user_name": user.name,
                },
            },
        }, 200

    @BaseApi.endpoint("/generate-banana", ["POST"])
    @require_auth
    def generate_banana_image(self):
        """Generate a banana dish image using Google Gemini and save it to user's profile.

        :returns: Base64 encoded image data and confirmation of profile picture update
        :status_code 200: Success
        :status_code 400: Missing prompt or API not configured
        :status_code 401: Not authenticated
        :status_code 500: Generation failed
        """
        if not self.client:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=500,
                title="Image generation unavailable",
                detail="Google Gemini API is not properly configured",
            )

        try:
            data = request.get_json()
            if not data or "prompt" not in data:
                raise ApiError(
                    ApiErrorCode.missing_required_body_field,
                    status=400,
                    title="Missing required field",
                    detail="'prompt' field is required in request body",
                )

            prompt = data.get("prompt", "")

            if not prompt or not isinstance(prompt, str):
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Invalid prompt",
                    detail="'prompt' must be a non-empty string",
                )

            # Get the current authenticated user
            current_user = get_current_user()
            if not current_user:
                raise ApiError(
                    ApiErrorCode.invalid_token,
                    status=401,
                    title="User not found",
                    detail="Could not identify the current user",
                )

            logger.info(
                f"Generating image with prompt: {prompt[:50]}... for user {current_user.id}"
            )

            # Call Gemini API to generate image
            response = self.client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[prompt],
            )

            image_base64 = None

            # Process response parts
            if response and response.parts:
                for part in response.parts:
                    if part.inline_data is not None:
                        try:
                            image = part.as_image()
                            if (
                                image
                                and hasattr(image, "image_bytes")
                                and image.image_bytes
                            ):
                                image_base64 = base64.b64encode(
                                    image.image_bytes
                                ).decode("utf-8")
                                break
                        except Exception as e:
                            logger.error(f"Failed to process image from response: {e}")
                            continue

            if not image_base64:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=500,
                    title="No image generated",
                    detail="Gemini API did not return a valid image",
                )

            # Convert base64 to data URL for storage
            image_data_url = f"data:image/png;base64,{image_base64}"

            # Save the generated image to the user's profile picture history
            try:
                profile_picture_entry = (
                    self.profile_picture_repository.add_profile_picture(
                        user_id=current_user.id,
                        profile_picture_url=image_data_url,
                        level_id=current_user.level_id,
                    )
                )
                logger.info(
                    f"Profile picture updated for user {current_user.id}, entry id: {profile_picture_entry.id}"
                )
            except Exception as e:
                logger.error(f"Failed to save profile picture to history: {e}")
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=500,
                    title="Failed to save profile picture",
                    detail=f"Profile picture was generated but could not be saved: {str(e)}",
                )

            return {
                "jsonapi": {"version": JSONAPI_VERSION},
                "data": {
                    "type": "image",
                    "attributes": {
                        "imageBase64": image_base64,
                        "format": "png",
                        "profilePictureUpdated": True,
                        "userId": current_user.id,
                    },
                },
            }, 200

        except ApiError:
            raise
        except Exception as e:
            logger.error(f"Image generation error: {e}", exc_info=True)
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=500,
                title="Image generation failed",
                detail=str(e),
            )

    @BaseApi.endpoint("/generate-profile-picture", ["POST"])
    @require_auth
    def generate_profile_picture(self):
        """Generate a new profile picture for the current user after leveling up.

        This endpoint is called from the frontend when a level-up has occurred
        and the PanResultModal is about to close.

        Request body (optional):
        - level_id: Optional level ID to associate with the picture. If not provided, uses current user level.

        :returns: Base64 encoded image data for the newly generated profile picture
        :status_code 200: Success
        :status_code 400: API not configured
        :status_code 401: Not authenticated
        :status_code 500: Generation failed
        """
        if not self.client:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=500,
                title="Image generation unavailable",
                detail="Google Gemini API is not properly configured",
            )

        try:
            # Get the current authenticated user
            current_user = get_current_user()
            if not current_user:
                raise ApiError(
                    ApiErrorCode.invalid_token,
                    status=401,
                    title="User not found",
                    detail="Could not identify the current user",
                )

            # Get optional level_id from request body
            data = request.get_json() or {}
            level_id = data.get("level_id")

            logger.info(
                f"Generating profile picture for user {current_user.id} (level_id: {level_id})"
            )

            # Use the internal method to generate the picture
            success = self.generate_profile_picture_for_user(
                user_id=cast(int, current_user.id),
                level_id=level_id,
            )

            if not success:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=500,
                    title="Profile picture generation failed",
                    detail="Failed to generate profile picture. Please try again.",
                )

            # Fetch the newly created profile picture from history to return it
            latest_picture = self.profile_picture_repository.get_latest_by_user_id(
                cast(int, current_user.id)
            )

            if latest_picture is None:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=500,
                    title="Profile picture not found",
                    detail="Profile picture was generated but could not be retrieved.",
                )

            # Extract base64 from data URL
            picture_url = cast(Optional[str], latest_picture.profile_picture)
            if picture_url is None:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=500,
                    title="Profile picture not found",
                    detail="Profile picture URL is empty.",
                )

            if picture_url.startswith("data:image/"):  # type: ignore
                image_base64 = picture_url.split(",", 1)[1]  # type: ignore
            else:
                image_base64 = picture_url

            created_at_iso = None
            created_at = cast(Optional[object], latest_picture.created_at)
            if created_at is not None and hasattr(created_at, "isoformat"):
                created_at_iso = created_at.isoformat()  # type: ignore

            return {
                "jsonapi": {"version": JSONAPI_VERSION},
                "data": {
                    "type": "profile_picture",
                    "attributes": {
                        "imageBase64": image_base64,
                        "format": "png",
                        "userId": cast(int, current_user.id),
                        "levelId": latest_picture.level_id,
                        "createdAt": created_at_iso,
                    },
                },
            }, 200

        except ApiError:
            raise
        except Exception as e:
            logger.error(f"Profile picture generation error: {e}", exc_info=True)
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=500,
                title="Profile picture generation failed",
                detail=str(e),
            )

    @BaseApi.endpoint("/set-candidate-picture/<int:picture_id>", ["POST"])
    @require_auth
    def set_candidate_picture(self, picture_id: int):
        """Set a profile picture as the candidate for generation context.

        Only the picture owner can set this.

        :param picture_id: Profile picture ID to mark as candidate
        :returns: Confirmation message
        :status_code 200: Success
        :status_code 401: Not authenticated
        :status_code 403: Not owner of picture
        :status_code 404: Picture not found
        :status_code 500: Operation failed
        """
        try:
            current_user = get_current_user()
            if not current_user:
                raise ApiError(
                    ApiErrorCode.invalid_token,
                    status=401,
                    title="User not found",
                    detail="Could not identify the current user",
                )

            picture = (
                db.session.query(ProfilePictureHistory).filter_by(id=picture_id).first()
            )

            if not picture:
                raise ApiError(
                    ApiErrorCode.resource_not_found,
                    status=404,
                    title="Picture not found",
                    detail="The specified picture does not exist",
                )

            if cast(int, picture.user_id) != cast(int, current_user.id):
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=403,
                    title="Forbidden",
                    detail="You can only set your own pictures as candidates",
                )

            success = self.profile_picture_repository.set_candidate(picture_id)

            if not success:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=500,
                    title="Operation failed",
                    detail="Failed to set picture as candidate",
                )

            logger.info(
                f"User {cast(int, current_user.id)} set picture {picture_id} as generation candidate"
            )

            return {
                "jsonapi": {"version": JSONAPI_VERSION},
                "data": {
                    "type": "profile_picture",
                    "attributes": {
                        "pictureId": picture_id,
                        "candidateSet": True,
                    },
                },
            }, 200

        except ApiError:
            raise
        except Exception as e:
            logger.error(f"Error setting candidate picture: {e}", exc_info=True)
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=500,
                title="Operation failed",
                detail=str(e),
            )
