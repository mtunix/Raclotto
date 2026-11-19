import { IngredientType } from "../../../api/generated/model";
import type { IngredientDto } from "../../../api/generated/model";

const SAUCE_EMOJIS = [
    "🍯", "🧀", "🥛", "🧈", "🥄", "🍶", "🧃", "🥤", "🍹", "🍷",
    "🍸", "🍺", "🍻", "🥂", "🍾", "🧊", "🍼", "🥃", "🧉", "🍵",
    "☕", "🧋", "🥤", "🧃", "🍯", "🧈", "🧀", "🥛", "🍶", "🍷",
];

const FILL_EMOJIS = [
    "🥗", "🍕", "🍔", "🌮", "🌯", "🥙", "🌭", "🍖", "🍗", "🥩",
    "🥓", "🍳", "🥚", "🥑", "🥒", "🥕", "🌽", "🥔", "🍅", "🥬",
    "🥦", "🍄", "🌶️", "🫑", "🧄", "🧅", "🍠", "🥜", "🌰", "🥖",
    "🥐", "🥨", "🥯", "🥞", "🧇", "🍞", "🥪", "🍝", "🍜", "🍲",
    "🍛", "🍣", "🍱", "🥟", "🥠", "🥡", "🍤", "🦐", "🦑", "🦞",
    "🦀", "🐟", "🐠", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🍰",
    "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪",
];

const STEP_MS = 50;
const FIRST_STOP_MS = 6000;
const STOP_GAP_MS = 800;

export type Random = () => number;

export type ReelStatus = "idle" | "spinning" | "locked";

export interface Reel {
    status: ReelStatus;
    /** The available ingredients plus, once rolled, the pan's. */
    items: IngredientDto[];
    index: number;
    emoji: string;
}

/** A reel's way from where it stands to the pan's ingredient. */
export interface ReelSpin {
    items: IngredientDto[];
    from: number;
    target: number;
    emojis: readonly string[];
    targetEmoji: string;
    stopsAt: number;
}

const pick = <T>(list: readonly T[], random: Random): T => list[Math.floor(random() * list.length)];

function emojisFor(ingredient: IngredientDto): readonly string[] {
    return ingredient.type === IngredientType.SAUCE ? SAUCE_EMOJIS : FILL_EMOJIS;
}

function shuffled<T>(list: readonly T[], random: Random): T[] {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** `count` idle reels, each over all of `items` in its own order. */
export function shuffledReels(items: readonly IngredientDto[], count: number, random: Random = Math.random): Reel[] {
    return Array.from({ length: count }, () => {
        const order = shuffled(items, random);
        return { status: "idle", items: order, index: Math.floor(random() * order.length), emoji: pick(FILL_EMOJIS, random) };
    });
}

/** Aims each reel at the pan ingredient of its position; they stop one after another, left to right. */
export function aimReels(reels: readonly Reel[], panIngredients: readonly IngredientDto[], random: Random = Math.random): ReelSpin[] {
    if (panIngredients.length < reels.length) {
        throw new Error(`Not enough ingredients in result: expected ${reels.length}, got ${panIngredients.length}`);
    }
    return reels.map((reel, position) => {
        const ingredient = panIngredients[position];
        const found = reel.items.findIndex((item) => item.id === ingredient.id);
        const items = found < 0 ? [...reel.items, ingredient] : reel.items;
        const emojis = emojisFor(ingredient);
        return {
            items,
            from: reel.index,
            target: found < 0 ? items.length - 1 : found,
            emojis,
            targetEmoji: pick(emojis, random),
            stopsAt: FIRST_STOP_MS + position * STOP_GAP_MS,
        };
    });
}

/** The reels `elapsed` ms into their spin: spinning through their items, or locked on their target. */
export function reelsAt(spins: readonly ReelSpin[], elapsed: number, random: Random = Math.random): Reel[] {
    return spins.map((spin) =>
        elapsed < spin.stopsAt
            ? {
                status: "spinning",
                items: spin.items,
                index: (spin.from + Math.floor(elapsed / STEP_MS)) % spin.items.length,
                emoji: pick(spin.emojis, random),
            }
            : { status: "locked", items: spin.items, index: spin.target, emoji: spin.targetEmoji },
    );
}

export function spinDuration(spins: readonly ReelSpin[]): number {
    return Math.max(0, ...spins.map((spin) => spin.stopsAt));
}

/** Grid spans per breakpoint for `count` reels side by side. */
export function columnSpan(count: number): { xs: number; sm: number; md: number; lg: number } {
    switch (count) {
        case 1:
            return { xs: 24, sm: 24, md: 24, lg: 24 };
        case 2:
            return { xs: 24, sm: 12, md: 12, lg: 12 };
        case 3:
            return { xs: 24, sm: 12, md: 8, lg: 8 };
        case 4:
            return { xs: 24, sm: 12, md: 6, lg: 6 };
        case 5:
        case 6:
            return { xs: 24, sm: 12, md: 6, lg: 4 };
        default: {
            const span = Math.floor(24 / Math.min(count, 8));
            return { xs: 24, sm: 12, md: span, lg: span };
        }
    }
}
