import { Ingredient } from "./ingredient";
import { Rating } from "./rating";
import { PrepType } from "./prepType";

export interface Pan {
    id: number;
    name: string;
    user: string;
    timestamp: string;
    snacked: boolean;
    ingredients: Ingredient[];
    ratings: Rating[];
    rating: number;
    preparation_type?: PrepType;
    preparation_type_id?: number;
}

