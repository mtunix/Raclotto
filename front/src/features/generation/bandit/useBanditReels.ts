import { useEffect, useRef, useState } from "react";
import type { IngredientDto } from "../../../api/generated/model";
import { aimReels, Reel, reelsAt, shuffledReels, spinDuration } from "./reelSpin";

// Rendering every animation frame is too slow with many reels.
const RENDER_INTERVAL_MS = 100;

/** `count` reels over `items`, reshuffled when either count changes, and their spin onto a pan. */
export function useBanditReels(items: IngredientDto[], count: number) {
    const [reels, setReels] = useState<Reel[]>([]);
    const frame = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (items.length === 0) return;
        setReels(shuffledReels(items, count));
        // eslint-disable-next-line react-hooks/exhaustive-deps -- items is a new array every render; reshuffle only when the reel or item count changes
    }, [count, items.length]);

    useEffect(() => () => {
        if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    }, []);

    function unlock() {
        if (frame.current !== undefined) cancelAnimationFrame(frame.current);
        frame.current = undefined;
        setReels((current) => current.map((reel) => ({ ...reel, status: "idle" })));
    }

    /** Spins the reels onto `panIngredients`, then calls `onStopped`; throws if the pan can't fill them. */
    function spin(panIngredients: IngredientDto[], onStopped: () => void) {
        const spins = aimReels(reels, panIngredients);
        const duration = spinDuration(spins);
        const start = Date.now();
        let rendered = start;
        setReels(reelsAt(spins, 0));

        const tick = () => {
            const now = Date.now();
            const stopped = now - start >= duration;
            if (stopped || now - rendered >= RENDER_INTERVAL_MS) {
                setReels(reelsAt(spins, now - start));
                rendered = now;
            }
            if (stopped) {
                frame.current = undefined;
                onStopped();
            } else {
                frame.current = requestAnimationFrame(tick);
            }
        };
        tick();
    }

    return { reels, unlock, spin };
}
