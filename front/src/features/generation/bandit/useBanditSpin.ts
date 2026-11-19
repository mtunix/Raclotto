import { useState } from "react";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import { rollBanditPan } from "../../../api/generated/endpoints/pans/pans";
import type { IngredientDto, PanDto } from "../../../api/generated/model";
import { useRollSession } from "../rollSession";
import { useBanditReels } from "./useBanditReels";

export interface BanditOptions {
    columns: number;
    rollPreparationType: boolean;
    rollCheese: boolean;
}

/** The bandit's roll: the pan for `columns` reels, the reels spinning onto it, and rating the result. */
export function useBanditSpin(sessionKey: string, items: IngredientDto[], options: BanditOptions) {
    const { t } = useTranslation();
    const panRoll = useRollSession(sessionKey);
    const { reels, unlock, spin: spinReels } = useBanditReels(items, options.columns);
    const [rating, setRating] = useState(0);
    const { state } = panRoll;
    const spinning = state.phase === "rolling" || state.phase === "revealing";

    async function spin() {
        if (spinning || items.length === 0) return;
        setRating(0);
        unlock();

        let pan: PanDto;
        try {
            // The modal opens with the roll; the reels spin once the pan is known.
            pan = await panRoll.roll(
                () => rollBanditPan(
                    {
                        total_columns: options.columns,
                        roll_prep_type: options.rollPreparationType,
                        roll_cheese: options.rollCheese,
                    },
                    { session_key: sessionKey },
                ),
                { animated: true },
            );
        } catch (error) {
            console.error("Failed to generate bandit pan:", error);
            message.error(t("generate.banditError") || "Failed to spin the bandit. Please try again.");
            return;
        }

        try {
            spinReels(pan.ingredients, panRoll.animationDone);
        } catch (error) {
            // The pan is rolled; show it without the spin.
            console.error("Failed to spin the bandit's columns:", error);
            panRoll.animationDone();
        }
    }

    function rate(stars: number) {
        setRating(stars);
        panRoll.rate(stars).catch((error) => {
            console.error("Failed to rate pan:", error);
        });
    }

    return {
        state,
        spinning,
        result: state.phase === "result" ? state : null,
        reels,
        rating,
        spin,
        rate,
        close: panRoll.close,
        pictureClosed: panRoll.pictureClosed,
    };
}
