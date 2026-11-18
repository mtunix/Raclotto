/**
 * The diet hierarchy, as the backend enforces it when the current user is
 * updated (PATCH /auth/me): someone who eats meat also eats vegetarian and
 * vegan dishes, someone who eats vegetarian also eats vegan dishes, and
 * everybody eats at least vegetarian & vegan. Fish is independent.
 */
export type DietFlags = {
    meat: boolean;
    vegetarian: boolean;
    vegan: boolean;
};

export function normalizeDiet<T extends DietFlags>(prefs: T): T {
    if (prefs.meat) {
        return { ...prefs, vegetarian: true, vegan: true };
    }
    if (prefs.vegetarian) {
        return { ...prefs, vegan: true };
    }
    if (!prefs.vegan) {
        return { ...prefs, vegetarian: true, vegan: true };
    }
    return prefs;
}

/** Toggle one preference and re-apply the diet hierarchy. */
export function toggleDietPreference<T extends DietFlags>(
    prefs: T,
    name: string,
    checked: boolean,
): T {
    if (!(name in prefs)) return prefs;
    return normalizeDiet({ ...prefs, [name]: checked });
}

/** The diet & intolerance flags a user picks ("all ok to snack"). */
export type DietPreferences = DietFlags & {
    fish: boolean;
    gluten: boolean;
    histamine: boolean;
    fructose: boolean;
    lactose: boolean;
};

export const DEFAULT_DIET_PREFERENCES: DietPreferences = {
    meat: false,
    vegetarian: true,
    vegan: true,
    fish: false,
    gluten: true,
    histamine: true,
    fructose: true,
    lactose: true,
};
