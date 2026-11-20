from collections.abc import Iterable

from back.src.api.base_api import ApiError, ApiErrorCode, BaseApi, ErrorSpec, found
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
from back.src.entity.ingredient import Ingredient
from back.src.entity.raclotto_session import RaclottoSession
from back.src.interactor.diet import Diet
from back.src.interactor.ingredient_catalog import CatalogError, CatalogItem, IngredientCatalog
from back.src.repository.ingredient_repository import IngredientRepository
from back.src.repository.session_repository import SessionRepository

# Where an exported ingredient came from; an import does not set these on the ingredient.
_NOT_IMPORTED = {"id", "session_id"}

# Each names the field of the list item it rejects.
_REIMPORT_ERRORS = {
    CatalogError.OTHER_SESSION: (ErrorSpec(ApiErrorCode.incorrect_parameters, 400, "Mixed sessions"), "session_id"),
    CatalogError.UNKNOWN_INGREDIENT: (ErrorSpec(ApiErrorCode.resource_not_found, 404, "Ingredient not found"), "id"),
}


def _dtos(ingredients: Iterable[Ingredient]) -> list[IngredientDto]:
    return [IngredientDto.model_validate(ingredient) for ingredient in ingredients]


def _items(body: ImportIngredientsBody) -> list[CatalogItem]:
    return [
        CatalogItem(fields=item.model_dump(exclude=_NOT_IMPORTED), id=item.id, session_id=item.session_id)
        for item in body.ingredients
    ]


