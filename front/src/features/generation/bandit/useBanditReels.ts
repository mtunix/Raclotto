import { useEffect, useRef, useState } from "react";
import type { IngredientDto } from "../../../api/generated/model";
import { aimReels, type Reel, reelsAt, shuffledReels, spinDuration } from "./reelSpin";

// Rendering every animation frame is too slow with many reels.
const RENDER_INTERVAL_MS = 100;

/** `count` reels over `items`, reshuffled when either count changes, and their spin onto a pan. */
export function useBanditReels(items: IngredientDto[], count: number) {
    const [reels, setReels] = useState<Reel[]>([]);
    const frameRef = useRef<number | undefined>(undefined);

    // items is a new array every render; reshuffle only when the reel or item count changes.
    const shape = items.length === 0 ? null : `${count}:${items.length}`;
    const [shuffledFor, setShuffledFor] = useState<string | null>(null);
    if (shape !== null && shape !== shuffledFor) {
        setShuffledFor(shape);
        setReels(shuffledReels(items, count));
    }

    useEffect(() => () => {
        if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    }, []);

    function unlock() {
        if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
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
                frameRef.current = undefined;
                onStopped();
            } else {
                frameRef.current = requestAnimationFrame(tick);
            }
        };
        tick();
    }

    return { reels, unlock, spin };
}
