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
    fish?: boolean;
    spicy?: number; // 0-3 spiciness level
    wildcard?: boolean;
    sweet?: boolean;
    applicable?: boolean; // Whether this ingredient matches the current user's dietary preferences
}

