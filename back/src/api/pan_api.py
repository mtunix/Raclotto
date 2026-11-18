from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import get_current_user, require_auth
from back.src.driver.database import db
from back.src.dto.pan import (
    CreatePanBody,
    ListPansQuery,
    PanDto,
    PanPageDto,
    RollBanditPanBody,
    RollOutcomeDto,
    RollPanBody,
    RollQuery,
    UpdatePanBody,
)
from back.src.entity.pan import Pan
from back.src.interactor.pan_roll import PanRoll, RollError, RollOptions
from back.src.repository.pan_repository import PanRepository
from back.src.repository.user_repository import UserRepository

_ROLL_ERRORS = {
    RollError.SESSION_NOT_FOUND: (ApiErrorCode.resource_not_found, 404, "Session not found"),
    RollError.PREPARATION_TYPE_NOT_FOUND: (ApiErrorCode.resource_not_found, 404, "Preparation type not found"),
    RollError.PREPARATION_TYPE_NOT_IN_SESSION: (ApiErrorCode.incorrect_parameters, 400, "Invalid preparation type"),
    RollError.NO_INGREDIENTS: (ApiErrorCode.incorrect_parameters, 400, "Invalid ingredient selection"),
    RollError.INVALID_OPTIONS: (ApiErrorCode.missing_required_body_field, 400, "Invalid roll options"),
}


class PanApi(BaseApi):
    url_prefix = "/pans"

    def __init__(self) -> None:
        super().__init__()
        self.repository = PanRepository()
        self.users = UserRepository()

    def _roll(self, query: RollQuery, options: RollOptions) -> RollOutcomeDto:
        user = get_current_user()
        try:
            return PanRoll().roll_into(
                user, query.session_key, options, lambda outcome: RollOutcomeDto.of(outcome, user)
            )
        except RollError as error:
            code, status, title = _ROLL_ERRORS[error.kind]
            raise ApiError(code, status=status, title=title, detail=error.detail)

    def _pan(self, pan_id: int) -> Pan:
        pan = self.repository.by_id(pan_id)
        if not pan:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Pan not found",
                detail="The specified pan does not exist",
            )
        return pan

    def _dto(self, pan: Pan) -> PanDto:
        return PanDto.of(pan, self.users.by_id(pan.user_id))

    @BaseApi.endpoint("/generate", ["POST"], query=RollQuery, body=RollPanBody,
                      response=RollOutcomeDto, operation_id="rollPan", errors=(404,))
    @require_auth
    def generate(self, query: RollQuery, body: RollPanBody) -> RollOutcomeDto:
        """Roll a pan with a fixed number of fills and sauces."""
        return self._roll(
            query,
            RollOptions(
                num_fill=body.num_fill,
                num_sauce=body.num_sauce,
                preparation_type_id=body.preparation_type_id,
                roll_preparation_type=body.roll_prep_type,
                roll_cheese=body.roll_cheese,
            ),
        )

    @BaseApi.endpoint("/generate/bandit", ["POST"], query=RollQuery, body=RollBanditPanBody,
                      response=RollOutcomeDto, operation_id="rollBanditPan", errors=(404,))
    @require_auth
    def generate_bandit(self, query: RollQuery, body: RollBanditPanBody) -> RollOutcomeDto:
        """Roll a pan with a random fill/sauce split (bandit mode)."""
        return self._roll(
            query,
            RollOptions(
                total_columns=body.total_columns,
                roll_preparation_type=body.roll_prep_type,
                roll_cheese=body.roll_cheese,
            ),
        )

    @BaseApi.endpoint("", ["POST"], query=RollQuery, body=CreatePanBody,
                      response=RollOutcomeDto, operation_id="createPan", errors=(404,))
    @require_auth
    def create_pan(self, query: RollQuery, body: CreatePanBody) -> RollOutcomeDto:
        """Create a pan from hand-picked ingredients."""
        return self._roll(query, RollOptions(ingredient_ids=body.ingredients, name=body.name or None))

    @BaseApi.endpoint("", ["GET"], query=ListPansQuery, response=PanPageDto, operation_id="listPans")
    @require_auth
    def list_pans(self, query: ListPansQuery) -> PanPageDto:
        """List pans newest first, filtered by session and/or user, one page at a time."""
        pans, total = self.repository.page(
            session_key=query.session_key, user_id=query.user_id, limit=query.limit, offset=query.offset
        )
        authors = self.users.by_ids(pan.user_id for pan in pans)
        return PanPageDto(
            items=[PanDto.of(pan, authors.get(pan.user_id)) for pan in pans],
            total=total,
            limit=query.limit,
            offset=query.offset,
            has_more=query.limit is not None and query.offset + len(pans) < total,
        )

    @BaseApi.endpoint("/<int:pan_id>", ["GET"], response=PanDto, operation_id="getPan", errors=(404,))
    @require_auth
    def get_pan(self, pan_id: int) -> PanDto:
        """Get a pan by id."""
        return self._dto(self._pan(pan_id))

    @BaseApi.endpoint("/<int:pan_id>", ["PATCH"], body=UpdatePanBody, response=PanDto, operation_id="updatePan",
                      errors=(404,))
    @require_auth
    def update_pan(self, pan_id: int, body: UpdatePanBody) -> PanDto:
        """Rename a pan or mark it eaten."""
        pan = self._pan(pan_id)
        for field in body.model_fields_set:
            setattr(pan, field, getattr(body, field))
        dto = self._dto(pan)
        db.session.commit()
        return dto

    @BaseApi.endpoint("/<int:pan_id>", ["DELETE"], status=204, operation_id="deletePan", errors=(404, 409))
    @require_auth
    def delete_pan(self, pan_id: int) -> None:
        """Delete a pan."""
        db.session.delete(self._pan(pan_id))
        db.session.commit()
