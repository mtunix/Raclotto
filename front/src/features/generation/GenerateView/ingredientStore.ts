import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type IngredientType = 'fill' | 'sauce';

interface Counts {
    ingredientCount: number;
    sauceCount: number;
}

interface IngredientState extends Counts {
    updateCount: (type: IngredientType, newCount: number, availableCount?: number) => void;
    increment: (type: IngredientType, availableCount?: number) => void;
    decrement: (type: IngredientType) => void;
}

const countOf = { fill: 'ingredientCount', sauce: 'sauceCount' } as const satisfies Record<IngredientType, keyof Counts>;

/** Where the counts were saved before this store kept them. */
const legacyKeys = { ingredientCount: 'numFill', sauceCount: 'numSauce' } as const satisfies Record<keyof Counts, string>;

function attempt<T>(access: () => T, fallback: T): T {
    try {
        return access();
    } catch {
        // Storage can be unavailable (private windows); the counts then last as long as the page.
        return fallback;
    }
}

const storage: StateStorage = {
    getItem: (name) => attempt(() => localStorage.getItem(name), null),
    setItem: (name, value) => attempt(() => localStorage.setItem(name, value), undefined),
    removeItem: (name) => attempt(() => localStorage.removeItem(name), undefined),
};

function asCount(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function countsWhere(countFor: (field: keyof Counts) => unknown): Partial<Counts> {
    const counts: Partial<Counts> = {};
    for (const field of ['ingredientCount', 'sauceCount'] as const) {
        const count = asCount(countFor(field));
        if (count !== undefined) counts[field] = count;
    }
    return counts;
}

function savedCounts(persisted: unknown): Partial<Counts> {
    const saved: Record<string, unknown> = typeof persisted === 'object' && persisted !== null ? { ...persisted } : {};
    return countsWhere((field) => saved[field]);
}

/** Reads the counts from their old keys once and drops the keys. */
function takeLegacyCounts(): Partial<Counts> {
    return countsWhere((field) => {
        const key = legacyKeys[field];
        const saved = attempt(() => localStorage.getItem(key), null);
        attempt(() => localStorage.removeItem(key), undefined);
        return saved === null ? undefined : Number(saved);
    });
}

/** Never below zero, nor above `availableCount` when there is one. */
function cap(count: number, availableCount?: number): number {
    return Math.max(0, availableCount ? Math.min(count, availableCount) : count);
}

export const useIngredientStore = create<IngredientState>()(
    persist(
        (set, get) => {
            const updateCount = (type: IngredientType, newCount: number, availableCount?: number) =>
                set({ [countOf[type]]: cap(newCount, availableCount) });
            return {
                ingredientCount: 0,
                sauceCount: 0,
                updateCount,
                increment: (type, availableCount) => updateCount(type, get()[countOf[type]] + 1, availableCount),
                decrement: (type) => updateCount(type, get()[countOf[type]] - 1),
            };
        },
        {
            name: 'ingredient-storage',
            storage: createJSONStorage(() => storage),
            merge: (persisted, current) => ({ ...current, ...takeLegacyCounts(), ...savedCounts(persisted) }),
        },
    ),
);
