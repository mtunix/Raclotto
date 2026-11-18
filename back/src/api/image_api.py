import base64
import logging
import os
from typing import Any, Optional, Protocol

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import get_current_user, require_auth
from back.src.driver.database import db
from back.src.dto.profile_picture import (
    GeneratedPictureDto,
    GenerateImageBody,
    GenerateProfilePictureBody,
    ProfilePictureDto,
)
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.entity.user import User
from back.src.repository.profile_picture_history_repository import (
    ProfilePictureHistoryRepository,
)

logger = logging.getLogger(__name__)

# Generated pictures are stored and returned as PNG.
_MIME_TYPE = "image/png"


class ImageGenerator(Protocol):
    @property
    def available(self) -> bool:
        """Whether the generator is configured; the endpoints answer 500 when it is not."""
        ...

    # `contents` holds google-genai content parts; the SDK is an optional import.
    def generate(self, contents: list[Any]) -> Optional[str]:
        """The first image generated for `contents` (the prompt, then reference pictures), base64-encoded."""
        ...


class GeminiImageGenerator:
    """Google Gemini's image model; unavailable without an API key or the google-genai package."""

    def __init__(self, api_key: Optional[str]):
        self.client = None
        try:
            import google.genai as genai
        except ImportError:
            logger.error("google-genai package not installed")
            return
        if not api_key:
            logger.warning("GOOGLE_GENAI_API_KEY environment variable not set")
            return
        self.client = genai.Client(api_key=api_key)

    @property
    def available(self) -> bool:
        return self.client is not None

    def generate(self, contents: list[Any]) -> Optional[str]:
        assert self.client is not None  # callers check `available` first
        response = self.client.models.generate_content(
            model="gemini-2.5-flash-image",
            contents=contents,
        )
        if response and response.parts:
            for part in response.parts:
                if part.inline_data is not None:
                    try:
                        image = part.as_image()
                        if image and hasattr(image, "image_bytes") and image.image_bytes:
                            return base64.b64encode(image.image_bytes).decode("utf-8")
                    except Exception as e:
                        logger.error(f"Failed to process image from response: {e}")
                        continue
        return None


_generator: Optional[ImageGenerator] = None


def image_generator() -> ImageGenerator:
    """What the endpoints generate with: Gemini with GOOGLE_GENAI_API_KEY, unless `set_image_generator` replaced it."""
    global _generator
    if _generator is None:
        _generator = GeminiImageGenerator(os.getenv("GOOGLE_GENAI_API_KEY"))
    return _generator


def set_image_generator(generator: Optional[ImageGenerator]) -> Optional[ImageGenerator]:
    """Replace the generator (tests); None goes back to Gemini. Returns the previous one."""
    global _generator
    previous, _generator = _generator, generator
    return previous


def _unavailable() -> ApiError:
    return ApiError(
        ApiErrorCode.incorrect_parameters,
        status=500,
        title="Image generation unavailable",
        detail="Google Gemini API is not properly configured",
    )


def _base64_of(picture_url: str) -> str:
    return picture_url.split(",", 1)[1] if picture_url.startswith("data:image/") else picture_url


def _generated(entry: ProfilePictureHistory, image_base64: str) -> GeneratedPictureDto:
    return GeneratedPictureDto(
        id=entry.id,
        image_base64=image_base64,
        mime_type=_MIME_TYPE,
        level_id=entry.level_id,
        created_at=entry.created_at,
    )


