import { Ingredient } from "../../model/ingredient";
import { Pan } from "../../model/pan";

/**
 * Stats response structure
 */
export interface StatsResponse {
  pans: Pan[];
  ingredients_top_rated: Array<Ingredient & { avg_rating: number }>;
  ingredients_most_used: Array<Ingredient & { pan_count: number }>;
  leaderboard: LeaderboardEntry[];
}

/**
 * Leaderboard entry structure
 */
export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  name: string;
  total_points: number;
  achievement_count: number;
}

export interface AvailableIngredientCounts {
  fill_count: number;
  sauce_count: number;
  total_fill_count: number;
  total_sauce_count: number;
}

/** An ingredient as exported/imported (flat dict incl. session_id). */
export type ExportedIngredient = Omit<Ingredient, "applicable"> & {
  session_id: number;
};

export interface IngredientExport {
  session_key: string;
  session_id: number;
  ingredients: ExportedIngredient[];
}

export interface IngredientImportResult {
  created: number;
  ingredients: ExportedIngredient[];
}

export interface IngredientReimportResult extends IngredientImportResult {
  updated: number;
  deleted: number;
}

/**
 * Error response structure
 */
export interface ApiError {
  status?: number;
  statusText?: string;
  message: string;
  data?: unknown;
}
