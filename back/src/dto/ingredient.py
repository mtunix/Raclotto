from back.src.dto.base import ResponseDto
from back.src.entity.ingredient import IngredientType


class IngredientDto(ResponseDto):
    id: int
    name: str
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
