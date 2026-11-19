from datetime import datetime

from back.src.dto.base import ResponseDto
from back.src.dto.ingredient import IngredientDto
from back.src.dto.pan import PanDto
from back.src.dto.session import SessionDto
from back.src.dto.stats import IngredientUsageDto
from back.src.dto.user import UserSummaryDto
from back.src.entity.pan import Pan
from back.src.interactor.session_recap import Participant, Recap


class BoldestPanDto(ResponseDto):
    pan: PanDto
    xp: int


class ParticipantRecapDto(ResponseDto):
    user: UserSummaryDto
    pan_count: int
    # What their pans in this session earned.
    xp: int
    # Null while none of their pans is rated.
    average_rating: float | None
    ratings_given: int

    @classmethod
    def of(cls, participant: Participant) -> ParticipantRecapDto:
        return cls(
            user=UserSummaryDto.of(participant.user),
            pan_count=participant.pan_count,
            xp=participant.xp,
            average_rating=participant.average_rating,
            ratings_given=participant.ratings_given,
        )


class SessionRecapDto(ResponseDto):
    """A session summed up; it works while the session is still open, too."""

    session: SessionDto
    pan_count: int
    rating_count: int
    # Null while nobody has rolled.
    last_pan_at: datetime | None
    # Rated pans only; the worst once two are rated.
    best_pan: PanDto | None
    worst_pan: PanDto | None
    # The pan that earned the most XP.
    boldest_pan: BoldestPanDto | None
    # The ingredient in the most pans.
    favorite_ingredient: IngredientUsageDto | None
    # Most XP first.
    participants: list[ParticipantRecapDto]

    @classmethod
    def of(cls, recap: Recap) -> SessionRecapDto:
        def pan(pan: Pan | None) -> PanDto | None:
            return PanDto.of(pan, recap.authors.get(pan.user_id)) if pan is not None else None

        boldest = pan(recap.boldest_pan)
        favorite = recap.favorite_ingredient
        return cls(
            session=SessionDto.model_validate(recap.session),
            pan_count=recap.pan_count,
            rating_count=recap.rating_count,
            last_pan_at=recap.last_pan_at,
            best_pan=pan(recap.best_pan),
            worst_pan=pan(recap.worst_pan),
            boldest_pan=BoldestPanDto(pan=boldest, xp=recap.boldest_pan_xp) if boldest is not None else None,
            favorite_ingredient=IngredientUsageDto(
                ingredient=IngredientDto.model_validate(favorite), pan_count=recap.favorite_ingredient_pans
            )
            if favorite is not None
            else None,
            participants=[ParticipantRecapDto.of(participant) for participant in recap.participants],
        )
