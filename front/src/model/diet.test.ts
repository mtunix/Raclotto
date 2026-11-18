import { DEFAULT_DIET_PREFERENCES, normalizeDiet, toggleDietPreference } from "./diet";

const diet = (meat: boolean, vegetarian: boolean, vegan: boolean, fish = false) => ({
    meat,
    vegetarian,
    vegan,
    fish,
});

describe("normalizeDiet (mirrors PATCH /auth/me)", () => {
    it("meat implies vegetarian and vegan", () => {
        expect(normalizeDiet(diet(true, false, false))).toEqual(diet(true, true, true));
    });

    it("vegetarian implies vegan", () => {
        expect(normalizeDiet(diet(false, true, false))).toEqual(diet(false, true, true));
    });

    it("none of the three falls back to vegetarian and vegan", () => {
        expect(normalizeDiet(diet(false, false, false))).toEqual(diet(false, true, true));
    });

    it("vegan only is kept", () => {
        expect(normalizeDiet(diet(false, false, true))).toEqual(diet(false, false, true));
    });

    it("leaves fish and other flags alone", () => {
        expect(normalizeDiet(diet(false, false, false, true))).toEqual(diet(false, true, true, true));
        const prefs = { ...DEFAULT_DIET_PREFERENCES, gluten: false };
        expect(normalizeDiet(prefs).gluten).toBe(false);
    });
});

describe("toggleDietPreference", () => {
    it("checking meat cascades down the hierarchy", () => {
        const prefs = { ...DEFAULT_DIET_PREFERENCES, vegetarian: false, vegan: true };
        const next = toggleDietPreference(prefs, "meat", true);
        expect([next.meat, next.vegetarian, next.vegan]).toEqual([true, true, true]);
    });

    it("unchecking vegetarian keeps vegan", () => {
        const next = toggleDietPreference(DEFAULT_DIET_PREFERENCES, "vegetarian", false);
        expect([next.meat, next.vegetarian, next.vegan]).toEqual([false, false, true]);
    });

    it("cannot uncheck everything", () => {
        const veganOnly = { ...DEFAULT_DIET_PREFERENCES, vegetarian: false };
        const next = toggleDietPreference(veganOnly, "vegan", false);
        expect([next.meat, next.vegetarian, next.vegan]).toEqual([false, true, true]);
    });

    it("toggles independent flags and ignores unknown names", () => {
        expect(toggleDietPreference(DEFAULT_DIET_PREFERENCES, "fish", true).fish).toBe(true);
        expect(toggleDietPreference(DEFAULT_DIET_PREFERENCES, "nope", true)).toBe(
            DEFAULT_DIET_PREFERENCES,
        );
    });
});
