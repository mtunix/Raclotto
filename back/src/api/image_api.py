import logging

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import get_current_user, require_auth
from back.src.driver.database import db
from back.src.dto.profile_picture import (
    GeneratedPictureDto,
    GenerateImageBody,
    GenerateProfilePictureBody,
    ImageGenerationDto,
    ProfilePictureDto,
)
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.interactor.profile_pictures import MIME_TYPE, PictureError, ProfilePictures, base64_of
from back.src.repository.profile_picture_history_repository import ProfilePictureHistoryRepository
from back.src.repository.user_repository import UserRepository

logger = logging.getLogger(__name__)


def _unavailable(error: PictureError) -> ApiError:
    return ApiError(
        ApiErrorCode.image_generation_unavailable, status=503, title="Image generation unavailable", detail=error.detail
    )


def _generated(entry: ProfilePictureHistory) -> GeneratedPictureDto:
    return GeneratedPictureDto(
        id=entry.id,
        image_base64=base64_of(entry.profile_picture or ""),
        mime_type=MIME_TYPE,
        level_id=entry.level_id,
        created_at=entry.created_at,
    )


class ImageApi(BaseApi):
    url_prefix = "/images"

    def __init__(self) -> None:
        super().__init__()
        self.pictures = ProfilePictures()
        # Asked here so a missing key is logged at startup.
        _ = self.pictures.available

    @BaseApi.endpoint("/generation", ["GET"], response=ImageGenerationDto, operation_id="getImageGeneration")
    @require_auth
    def get_image_generation(self) -> ImageGenerationDto:
        """Whether pictures can be generated, so clients offer generation only then."""
        return ImageGenerationDto(available=self.pictures.available)

    @BaseApi.endpoint(
        "/profile-picture-history/<int:user_id>",
        ["GET"],
        response=list[ProfilePictureDto],
        operation_id="getProfilePictureHistory",
        errors=(404,),
    )
    @require_auth
    def get_profile_picture_history(self, user_id: int) -> list[ProfilePictureDto]:
        """List any user's profile pictures, newest first."""
        if not UserRepository().by_id(user_id):
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="User not found",
                detail=f"User with ID {user_id} does not exist",
            )
        history = ProfilePictureHistoryRepository().by_user_id(user_id)
        return [ProfilePictureDto.model_validate(entry) for entry in history]

    @BaseApi.endpoint(
        "/generate-banana",
        ["POST"],
        body=GenerateImageBody,
        response=GeneratedPictureDto,
        operation_id="generateImage",
        errors=(500, 503),
    )
    @require_auth
    def generate_banana_image(self, body: GenerateImageBody) -> GeneratedPictureDto:
        """Generate an image from a prompt and save it as the signed-in user's profile picture."""
        try:
            picture = self.pictures.generate_from_prompt(get_current_user(), body.prompt)
        except PictureError as e:
            if e.kind == PictureError.UNAVAILABLE:
                raise _unavailable(e) from e
            if e.kind == PictureError.NO_IMAGE:
                raise ApiError(
                    ApiErrorCode.image_generation_failed, status=500, title="No image generated", detail=e.detail
                ) from e
            # The generator's exception is logged; its text stays out of the response.
            raise ApiError(
                ApiErrorCode.image_generation_failed,
                status=500,
                title="Image generation failed",
                detail="Image generation failed. Please try again.",
            ) from e
        dto = _generated(picture)
        db.session.commit()
        return dto

    @BaseApi.endpoint(
        "/generate-profile-picture",
        ["POST"],
        body=GenerateProfilePictureBody,
        response=GeneratedPictureDto,
        operation_id="generateProfilePicture",
        errors=(500, 503),
    )
    @require_auth
    def generate_profile_picture(self, body: GenerateProfilePictureBody) -> GeneratedPictureDto:
        """Generate the signed-in user's next profile picture from their candidate picture and a level."""
        try:
            picture = self.pictures.generate_for_level(get_current_user(), body.level_id)
        except PictureError as e:
            if e.kind == PictureError.UNAVAILABLE:
                raise _unavailable(e) from e
            logger.error("Profile picture generation failed: %s", e.detail)
            raise ApiError(
                ApiErrorCode.image_generation_failed,
                status=500,
                title="Profile picture generation failed",
                detail="Failed to generate profile picture. Please try again.",
            ) from e
        dto = _generated(picture)
        db.session.commit()
        return dto

    @BaseApi.endpoint(
        "/set-candidate-picture/<int:picture_id>",
        ["POST"],
        status=204,
        operation_id="setCandidatePicture",
        errors=(403, 404),
    )
    @require_auth
    def set_candidate_picture(self, picture_id: int) -> None:
        """Make one of the signed-in user's pictures the one the next generation starts from."""
        try:
            self.pictures.choose_candidate(get_current_user(), picture_id)
        except PictureError as e:
            if e.kind == PictureError.NOT_FOUND:
                raise ApiError(
                    ApiErrorCode.resource_not_found, status=404, title="Picture not found", detail=e.detail
                ) from e
            raise ApiError(ApiErrorCode.forbidden, status=403, title="Forbidden", detail=e.detail) from e
        db.session.commit()
