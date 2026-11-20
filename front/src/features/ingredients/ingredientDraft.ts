import { useState } from "react";
import type { CreateIngredientBody, IngredientForUserDto, IngredientType } from "../../api/generated/model";
import { categoryProblem } from "./ingredientCatalog";

export const CATEGORIES = ["meat", "vegetarian", "vegan", "fish"] as const;
export type Category = (typeof CATEGORIES)[number];

export const ALLERGENS = ["histamine", "gluten", "fructose", "lactose"] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const isCategory = (value: string | null): value is Category => CATEGORIES.some((category) => category === value);
export const isAllergen = (value: string): value is Allergen => ALLERGENS.some((allergen) => allergen === value);

/** An ingredient as the ingredient modal edits it: one category at most, where the body has a flag each. */
export interface IngredientDraft {
  name: string;
  type: IngredientType;
  spicy: number;
  wildcard: boolean;
  sweet: boolean;
  category: Category | null;
  allergens: Record<Allergen, boolean>;
}

/** A draft of `ingredient`, or of a new, vegetarian one of `type`. */
export function draftOf(ingredient: IngredientForUserDto | null, type: IngredientType): IngredientDraft {
  return {
    name: ingredient?.name ?? "",
    type: ingredient?.type ?? type,
    spicy: ingredient?.spicy || 0,
    wildcard: ingredient?.wildcard || false,
    sweet: ingredient?.sweet || false,
    category: ingredient ? (CATEGORIES.find((category) => ingredient[category]) ?? null) : "vegetarian",
    allergens: {
      histamine: ingredient?.histamine || false,
      gluten: ingredient?.gluten || false,
      fructose: ingredient?.fructose || false,
      lactose: ingredient?.lactose || false,
    },
  };
}

function categoryFlags(category: Category | null): Record<Category, boolean> {
  return {
    meat: category === "meat",
    vegetarian: category === "vegetarian",
    vegan: category === "vegan",
    fish: category === "fish",
  };
}

export function bodyOf(draft: IngredientDraft): CreateIngredientBody {
  return {
    name: draft.name,
    type: draft.type,
    spicy: draft.spicy,
    wildcard: draft.wildcard,
    sweet: draft.sweet,
    ...categoryFlags(draft.category),
    ...draft.allergens,
  };
}

/**
 * The draft the ingredient modal shows: it starts over from `ingredient` (or a new one of `type`)
 * whenever the modal opens or what it edits changes. The name is reported missing once it was
 * changed or a save was tried, as a form field validates.
 */
export function useIngredientDraft(open: boolean, ingredient: IngredientForUserDto | null, type: IngredientType) {
  const [draft, setDraft] = useState(() => draftOf(ingredient, type));
  const [nameChecked, setNameChecked] = useState(false);
  const [shownFrom, setShownFrom] = useState({ open, ingredient, type });
  if (shownFrom.open !== open || shownFrom.ingredient !== ingredient || shownFrom.type !== type) {
    setShownFrom({ open, ingredient, type });
    if (open) {
      setDraft(draftOf(ingredient, type));
      setNameChecked(false);
    }
  }

  const nameMissing = draft.name === "";
  // One category at most, so the only problem left is none.
  const categoryMissing = categoryProblem(categoryFlags(draft.category)) !== null;

  return {
    draft,
    body: bodyOf(draft),
    nameMissing: nameChecked && nameMissing,
    categoryMissing,
    change: (patch: Partial<IngredientDraft>) => {
      setDraft((current) => ({ ...current, ...patch }));
      if (patch.name !== undefined) setNameChecked(true);
    },
    /** Shows what is missing; true when the draft can be saved. */
    check: () => {
      setNameChecked(true);
      return !nameMissing && !categoryMissing;
    },
  };
}
