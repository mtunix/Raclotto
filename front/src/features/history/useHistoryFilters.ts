import { useSearchParams } from "react-router";
import { ListPansDirection, ListPansIngredientCountItem, ListPansSort } from "../../api/generated/model";

/** How the history sorts and which pans it shows. */
export interface HistoryFilters {
  sort: ListPansSort;
  direction: ListPansDirection;
  users: number[];
  ratings: number[];
  ingredientCounts: ListPansIngredientCountItem[];
}

const DEFAULT_SORT: ListPansSort = "time";
const DEFAULT_DIRECTION: ListPansDirection = "desc";

const PARAM = {
  sort: "sort",
  direction: "direction",
  users: "user",
  ratings: "rating",
  ingredientCounts: "ingredients",
} as const;

const SORTS: readonly string[] = Object.values(ListPansSort);
const DIRECTIONS: readonly string[] = Object.values(ListPansDirection);
const INGREDIENT_COUNTS: readonly string[] = Object.values(ListPansIngredientCountItem);

const isSort = (value: string | null): value is ListPansSort => value !== null && SORTS.includes(value);
const isDirection = (value: string | null): value is ListPansDirection => value !== null && DIRECTIONS.includes(value);
const isIngredientCount = (value: string): value is ListPansIngredientCountItem => INGREDIENT_COUNTS.includes(value);

function distinct<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function numbers(values: string[], valid: (value: number) => boolean): number[] {
  // `Number("")` is 0, which would pass as "unrated".
  return distinct(values.filter((value) => value.trim() !== "").map(Number).filter(valid));
}

/** The filters `params` name; a missing or unknown value falls back to its default. */
export function parseHistoryFilters(params: URLSearchParams): HistoryFilters {
  const sort = params.get(PARAM.sort);
  const direction = params.get(PARAM.direction);
  return {
    sort: isSort(sort) ? sort : DEFAULT_SORT,
    direction: isDirection(direction) ? direction : DEFAULT_DIRECTION,
    users: numbers(params.getAll(PARAM.users), (id) => Number.isSafeInteger(id) && id > 0),
    // 0 is how the server names unrated pans.
    ratings: numbers(params.getAll(PARAM.ratings), (rating) => rating >= 0 && rating <= 5),
    ingredientCounts: distinct(params.getAll(PARAM.ingredientCounts).filter(isIngredientCount)),
  };
}

/** `params` with `change` applied; defaults and empty lists leave the URL. Other params are kept. */
export function withHistoryFilters(params: URLSearchParams, change: Partial<HistoryFilters>): URLSearchParams {
  const next = new URLSearchParams(params);
  const filters = { ...parseHistoryFilters(params), ...change };
  next.delete(PARAM.sort);
  if (filters.sort !== DEFAULT_SORT) next.set(PARAM.sort, filters.sort);
  next.delete(PARAM.direction);
  if (filters.direction !== DEFAULT_DIRECTION) next.set(PARAM.direction, filters.direction);
  for (const key of ["users", "ratings", "ingredientCounts"] as const) {
    next.delete(PARAM[key]);
    filters[key].forEach((value) => next.append(PARAM[key], String(value)));
  }
  return next;
}

/**
 * The history's sort and filters, kept in the URL's search params so they survive a reload and
 * can be shared. Changes replace the history entry, so Back leaves the page instead of undoing filters.
 */
export function useHistoryFilters() {
  const [params, setParams] = useSearchParams();
  const filters = parseHistoryFilters(params);

  const change = (patch: Partial<HistoryFilters>) => {
    setParams((current) => withHistoryFilters(current, patch), { replace: true });
  };

  return {
    filters,
    filterCount: filters.users.length + filters.ratings.length + filters.ingredientCounts.length,
    setSort: (sort: ListPansSort) => change({ sort }),
    setDirection: (direction: ListPansDirection) => change({ direction }),
    setUsers: (users: number[]) => change({ users }),
    setRatings: (ratings: number[]) => change({ ratings }),
    setIngredientCounts: (ingredientCounts: ListPansIngredientCountItem[]) => change({ ingredientCounts }),
    clearFilters: () => change({ users: [], ratings: [], ingredientCounts: [] }),
  };
}
