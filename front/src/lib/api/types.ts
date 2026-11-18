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

/**
 * Error response structure
 */
export interface ApiError {
  status?: number;
  statusText?: string;
  message: string;
  data?: unknown;
}
