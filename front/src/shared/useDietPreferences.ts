import { useState } from "react";
import {
    DEFAULT_DIET_PREFERENCES,
    type DietPreferences,
    toggleDietPreference,
} from "../model/diet";

/**
 * Diet preference chips state: toggling a chip re-applies the diet hierarchy
 * (see `normalizeDiet`), so the UI always shows what the backend will store.
 */
export function useDietPreferences(initial: DietPreferences = DEFAULT_DIET_PREFERENCES) {
    const [prefs, setPrefs] = useState<DietPreferences>(initial);
    const setChecked = (name: string, checked: boolean) => {
        setPrefs((current) => toggleDietPreference(current, name, checked));
    };
    return { prefs, setPrefs, setChecked };
}
