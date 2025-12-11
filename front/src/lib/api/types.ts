import { Ingredient } from "../../model/ingredient";
import { Pan } from "../../model/pan";
import { RaclottoSession } from "../../model/raclottoSession";
import { Achievement } from "../../model/achievement";
import { PrepType } from "../../model/prepType";

/**
 * Base structure for deserialized JSON API responses
 */
export interface DeserializedResponse<T = unknown> {
    data: T;
    jsonapi?: Record<string, unknown>;
    links?: Record<string, unknown>;
    meta?: Record<string, unknown>;
}

/**
 * Response types for specific API endpoints
 */
export type IngredientsResponse = Ingredient[];
export type PansResponse = Pan[];
export type SessionsResponse = RaclottoSession[];
export type PrepTypesResponse = PrepType[];
export type AchievementsResponse = Achievement[];

/**
 * Response for generation endpoint
 */
export interface GenerationResponse {
    generated: Pan;
}

/**
 * Response for rating endpoint
 */
export interface RatingResponse {
    id: number;
    panId: number;
    rating: number;
}

/**
 * Response for session operations
 */
export interface SessionResponse {
    id: number;
    key: string;
    name: string;
    active: boolean;
}

/**
 * Generic API response that can be an array or single object
 */
export type ApiResponse<T> = T | T[];

/**
 * Stats response structure
 */
export interface StatsResponse {
    pans: Pan[];
    ingredients_top_rated: Array<Ingredient & { avg_rating: number }>;
    ingredients_most_used: Array<Ingredient & { pan_count: number }>;
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



