from typing import Iterable

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi
from back.src.auth.middleware import get_current_user, require_auth
from back.src.driver.database import db
from back.src.dto.ingredient import (
    AvailableCountsDto,
    CreateIngredientBody,
    DeleteIngredientQuery,
    ImportIngredientsBody,
    IngredientDto,
    IngredientExportDto,
    IngredientForUserDto,
    IngredientImportDto,
    IngredientReimportDto,
    RefillIngredientBody,
    UpdateIngredientBody,
)
from back.src.dto.session import SessionFilterQuery, SessionKeyQuery
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.entity.raclotto_session import RaclottoSession
from back.src.interactor.achievements import Achievements, CatalogChanged, IngredientAdded
from back.src.interactor.diet import Diet
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.session_repository import SessionRepository

# Where an exported ingredient came from; an import does not set these on the ingredient.
_NOT_IMPORTED = {"id", "session_id"}


def _dtos(ingredients: Iterable[Ingredient]) -> list[IngredientDto]:
    return [IngredientDto.model_validate(ingredient) for ingredient in ingredients]


class IngredientApi(BaseApi):
    url_prefix = "/ingredients"

    def __init__(self) -> None:
        super().__init__()
        self.repository = IngredientRepository()
        self.session_repository = SessionRepository()

    @staticmethod
    def _catalog_changed(session: RaclottoSession) -> None:
        """Let achievements react to a change in the session's catalog, then commit."""
        Achievements().record(CatalogChanged(session=session, actor=get_current_user()))
        db.session.commit()

    def _session(self, session_key: str) -> RaclottoSession:
        session = self.session_repository.by_key(session_key)
        if not session:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Session not found",
                detail="The specified session does not exist",
            )
        return session

    def _ingredient(self, ingredient_id: int) -> Ingredient:
        ingredient = self.repository.by_id(ingredient_id)
        if not ingredient:
            raise ApiError(
                ApiErrorCode.resource_not_found,
                status=404,
                title="Ingredient not found",
                detail="The specified ingredient does not exist",
            )
        return ingredient

    @BaseApi.endpoint("", ["GET"], query=SessionFilterQuery, response=list[IngredientForUserDto],
                      operation_id="listIngredients")
    @require_auth
    def list_ingredients(self, query: SessionFilterQuery) -> list[IngredientForUserDto]:
        """List ingredients, optionally of one session, each marked whether the user's diet allows it."""
        if query.session_key is not None:
            ingredients = self.repository.by_session(query.session_key)
        else:
            ingredients = self.repository.all()
        diet = Diet.of(get_current_user())
        return [IngredientForUserDto.of(ingredient, diet) for ingredient in ingredients]

    @BaseApi.endpoint("", ["POST"], query=SessionKeyQuery, body=CreateIngredientBody, response=IngredientDto,
                      operation_id="createIngredient", errors=(404,))
    @require_auth
    def create_ingredient(self, query: SessionKeyQuery, body: CreateIngredientBody) -> IngredientDto:
        """Add an ingredient to a session."""
        user = get_current_user()
        session = self._session(query.session_key)
        ingredient = self.repository.create({**body.model_dump(), "session": session})
        dto = IngredientDto.model_validate(ingredient)
        db.session.commit()

        Achievements().record(IngredientAdded(ingredient=ingredient, user=user, session=session))
        db.session.commit()
        return dto

    @BaseApi.endpoint("/<int:ingredient_id>", ["GET"], response=IngredientDto, operation_id="getIngredient",
                      errors=(404,))
    @require_auth
    def get_ingredient(self, ingredient_id: int) -> IngredientDto:
        """Get an ingredient by id."""
        return IngredientDto.model_validate(self._ingredient(ingredient_id))

    @BaseApi.endpoint("/<int:ingredient_id>", ["PATCH"], body=UpdateIngredientBody, response=IngredientDto,
                      operation_id="updateIngredient", errors=(404,))
    @require_auth
    def update_ingredient(self, ingredient_id: int, body: UpdateIngredientBody) -> IngredientDto:
        """Change an ingredient's name, type, category or properties."""
        ingredient = self._ingredient(ingredient_id)
        for field in body.model_fields_set:
            setattr(ingredient, field, getattr(body, field))
        dto = IngredientDto.model_validate(ingredient)
        db.session.commit()
        self._catalog_changed(ingredient.session)
        return dto

    @BaseApi.endpoint("/<int:ingredient_id>", ["DELETE"], query=DeleteIngredientQuery, status=204,
                      operation_id="deleteIngredient", errors=(404,))
    @require_auth
    def delete_ingredient(self, ingredient_id: int, query: DeleteIngredientQuery) -> None:
        """Mark an ingredient unavailable; it stays in the session and its pans."""
        ingredient = self._ingredient(ingredient_id)
        if query.session_key is not None and ingredient.session.key != query.session_key:
            raise ApiError(
                ApiErrorCode.incorrect_parameters,
                status=400,
                title="Invalid session",
                detail="Session key does not match ingredient's session",
                source={"pointer": "/query/session_key"},
            )
        self.repository.mark_unavailable(ingredient_id)
        db.session.commit()
        self._catalog_changed(ingredient.session)

    @BaseApi.endpoint("/refill", ["POST"], body=RefillIngredientBody, response=IngredientDto,
                      operation_id="refillIngredient", errors=(404,))
    @require_auth
    def refill_ingredient(self, body: RefillIngredientBody) -> IngredientDto:
        """Mark an ingredient available again."""
        ingredient = self._ingredient(body.id)
        self.repository.mark_available(ingredient.id)
        dto = IngredientDto.model_validate(ingredient)
        db.session.commit()
        self._catalog_changed(ingredient.session)
        return dto

    @BaseApi.endpoint("/available-counts", ["GET"], query=SessionKeyQuery, response=AvailableCountsDto,
                      operation_id="getAvailableCounts")
    @require_auth
    def get_available_counts(self, query: SessionKeyQuery) -> AvailableCountsDto:
        """Count a session's available fills and sauces, all of them and those the user's diet allows."""
        available = [i for i in self.repository.by_session(query.session_key) if i.available]
        diet = Diet.of(get_current_user())
        allowed = [i for i in available if diet.allows(i)]

        def count(ingredients: list[Ingredient], kind: IngredientType) -> int:
            return sum(1 for i in ingredients if i.type == kind)

        return AvailableCountsDto(
            fill_count=count(allowed, IngredientType.FILL),
            sauce_count=count(allowed, IngredientType.SAUCE),
            total_fill_count=count(available, IngredientType.FILL),
            total_sauce_count=count(available, IngredientType.SAUCE),
        )

    @BaseApi.endpoint("/export", ["GET"], query=SessionKeyQuery, response=IngredientExportDto,
                      operation_id="exportIngredients", errors=(404,))
    @require_auth
    def export_ingredients(self, query: SessionKeyQuery) -> IngredientExportDto:
        """Export a session's ingredients, ids included, for a later import or reimport."""
        session = self._session(query.session_key)
        return IngredientExportDto(
            session_key=session.key,
            session_id=session.id,
            ingredients=_dtos(self.repository.by_session(session.key)),
        )

    @BaseApi.endpoint("/import", ["POST"], query=SessionKeyQuery, body=ImportIngredientsBody,
                      response=IngredientImportDto, status=201, operation_id="importIngredients", errors=(404,))
    @require_auth
    def import_ingredients(self, query: SessionKeyQuery, body: ImportIngredientsBody) -> IngredientImportDto:
        """Add every listed ingredient to a session as a new one."""
        session = self._session(query.session_key)
        created = self.repository.bulk_create(
            [item.model_dump(exclude=_NOT_IMPORTED) for item in body.ingredients], session.id
        )
        dto = IngredientImportDto(created=len(created), ingredients=_dtos(created))
        db.session.commit()
        self._catalog_changed(session)
        return dto

    @BaseApi.endpoint("/reimport", ["POST"], query=SessionKeyQuery, body=ImportIngredientsBody,
                      response=IngredientReimportDto, operation_id="reimportIngredients", errors=(404,))
    @require_auth
    def reimport_ingredients(self, query: SessionKeyQuery, body: ImportIngredientsBody) -> IngredientReimportDto:
        """Make a session's catalog the list: update listed ids, create the rest, mark the unlisted unavailable."""
        session = self._session(query.session_key)
        current_ids = {ingredient.id for ingredient in self.repository.by_session(session.key)}

        to_create, to_update, listed_ids = [], [], set()
        for index, item in enumerate(body.ingredients):
            if "session_id" in item.model_fields_set and item.session_id != session.id:
                raise ApiError(
                    ApiErrorCode.incorrect_parameters,
                    status=400,
                    title="Mixed sessions",
                    detail=f"ingredients[{index}] belongs to a different session. "
                           f"All ingredients must belong to session_id {session.id}",
                    source={"pointer": f"/body/ingredients/{index}/session_id"},
                )
            fields = item.model_dump(exclude=_NOT_IMPORTED)
            if item.id is None:
                to_create.append(fields)
                continue
            if item.id not in current_ids:
                raise ApiError(
                    ApiErrorCode.resource_not_found,
                    status=404,
                    title="Ingredient not found",
                    detail=f"ingredients[{index}] with id {item.id} does not exist in this session",
                    source={"pointer": f"/body/ingredients/{index}/id"},
                )
            to_update.append({"id": item.id, **fields})
            listed_ids.add(item.id)

        created = self.repository.bulk_create(to_create, session.id) if to_create else []
        updated = self.repository.bulk_update(to_update) if to_update else []
        unlisted = current_ids - listed_ids
        deleted = self.repository.mark_unavailable_by_ids(list(unlisted)) if unlisted else 0
        dto = IngredientReimportDto(
            created=len(created),
            updated=len(updated),
            deleted=deleted,
            ingredients=_dtos(self.repository.by_session(session.key)),
        )
        db.session.commit()
        self._catalog_changed(session)
        return dto