class ImageApi(BaseApi):
    url_prefix = "/images"

    def __init__(self) -> None:
        super().__init__()
        # Built here so a missing key is logged at startup.
        image_generator()
        self.profile_picture_repository = ProfilePictureHistoryRepository()

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
        generator = image_generator()
        if not generator.available:
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
            contents: list[Any] = [prompt]
            if latest_picture is not None:
                picture_url = latest_picture.profile_picture
                if picture_url:
                    try:
                        # Add the existing picture to the request so Gemini can use it as reference
                        contents.append(
                            {
                                "inline_data": {
                                    "mime_type": _MIME_TYPE,
                                    "data": _base64_of(picture_url),
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

            image_base64 = generator.generate(contents)

            if not image_base64:
                logger.error(f"No valid image generated for user {user_id}")
                return False

            # Convert base64 to data URL for storage
            image_data_url = f"data:{_MIME_TYPE};base64,{image_base64}"

            # Use level_id from parameter or user's current level
            picture_level_id: Optional[int] = (
                level_id if level_id is not None else user.level_id
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
                db.session.commit()
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

    def _generate_prompt_for_user(self, user: User, level_id: Optional[int] = None) -> str:
        """Generate an appropriate prompt for profile picture generation based on user's level.

        :param user: User entity
        :param level_id: Optional level ID to use in prompt (defaults to user's current level)
        :return: Prompt string for image generation
        """
        from back.src.repository.level_repository import LevelRepository

        level_repo = LevelRepository()

        # Use provided level_id or user's current level
        actual_level_id: Optional[int] = (
            level_id if level_id is not None else user.level_id
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

    @BaseApi.endpoint("/profile-picture-history/<int:user_id>", ["GET"], response=list[ProfilePictureDto],
                      operation_id="getProfilePictureHistory", errors=(404,))
    @require_auth
    def get_profile_picture_history(self, user_id: int) -> list[ProfilePictureDto]:
        """List any user's profile pictures, newest first."""
        from back.src.repository.user_repository import UserRepository

        if not UserRepository().by_id(user_id):
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="User not found",
                detail=f"User with ID {user_id} does not exist",
            )
        return [ProfilePictureDto.model_validate(entry) for entry in self.profile_picture_repository.by_user_id(user_id)]

    @BaseApi.endpoint("/generate-banana", ["POST"], body=GenerateImageBody, response=GeneratedPictureDto,
                      operation_id="generateImage", errors=(500,))
    @require_auth
    def generate_banana_image(self, body: GenerateImageBody) -> GeneratedPictureDto:
        """Generate an image from a prompt and save it as the signed-in user's profile picture."""
        generator = image_generator()
        if not generator.available:
            raise _unavailable()

        try:
            current_user = get_current_user()
            logger.info(
                f"Generating image with prompt: {body.prompt[:50]}... for user {current_user.id}"
            )

            image_base64 = generator.generate([body.prompt])
            if not image_base64:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=500,
                    title="No image generated",
                    detail="Gemini API did not return a valid image",
                )

            # Save the generated image to the user's profile picture history
            try:
                profile_picture_entry = (
                    self.profile_picture_repository.add_profile_picture(
                        user_id=current_user.id,
                        profile_picture_url=f"data:{_MIME_TYPE};base64,{image_base64}",
                        level_id=current_user.level_id,
                    )
                )
                dto = _generated(profile_picture_entry, image_base64)
                db.session.commit()
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

            return dto

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

    @BaseApi.endpoint("/generate-profile-picture", ["POST"], body=GenerateProfilePictureBody,
                      response=GeneratedPictureDto, operation_id="generateProfilePicture", errors=(500,))
    @require_auth
    def generate_profile_picture(self, body: GenerateProfilePictureBody) -> GeneratedPictureDto:
        """Generate the signed-in user's next profile picture from their candidate picture and a level."""
        if not image_generator().available:
            raise _unavailable()

        current_user = get_current_user()
        logger.info(
            f"Generating profile picture for user {current_user.id} (level_id: {body.level_id})"
        )
        if not self.generate_profile_picture_for_user(user_id=current_user.id, level_id=body.level_id):
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=500,
                title="Profile picture generation failed",
                detail="Failed to generate profile picture. Please try again.",
            )

        latest_picture = self.profile_picture_repository.get_latest_by_user_id(current_user.id)
        if latest_picture is None or latest_picture.profile_picture is None:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=500,
                title="Profile picture not found",
                detail="Profile picture was generated but could not be retrieved.",
            )
        return _generated(latest_picture, _base64_of(latest_picture.profile_picture))

    @BaseApi.endpoint("/set-candidate-picture/<int:picture_id>", ["POST"], status=204,
                      operation_id="setCandidatePicture", errors=(403, 404))
    @require_auth
    def set_candidate_picture(self, picture_id: int) -> None:
        """Make one of the signed-in user's pictures the one the next generation starts from."""
        current_user = get_current_user()
        picture = db.session.query(ProfilePictureHistory).filter_by(id=picture_id).first()

        if not picture:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Picture not found",
                detail="The specified picture does not exist",
            )

        if picture.user_id != current_user.id:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=403,
                title="Forbidden",
                detail="You can only set your own pictures as candidates",
            )

        # Only a failing commit makes this false; like any unexpected error, it answers 500.
        if not self.profile_picture_repository.set_candidate(picture_id):
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=500,
                title="Operation failed",
                detail="Failed to set picture as candidate",
            )

        logger.info(f"User {current_user.id} set picture {picture_id} as generation candidate")
