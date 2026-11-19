import { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { updateMe, useGetMe } from "../../../api/generated/endpoints/auth/auth";
import type { MeDto } from "../../../api/generated/model";
import { useAuthStore } from "../../../AuthSlice";
import { mutateMe, mutatePanLists, onErrorRetry } from "../../../lib/api/swrHooks";
import { DietPreferences, normalizeDiet } from "../../../model/diet";
import { useDietPreferences } from "../../../shared/useDietPreferences";

/** The user tab's fields besides the diet; saved together with it. */
export type Profile = Pick<MeDto, "name" | "color" | "language" | "border_style" | "border_texture" | "glow_effect">;

interface Saved {
    profile: Profile;
    diet: DietPreferences;
}

function savedOf(me: MeDto): Saved {
    const { name, color, language, border_style, border_texture, glow_effect } = me;
    const { meat, vegetarian, vegan, fish, gluten, histamine, fructose, lactose } = me;
    return {
        profile: { name, color, language, border_style, border_texture, glow_effect },
        diet: { meat, vegetarian, vegan, fish, gluten, histamine, fructose, lactose },
    };
}

function same<T extends object>(a: T, b: T): boolean {
    return (Object.keys(a) as (keyof T)[]).every((key) => a[key] === b[key]);
}

/** The signed-in user's settings as a form: edited locally, saved in one PATCH once something changed. */
export function useUserSettingsForm() {
    const { t } = useTranslation();
    const setUser = useAuthStore((state) => state.setUser);
    const { data: me, isLoading, error } = useGetMe({
        swr: { onErrorRetry, revalidateOnFocus: false, revalidateOnReconnect: true },
    });
    const { prefs: diet, setPrefs: setDiet, setChecked } = useDietPreferences();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [saved, setSaved] = useState<Saved | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!me) return;
        const loaded = savedOf(me);
        setProfile(loaded.profile);
        setDiet(loaded.diet);
        setSaved(loaded);
    }, [me, setDiet]);

    useEffect(() => {
        if (error) {
            message.error(t("settings.loadFailed") || "Failed to load settings");
        }
    }, [error, t]);

    const dirty = saved !== null && profile !== null && (!same(profile, saved.profile) || !same(diet, saved.diet));

    const change = useCallback(<K extends keyof Profile>(field: K, value: Profile[K]) => {
        setProfile((current) => (current ? { ...current, [field]: value } : current));
    }, []);

    async function save() {
        if (!dirty || saving || !profile) return;
        setSaving(true);
        try {
            // The backend stores the diet with its hierarchy applied; send what it will keep.
            const normalized = normalizeDiet(diet);
            const updated = await updateMe({ ...profile, ...normalized });
            setSaved({ profile, diet: normalized });
            setDiet(normalized);
            mutateMe();
            // Pan cards show their author's border.
            mutatePanLists();
            setUser(updated);
            message.success(t("common.saved") || "Saved");
        } catch (e) {
            console.error("Failed to save user settings:", e);
            message.error(t("settings.saveFailed") || "Failed to save settings");
            mutateMe();
        } finally {
            setSaving(false);
        }
    }

    return { me, loading: isLoading, saving, profile, diet, dirty, change, setChecked, save };
}
