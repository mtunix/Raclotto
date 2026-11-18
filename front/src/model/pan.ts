import { Ingredient } from "./ingredient";
import { Rating } from "./rating";
import { PrepType } from "./prepType";

/** A pan as GET /stats returns it; the pan endpoints return the generated `PanDto`. */
export interface Pan {
    id: number;
    name: string;
    user: string;
    user_color?: string;
    user_id?: number;
    user_profile_picture?: string;
    user_border_style?: string;
    user_border_texture?: string | null;
    user_glow_effect?: boolean;
    timestamp: string;
    snacked: boolean;
    ingredients: Ingredient[];
    ratings: Rating[];
    rating: number;
    preparation_type?: PrepType;
    preparation_type_id?: number;
    cheese_level?: number;
}

