import { IngredientType } from "../../../api/generated/model";

// Utility functions
export function getLocalStorageNumber(
  key: string,
  defaultValue: number = 1,
): number {
  const value = localStorage.getItem(key);
  return value ? parseInt(value) : defaultValue;
}

export function getTotalIngredientTypeCount(
  ingredients: any[],
  type: IngredientType,
): number {
  return ingredients.filter((i) => i.type === type).length;
}
