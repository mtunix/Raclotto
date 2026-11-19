import { type IngredientDto, type IngredientType } from "../../../api/generated/model";

export function getTotalIngredientTypeCount(
  ingredients: IngredientDto[],
  type: IngredientType,
): number {
  return ingredients.filter((i) => i.type === type).length;
}
