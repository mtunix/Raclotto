import {
  createIngredient,
  deleteIngredient,
  importIngredients,
  refillIngredient,
  reimportIngredients,
  updateIngredient,
} from "../../api/generated/endpoints/ingredients/ingredients";
import type {
  CreateIngredientBody,
  ImportedIngredient,
  IngredientDto,
  IngredientImportDto,
  IngredientReimportDto,
  UpdateIngredientBody,
} from "../../api/generated/model";
import { mutateIngredientCatalog } from "../../lib/api/swrHooks";

async function thenRefetch<T>(sessionKey: string, change: Promise<T>): Promise<T> {
  const result = await change;
  void mutateIngredientCatalog(sessionKey);
  return result;
}

/**
 * Every change to a session's ingredients. Each refetches the session's ingredient list and
 * available counts, which the change alters.
 */
export const ingredientCatalog = {
  create(sessionKey: string, body: CreateIngredientBody): Promise<IngredientDto> {
    return thenRefetch(sessionKey, createIngredient(body, { session_key: sessionKey }));
  },

  update(sessionKey: string, ingredientId: number, body: UpdateIngredientBody): Promise<IngredientDto> {
    return thenRefetch(sessionKey, updateIngredient(ingredientId, body));
  },

  /** Marks the ingredient unavailable; it stays in the session. */
  remove(sessionKey: string, ingredientId: number): Promise<void> {
    return thenRefetch(sessionKey, deleteIngredient(ingredientId, { session_key: sessionKey }));
  },

  refill(sessionKey: string, ingredientId: number): Promise<IngredientDto> {
    return thenRefetch(sessionKey, refillIngredient({ id: ingredientId }));
  },

  import(sessionKey: string, ingredients: ImportedIngredient[]): Promise<IngredientImportDto> {
    return thenRefetch(sessionKey, importIngredients({ ingredients }, { session_key: sessionKey }));
  },

  reimport(sessionKey: string, ingredients: ImportedIngredient[]): Promise<IngredientReimportDto> {
    return thenRefetch(sessionKey, reimportIngredients({ ingredients }, { session_key: sessionKey }));
  },
};
