import { Achievement } from "./achievement";
import { Ingredient } from "./ingredient";
import { Level } from "./level";

export interface User {
    id: number;
    name: string;
    email: string;
    meat: boolean;
    vegetarian: boolean;
    vegan: boolean;
    fish: boolean;
    histamine: boolean;
    fructose: boolean;
    lactose: boolean;
    gluten: boolean;
    color?: string;
    profile_picture?: string | null;
    language?: string;
    experience_points?: number;
    level?: Level;
    next_level?: Level | null;
    border_style?: string;
    border_texture?: string | null;
    glow_effect?: boolean;
    /** Only present on the public profile (GET /users/:id). */
    achievements?: Achievement[];
}

/** What login/register return: a token and the minimal user identity. */
export interface AuthResult {
    token: string;
    user: {
        id: number;
        name: string;
        email: string;
        profile_picture: string | null;
    };
}

export interface UserStats {
    total_pans: number;
    total_ratings_given: number;
    average_rating_received: number;
    favorite_ingredient: Ingredient | null;
    best_rated_ingredient: (Ingredient & { avg_rating: number }) | null;
    total_achievement_points: number;
    average_ingredients_per_pan: number;
    most_pans_session: { session_id: number; session_name: string; pan_count: number } | null;
    sessions_participated: number;
    most_ingredients_pan: {
        id: number;
        name: string;
        ingredient_count: number;
        ingredients: Ingredient[];
    } | null;
}