class IngredientApi(BaseApi):
    url_prefix = "/ingredients"

    def __init__(self) -> None:
        super().__init__()
        self.repository = IngredientRepository()
        self.session_repository = SessionRepository()

    def _session(self, session_key: str) -> RaclottoSession:
        return found(self.session_repository.by_key(session_key), "Session")

    def _ingredient(self, ingredient_id: int) -> Ingredient:
        return found(self.repository.by_id(ingredient_id), "Ingredient")

    @BaseApi.endpoint(
        "", ["GET"], query=SessionFilterQuery, response=list[IngredientForUserDto], operation_id="listIngredients"
    )
    @require_auth
    def list_ingredients(self, query: SessionFilterQuery) -> list[IngredientForUserDto]:
        """List ingredients, optionally of one session, each marked whether the user's diet allows it."""
        if query.session_key is not None:
            ingredients = self.repository.by_session(query.session_key)
        else:
            ingredients = self.repository.all()
        diet = Diet.of(get_current_user())
        return [IngredientForUserDto.of(ingredient, diet) for ingredient in ingredients]

    @BaseApi.endpoint(
        "",
        ["POST"],
        query=SessionKeyQuery,
        body=CreateIngredientBody,
        response=IngredientDto,
        operation_id="createIngredient",
        errors=(404,),
    )
    @require_auth
    def create_ingredient(self, query: SessionKeyQuery, body: CreateIngredientBody) -> IngredientDto:
        """Add an ingredient to a session."""
        session = self._session(query.session_key)
        ingredient = IngredientCatalog().add(get_current_user(), session, body.model_dump())
        dto = IngredientDto.model_validate(ingredient)
        db.session.commit()
        return dto

    @BaseApi.endpoint(
        "/<int:ingredient_id>", ["GET"], response=IngredientDto, operation_id="getIngredient", errors=(404,)
    )
    @require_auth
    def get_ingredient(self, ingredient_id: int) -> IngredientDto:
        """Get an ingredient by id."""
        return IngredientDto.model_validate(self._ingredient(ingredient_id))

    @BaseApi.endpoint(
        "/<int:ingredient_id>",
        ["PATCH"],
        body=UpdateIngredientBody,
        response=IngredientDto,
        operation_id="updateIngredient",
        errors=(404,),
    )
    @require_auth
    def update_ingredient(self, ingredient_id: int, body: UpdateIngredientBody) -> IngredientDto:
        """Change an ingredient's name, type, category or properties."""
        ingredient = self._ingredient(ingredient_id)
        IngredientCatalog().update(get_current_user(), ingredient, body.model_dump(include=body.model_fields_set))
        dto = IngredientDto.model_validate(ingredient)
        db.session.commit()
        return dto

    @BaseApi.endpoint(
        "/<int:ingredient_id>",
        ["DELETE"],
        query=DeleteIngredientQuery,
        status=204,
        operation_id="deleteIngredient",
        errors=(404,),
    )
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
        IngredientCatalog().set_available(get_current_user(), ingredient, False)
        db.session.commit()

    @BaseApi.endpoint(
        "/refill",
        ["POST"],
        body=RefillIngredientBody,
        response=IngredientDto,
        operation_id="refillIngredient",
        errors=(404,),
    )
    @require_auth
    def refill_ingredient(self, body: RefillIngredientBody) -> IngredientDto:
        """Mark an ingredient available again."""
        ingredient = self._ingredient(body.id)
        IngredientCatalog().set_available(get_current_user(), ingredient, True)
        dto = IngredientDto.model_validate(ingredient)
        db.session.commit()
        return dto

    @BaseApi.endpoint(
        "/available-counts",
        ["GET"],
        query=SessionKeyQuery,
        response=AvailableCountsDto,
        operation_id="getAvailableCounts",
    )
    @require_auth
    def get_available_counts(self, query: SessionKeyQuery) -> AvailableCountsDto:
        """Count a session's available fills and sauces, all of them and those the user's diet allows."""
        counts = IngredientCatalog().available_counts(query.session_key, Diet.of(get_current_user()))
        return AvailableCountsDto(
            fill_count=counts.fills,
            sauce_count=counts.sauces,
            total_fill_count=counts.total_fills,
            total_sauce_count=counts.total_sauces,
        )

    @BaseApi.endpoint(
        "/export",
        ["GET"],
        query=SessionKeyQuery,
        response=IngredientExportDto,
        operation_id="exportIngredients",
        errors=(404,),
    )
    @require_auth
    def export_ingredients(self, query: SessionKeyQuery) -> IngredientExportDto:
        """Export a session's ingredients, ids included, for a later import or reimport."""
        session = self._session(query.session_key)
        return IngredientExportDto(
            session_key=session.key,
            session_id=session.id,
            ingredients=_dtos(self.repository.by_session(session.key)),
        )

    @BaseApi.endpoint(
        "/import",
        ["POST"],
        query=SessionKeyQuery,
        body=ImportIngredientsBody,
        response=IngredientImportDto,
        status=201,
        operation_id="importIngredients",
        errors=(404,),
    )
    @require_auth
    def import_ingredients(self, query: SessionKeyQuery, body: ImportIngredientsBody) -> IngredientImportDto:
        """Add every listed ingredient to a session as a new one."""
        session = self._session(query.session_key)
        created = IngredientCatalog().import_new(get_current_user(), session, _items(body))
        dto = IngredientImportDto(created=len(created), ingredients=_dtos(created))
        db.session.commit()
        return dto

    @BaseApi.endpoint(
        "/reimport",
        ["POST"],
        query=SessionKeyQuery,
        body=ImportIngredientsBody,
        response=IngredientReimportDto,
        operation_id="reimportIngredients",
        errors=(404,),
    )
    @require_auth
    def reimport_ingredients(self, query: SessionKeyQuery, body: ImportIngredientsBody) -> IngredientReimportDto:
        """Make a session's catalog the list: update listed ids, create the rest, mark the unlisted unavailable."""
        session = self._session(query.session_key)
        try:
            result = IngredientCatalog().reimport(get_current_user(), session, _items(body))
        except CatalogError as e:
            spec, field = _REIMPORT_ERRORS[e.kind]
            raise spec.error(e.detail, source={"pointer": f"/body/ingredients/{e.index}/{field}"}) from e
        dto = IngredientReimportDto(
            created=result.created,
            updated=result.updated,
            deleted=result.unavailable,
            ingredients=_dtos(self.repository.by_session(session.key)),
        )
        db.session.commit()
        return dto
