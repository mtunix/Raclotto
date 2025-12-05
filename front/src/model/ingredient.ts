export enum IngredientType {
    FILL = 1,
    SAUCE = 2
}

export interface Ingredient {
    id: number;
    name: string;
    type: IngredientType;
    available: boolean;
    meat: boolean;
    vegetarian: boolean;
    vegan: boolean;
    gluten: boolean;
    histamine: boolean;
    fructose: boolean;
    lactose: boolean;
}

