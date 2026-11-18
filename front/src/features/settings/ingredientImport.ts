import { IngredientType } from "../../api/generated/model";
import type { ImportedIngredient } from "../../api/generated/model";

/** An ingredient of a pasted export file with every field filled in, editable before it is sent. */
export interface StagedIngredient extends Required<Omit<ImportedIngredient, "id" | "session_id" | "type">> {
  // Null for an ingredient the file lists without an id; a reimport creates it.
  id: number | null;
  // Whatever number the file says; validation reports one that is no ingredient type.
  type: number;
}

export type CategoryProblem = "none" | "several";

type Raw = Record<string, unknown>;

const isRaw = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const bool = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

function stage(item: unknown): StagedIngredient {
  const raw = isRaw(item) ? item : {};
  return {
    id: typeof raw.id === "number" && raw.id > 0 ? raw.id : null,
    name: typeof raw.name === "string" ? raw.name : "",
    type:
      typeof raw.type === "number"
        ? raw.type
        : raw.type === "FILL"
          ? IngredientType.FILL
          : IngredientType.SAUCE,
    available: bool(raw.available, true),
    meat: bool(raw.meat),
    vegetarian: bool(raw.vegetarian),
    vegan: bool(raw.vegan),
    fish: bool(raw.fish),
    gluten: bool(raw.gluten),
    histamine: bool(raw.histamine),
    fructose: bool(raw.fructose),
    lactose: bool(raw.lactose),
    spicy: typeof raw.spicy === "number" ? raw.spicy : 0,
    wildcard: bool(raw.wildcard),
    sweet: bool(raw.sweet),
  };
}

/** The ingredients of an export file (`{ "ingredients": [...] }`), or null when the text is none. */
export function stageExportFile(text: string): StagedIngredient[] | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRaw(data) || !Array.isArray(data.ingredients)) return null;
  return data.ingredients.map(stage);
}

export function isIngredientType(type: number): type is IngredientType {
  return type === IngredientType.FILL || type === IngredientType.SAUCE;
}

/** The backend's rule: exactly one of meat, vegetarian, vegan and fish. */
export function categoryProblem(ingredient: StagedIngredient): CategoryProblem | null {
  const { meat, vegetarian, vegan, fish } = ingredient;
  const count = [meat, vegetarian, vegan, fish].filter(Boolean).length;
  if (count === 0) return "none";
  return count > 1 ? "several" : null;
}

/**
 * What an import sends for a staged ingredient: a reimport keeps the id that says which
 * ingredient to update, an import leaves it out. Null for a type that does not exist.
 */
export function toImported(staged: StagedIngredient, keepId: boolean): ImportedIngredient | null {
  const { id, type, ...fields } = staged;
  if (!isIngredientType(type)) return null;
  return keepId && id !== null ? { ...fields, type, id } : { ...fields, type };
}
