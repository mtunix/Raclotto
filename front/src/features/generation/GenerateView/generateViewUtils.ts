import { IngredientType } from "../../../api/generated/model";

export function getTotalIngredientTypeCount(
  ingredients: any[],
  type: IngredientType,
): number {
  return ingredients.filter((i) => i.type === type).length;
}
