"""Profile pictures: add or generate a user's next picture and choose the one generation starts from.

    picture = ProfilePictures().add(user, uploaded_or_none)
    picture = ProfilePictures().generate_for_level(user, level_id)

Behind it: the image model (Gemini, unless ``set_image_generator`` replaced it),
the level prompt, the candidate picture sent along as a reference and the new
history entry. Callers commit the picture. Generating commits the caller's transaction before the
model is called, so the database isn't locked while it draws (ADR 0007).
"""

import base64
import logging
import os
from typing import Any, Protocol

from back.src.driver.database import db
from back.src.entity.profile_picture_history import ProfilePictureHistory
from back.src.entity.user import User
from back.src.repository.level_repository import LevelRepository
from back.src.repository.profile_picture_history_repository import ProfilePictureHistoryRepository

logger = logging.getLogger(__name__)

# Generated pictures are stored and returned as PNG.
MIME_TYPE = "image/png"


class ImageGenerator(Protocol):
    @property
    def available(self) -> bool:
        """Whether the generator is configured."""
        ...

    # `contents` holds google-genai content parts; the SDK is an optional import.
    def generate(self, contents: list[Any]) -> str | None:
        """The first image generated for `contents` (the prompt, then reference pictures), base64-encoded."""
        ...


class GeminiImageGenerator:
    """Google Gemini's image model; unavailable without an API key or the google-genai package."""

    def __init__(self, api_key: str | None):
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

    def generate(self, contents: list[Any]) -> str | None:
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


_generator: ImageGenerator | None = None


def image_generator() -> ImageGenerator:
    """Gemini with GOOGLE_GENAI_API_KEY, unless `set_image_generator` replaced it."""
    global _generator
    if _generator is None:
        _generator = GeminiImageGenerator(os.getenv("GOOGLE_GENAI_API_KEY"))
    return _generator


def set_image_generator(generator: ImageGenerator | None) -> ImageGenerator | None:
    """Replace the generator (tests); None goes back to Gemini. Returns the previous one."""
    global _generator
    previous, _generator = _generator, generator
    return previous


def base64_of(picture_url: str) -> str:
    return picture_url.split(",", 1)[1] if picture_url.startswith("data:image/") else picture_url


class PictureError(Exception):
    """No picture. ``kind`` says why."""

    UNAVAILABLE = "unavailable"
    FAILED = "failed"
    NO_IMAGE = "no_image"
    UNKNOWN_LEVEL = "unknown_level"
    NOT_FOUND = "not_found"
    NOT_YOURS = "not_yours"

    def __init__(self, kind: str, detail: str):
        super().__init__(detail)
        self.kind = kind
        self.detail = detail


class ProfilePictures:
    def __init__(self, generator: ImageGenerator | None = None):
        """``generator`` defaults to the app's, looked up on each generation."""
        self._generator = generator
        self._history = ProfilePictureHistoryRepository()
        self._levels = LevelRepository()

    @property
    def available(self) -> bool:
        return self._image_generator().available

    def add(self, user: User, picture: str | None) -> ProfilePictureHistory:
        """Show ``picture`` from now on; None shows none."""
        return self._add(user, picture, user.level_id)

    def generate_for_level(self, user: User, level_id: int | None = None) -> ProfilePictureHistory:
        """The user's candidate picture redrawn for a level, theirs by default, added to their history."""
        generator = self._available_generator()
        level_id = level_id if level_id is not None else user.level_id
        contents: list[Any] = [self._prompt(user, level_id)]
        reference = self._history.get_candidate_by_user_id(user.id)
        if reference is not None and reference.profile_picture:
            contents.append({"inline_data": {"mime_type": MIME_TYPE, "data": base64_of(reference.profile_picture)}})
        return self._save(user, self._generate(generator, contents), level_id)

    def generate_from_prompt(self, user: User, prompt: str) -> ProfilePictureHistory:
        """A picture drawn from ``prompt`` alone, added to the user's history."""
        return self._save(user, self._generate(self._available_generator(), [prompt]), user.level_id)

    def choose_candidate(self, user: User, picture_id: int) -> None:
        """Make one of the user's pictures the one the next generation starts from."""
        picture = self._history.by_id(picture_id)
        if picture is None:
            raise PictureError(PictureError.NOT_FOUND, "The specified picture does not exist")
        if picture.user_id != user.id:
            raise PictureError(PictureError.NOT_YOURS, "You can only set your own pictures as candidates")
        self._history.set_candidate(picture)

    def _image_generator(self) -> ImageGenerator:
        return self._generator if self._generator is not None else image_generator()

    def _available_generator(self) -> ImageGenerator:
        generator = self._image_generator()
        if not generator.available:
            raise PictureError(PictureError.UNAVAILABLE, "Google Gemini API is not properly configured")
        return generator

    @staticmethod
    def _generate(generator: ImageGenerator, contents: list[Any]) -> str:
        db.session.commit()
        try:
            image = generator.generate(contents)
        except Exception as e:
            logger.exception("Image generation failed")
            raise PictureError(PictureError.FAILED, str(e)) from e
        if not image:
            raise PictureError(PictureError.NO_IMAGE, "Gemini API did not return a valid image")
        return image

    def _save(self, user: User, image_base64: str, level_id: int | None) -> ProfilePictureHistory:
        return self._add(user, f"data:{MIME_TYPE};base64,{image_base64}", level_id)

    def _add(self, user: User, picture: str | None, level_id: int | None) -> ProfilePictureHistory:
        # Until the user chooses one, their first picture is the one generation starts from.
        is_candidate = not self._history.has_marked_candidate(user.id)
        return self._history.add_profile_picture(user.id, picture, level_id, is_candidate)

    def _prompt(self, user: User, level_id: int | None) -> str:
        level = self._levels.by_id(level_id) if level_id else None
        if level is None:
            raise PictureError(PictureError.UNKNOWN_LEVEL, f"Level {level_id} does not exist")
        label = level.label_de if user.language.lower() == "de" else level.label_en
        return (
            f"adjust the picture to show the original person which has now achieved the rank {label} which "
            f"corresponds to rank {level.id} of 20 of the progression in raclotto. Please be a little bit over the "
            f"top and unhinged. Raclotto is a combination of raclette and lotto. Make sure to include the {label} "
            f"in the picture as best as possible. Please keep in mind that the image should be suitable to be "
            f"displayed in a circular format as an avatar."
        )
