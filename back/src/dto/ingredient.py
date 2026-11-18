from typing import Self

from pydantic import Field, model_validator
from pydantic_core import PydanticCustomError

from back.src.dto.base import RequestDto, ResponseDto, omittable
from back.src.entity.ingredient import Ingredient, IngredientType
from back.src.interactor.diet import CATEGORIES, Diet
from back.src.interactor.ingredient_category import category_problem


class IngredientDto(ResponseDto):
    id: int
    # Null for ingredients the old API created without one; new and changed ones always have one.
    name: str | None
    type: IngredientType
    available: bool
    meat: bool
    vegetarian: bool
    vegan: bool
    fish: bool
    gluten: bool
    histamine: bool
    fructose: bool
    lactose: bool
    spicy: int
    wildcard: bool
    sweet: bool
    session_id: int


class IngredientForUserDto(IngredientDto):
    """An ingredient and whether the signed-in user's diet allows it."""

    applicable: bool

    @classmethod
    def of(cls, ingredient: Ingredient, diet: Diet) -> "IngredientForUserDto":
        return cls(**IngredientDto.model_validate(ingredient).model_dump(), applicable=diet.allows(ingredient))


class AvailableCountsDto(ResponseDto):
    # Available ingredients the signed-in user's diet allows.
    fill_count: int
    sauce_count: int
    # Available ingredients, whatever the diet.
    total_fill_count: int
    total_sauce_count: int


class IngredientExportDto(ResponseDto):
    """A session's ingredients in the file format users download and import again."""

    session_key: str
    session_id: int
    ingredients: list[IngredientDto]


class IngredientImportDto(ResponseDto):
    created: int
    # The created ingredients.
    ingredients: list[IngredientDto]


class IngredientReimportDto(ResponseDto):
    created: int
    updated: int
    # Ingredients the list left out, now unavailable; those already unavailable count too.
    deleted: int
    # Every ingredient of the session afterwards.
    ingredients: list[IngredientDto]


def _check_category(meat: bool, vegetarian: bool, vegan: bool, fish: bool) -> None:
    problem = category_problem(meat, vegetarian, vegan, fish)
    if problem is not None:
        raise PydanticCustomError("ingredient_category", problem)


class _EditableIngredient(RequestDto):
    """The fields a user sets on an ingredient; it belongs to exactly one category."""

    name: str = Field(min_length=1)
    type: IngredientType
    meat: bool = False
    vegetarian: bool = False
    vegan: bool = False
    fish: bool = False
    gluten: bool = False
    histamine: bool = False
    fructose: bool = False
    lactose: bool = False
    spicy: int = Field(default=0, ge=0, le=3)
    wildcard: bool = False
    sweet: bool = False

    @model_validator(mode="after")
    def _one_category(self) -> Self:
        _check_category(self.meat, self.vegetarian, self.vegan, self.fish)
        return self


class CreateIngredientBody(_EditableIngredient):
    pass


class ImportedIngredient(_EditableIngredient):
    """An ingredient as an export file lists it. Import ignores `id` and `session_id`; reimport
    updates the ingredient with that `id` and rejects a `session_id` of another session."""

    available: bool = True
    id: int | None = None
    session_id: int | None = None


class ImportIngredientsBody(RequestDto):
    ingredients: list[ImportedIngredient]


class UpdateIngredientBody(RequestDto):
    """Omitted fields are left unchanged; null is not a value any field takes."""

    name: str = omittable(min_length=1)
    type: IngredientType = omittable()
    # The category changes as a whole: give all four flags or none.
    meat: bool = omittable()
    vegetarian: bool = omittable()
    vegan: bool = omittable()
    fish: bool = omittable()
    gluten: bool = omittable()
    histamine: bool = omittable()
    fructose: bool = omittable()
    lactose: bool = omittable()
    spicy: int = omittable(ge=0, le=3)
    wildcard: bool = omittable()
    sweet: bool = omittable()

    @model_validator(mode="after")
    def _changes_something(self) -> "UpdateIngredientBody":
        if not self.model_fields_set:
            raise ValueError("Give at least one field to change")
        categories = self.model_fields_set & set(CATEGORIES)
        if categories and categories != set(CATEGORIES):
            raise PydanticCustomError(
                "ingredient_category", "give all of meat, vegetarian, vegan and fish to change the category"
            )
        if categories:
            _check_category(self.meat, self.vegetarian, self.vegan, self.fish)
        return self


class RefillIngredientBody(RequestDto):
    id: int


class DeleteIngredientQuery(RequestDto):
    # When given, it must be the ingredient's session.
    session_key: str | None = Field(default=None, min_length=1)
