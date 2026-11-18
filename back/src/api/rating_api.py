from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import get_current_user, require_auth
from back.src.driver.database import db
from back.src.dto.rating import CreateRatingBody, ListRatingsQuery, RatingDto, UpdateRatingBody
from back.src.entity.rating import Rating
from back.src.interactor.achievements import Achievements, PanRated
from back.src.repository.pan_repository import PanRepository
from back.src.repository.rating_repository import RatingRepository


class RatingApi(BaseApi):
    url_prefix = "/ratings"

    def __init__(self):
        super().__init__()
        self.repository = RatingRepository()

    def _rating(self, rating_id: int) -> Rating:
        rating = self.repository.by_id(rating_id)
        if not rating:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Rating not found",
                detail="The specified rating does not exist"
            )
        return rating

    @BaseApi.endpoint("", ["GET"], query=ListRatingsQuery, response=list[RatingDto], operation_id="listRatings")
    @require_auth
    def list_ratings(self, query: ListRatingsQuery) -> list[RatingDto]:
        """List ratings, optionally only those of one session."""
        if query.session_key is not None:
            ratings = self.repository.by_session(query.session_key)
        else:
            ratings = self.repository.all()
        return [RatingDto.model_validate(rating) for rating in ratings]

    @BaseApi.endpoint("", ["POST"], body=CreateRatingBody, response=RatingDto, operation_id="createRating",
                      errors=(404,))
    @require_auth
    def create_rating(self, body: CreateRatingBody) -> RatingDto:
        """Rate a pan as the signed-in user, or change the rating they gave it."""
        user = get_current_user()
        pan = PanRepository().by_id(body.pan_id)
        if pan is None:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Pan not found",
                detail="The specified pan does not exist"
            )

        rating = self.repository.by_user_and_pan(user.id, pan.id)
        is_new = rating is None
        if is_new:
            rating = Rating(rating=body.rating, user_id=user.id, pan_id=pan.id, session_id=pan.session_id)
            db.session.add(rating)
        else:
            rating.rating = body.rating
        db.session.flush()
        dto = RatingDto.model_validate(rating)
        # Committed first so the evaluators see the new rating in pan.ratings.
        db.session.commit()

        # Only a first rating counts; re-rating the same pan changes nothing for achievements.
        if is_new:
            Achievements().record(PanRated(rating=rating, pan=pan, rater=user, session=pan.session))
            db.session.commit()

        return dto

    @BaseApi.endpoint("/<int:rating_id>", ["GET"], response=RatingDto, operation_id="getRating", errors=(404,))
    @require_auth
    def get_rating(self, rating_id: int) -> RatingDto:
        """Get a rating by id."""
        return RatingDto.model_validate(self._rating(rating_id))

    @BaseApi.endpoint("/<int:rating_id>", ["PATCH"], body=UpdateRatingBody, response=RatingDto,
                      operation_id="updateRating", errors=(404,))
    @require_auth
    def update_rating(self, rating_id: int, body: UpdateRatingBody) -> RatingDto:
        """Change a rating's stars."""
        rating = self._rating(rating_id)
        rating.rating = body.rating
        dto = RatingDto.model_validate(rating)
        db.session.commit()
        return dto

    @BaseApi.endpoint("/<int:rating_id>", ["DELETE"], status=204, operation_id="deleteRating", errors=(404,))
    @require_auth
    def delete_rating(self, rating_id: int) -> None:
        """Delete a rating."""
        db.session.delete(self._rating(rating_id))
        db.session.commit()
