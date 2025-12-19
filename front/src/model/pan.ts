import { Ingredient } from "./ingredient";
import { Rating } from "./rating";
import { PrepType } from "./prepType";

export interface Pan {
    id: number;
    name: string;
    user: string;
    user_color?: string;
    user_id?: number;
    user_profile_picture?: string;
    user_border_style?: string;
    user_border_texture?: string | null;
    timestamp: string;
    snacked: boolean;
    ingredients: Ingredient[];
    ratings: Rating[];
    rating: number;
    preparation_type?: PrepType;
    preparation_type_id?: number;
    cheese_level?: number;
}

