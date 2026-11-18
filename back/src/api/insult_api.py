from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import require_auth
from back.src.driver.database import db
from back.src.dto.insult import InsultBody, InsultDto
from back.src.entity.insult import Insult
from back.src.repository.insult_repository import InsultRepository


class InsultApi(BaseApi):
    url_prefix = "/insults"

    def __init__(self):
        super().__init__()
        self.repository = InsultRepository()

    def _insult(self, insult_id: int) -> Insult:
        insult = self.repository.by_id(insult_id)
        if not insult:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Insult not found",
                detail="The specified insult does not exist"
            )
        return insult

    @BaseApi.endpoint("", ["GET"], response=list[InsultDto], operation_id="listInsults")
    @require_auth
    def list_insults(self) -> list[InsultDto]:
        """List all insults."""
        return [InsultDto.model_validate(insult) for insult in self.repository.all()]

    @BaseApi.endpoint("", ["POST"], body=InsultBody, response=InsultDto, operation_id="createInsult")
    @require_auth
    def create_insult(self, body: InsultBody) -> InsultDto:
        """Add an insult."""
        dto = InsultDto.model_validate(self.repository.create(body.model_dump()))
        db.session.commit()
        return dto

    @BaseApi.endpoint("/<int:insult_id>", ["GET"], response=InsultDto, operation_id="getInsult", errors=(404,))
    @require_auth
    def get_insult(self, insult_id: int) -> InsultDto:
        """Get an insult by id."""
        return InsultDto.model_validate(self._insult(insult_id))

    @BaseApi.endpoint("/<int:insult_id>", ["PATCH"], body=InsultBody, response=InsultDto,
                      operation_id="updateInsult", errors=(404,))
    @require_auth
    def update_insult(self, insult_id: int, body: InsultBody) -> InsultDto:
        """Change an insult's title."""
        insult = self._insult(insult_id)
        insult.title = body.title
        dto = InsultDto.model_validate(insult)
        db.session.commit()
        return dto

    @BaseApi.endpoint("/<int:insult_id>", ["DELETE"], status=204, operation_id="deleteInsult", errors=(404,))
    @require_auth
    def delete_insult(self, insult_id: int) -> None:
        """Delete an insult."""
        db.session.delete(self._insult(insult_id))
        db.session.commit()
