import { useEffect } from "react";
import { type IngredientDto, IngredientType, type PanDto } from "../../../api/generated/model";
import { getTotalIngredientTypeCount } from "./generateViewUtils";
import { getLocalStorageNumber, type IngredientType as CountType, useIngredientStore } from "./ingredientStore";

/** One of the classic roll's counts and the controls that change it. */
export interface RollCount {
  count: number;
  /** All the session's ingredients of this type, available or not; the controls stop there. */
  total: number;
  change: (count: number) => void;
  increment: () => void;
  decrement: () => void;
}

/** How many fills and sauces the next classic roll asks for, remembered across visits. */
export function useClassicRollCounts(ingredients: IngredientDto[]) {
  const { ingredientCount, sauceCount, updateCount, increment, decrement } = useIngredientStore();

  useEffect(() => {
    // The store may be empty while the counts of the last roll are still saved on their own.
    const fill = ingredientCount || getLocalStorageNumber("numFill");
    if (fill > 0) updateCount("fill", fill);
    const sauce = sauceCount || getLocalStorageNumber("numSauce");
    if (sauce > 0) updateCount("sauce", sauce);
    // eslint-disable-next-line @eslint-react/exhaustive-deps -- seeds the counts once on mount; later changes go through the store
  }, []);

  const rollCount = (type: CountType, count: number, total: number): RollCount => ({
    count,
    total,
    change: (next) => updateCount(type, next, total),
    increment: () => increment(type, total),
    decrement: () => decrement(type),
  });
  const fill = rollCount("fill", ingredientCount, getTotalIngredientTypeCount(ingredients, IngredientType.FILL));
  const sauce = rollCount("sauce", sauceCount, getTotalIngredientTypeCount(ingredients, IngredientType.SAUCE));

  return {
    fill,
    sauce,
    canRoll: fill.count > 0 || sauce.count > 0,
    /** Takes over the counts `pan` actually got, which the server caps at what is available. */
    follow: (pan: PanDto) => {
      updateCount("fill", pan.ingredients.filter((i) => i.type === IngredientType.FILL).length);
      updateCount("sauce", pan.ingredients.filter((i) => i.type === IngredientType.SAUCE).length);
    },
  };
}
