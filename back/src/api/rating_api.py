from back.src.api.base_api import BaseApi, found, not_found
from back.src.auth.middleware import get_current_user, require_auth
from back.src.dto.rating import CreateRatingBody, ListRatingsQuery, RatingDto, UpdateRatingBody
from back.src.entity.rating import Rating
from back.src.interactor.pan_ratings import PanRatings, RatingNotFound
from back.src.repository.pan_repository import PanRepository
from back.src.repository.rating_repository import RatingRepository


class RatingApi(BaseApi):
    url_prefix = "/ratings"

    def __init__(self) -> None:
        super().__init__()
        self.repository = RatingRepository()

    def _rating(self, rating_id: int) -> Rating:
        return found(self.repository.by_id(rating_id), "Rating")

    @BaseApi.endpoint("", ["GET"], query=ListRatingsQuery, response=list[RatingDto], operation_id="listRatings")
    @require_auth
    def list_ratings(self, query: ListRatingsQuery) -> list[RatingDto]:
        """List ratings, optionally only those of one session."""
        if query.session_key is not None:
            ratings = self.repository.by_session(query.session_key)
        else:
            ratings = self.repository.all()
        return [RatingDto.model_validate(rating) for rating in ratings]

    @BaseApi.endpoint(
        "", ["POST"], body=CreateRatingBody, response=RatingDto, operation_id="createRating", errors=(404,)
    )
    @require_auth
    def create_rating(self, body: CreateRatingBody) -> RatingDto:
        """Rate a pan as the signed-in user, or change the rating they gave it."""
        pan = found(PanRepository().by_id(body.pan_id), "Pan")
        rating = PanRatings().rate(get_current_user(), pan, body.rating)
        return RatingDto.model_validate(rating)

    @BaseApi.endpoint("/<int:rating_id>", ["GET"], response=RatingDto, operation_id="getRating", errors=(404,))
    @require_auth
    def get_rating(self, rating_id: int) -> RatingDto:
        """Get a rating by id."""
        return RatingDto.model_validate(self._rating(rating_id))

    @BaseApi.endpoint(
        "/<int:rating_id>",
        ["PATCH"],
        body=UpdateRatingBody,
        response=RatingDto,
        operation_id="updateRating",
        errors=(404,),
    )
    @require_auth
    def update_rating(self, rating_id: int, body: UpdateRatingBody) -> RatingDto:
        """Change the stars of a rating the signed-in user gave."""
        try:
            rating = PanRatings().change(get_current_user(), rating_id, body.rating)
        except RatingNotFound as e:
            raise not_found("Rating") from e
        return RatingDto.model_validate(rating)

    @BaseApi.endpoint("/<int:rating_id>", ["DELETE"], status=204, operation_id="deleteRating", errors=(404,))
    @require_auth
    def delete_rating(self, rating_id: int) -> None:
        """Withdraw a rating the signed-in user gave."""
        try:
            PanRatings().withdraw(get_current_user(), rating_id)
        except RatingNotFound as e:
            raise not_found("Rating") from e
