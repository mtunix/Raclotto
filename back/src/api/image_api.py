import base64
import logging

from flask import request

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.api.constants import JSONAPI_VERSION
from back.src.auth.middleware import get_current_user, require_auth
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
