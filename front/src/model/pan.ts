import { Ingredient } from "./ingredient";
import { Rating } from "./rating";

export interface Pan {
    id: number;
    name: string;
    user: string;
    timestamp: string;
    snacked: boolean;
    ingredients: Ingredient[];
    ratings: Rating[];
    rating: number;
}

