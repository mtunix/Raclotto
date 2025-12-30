import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type IngredientType = 'fill' | 'sauce';

interface IngredientState {
    ingredientCount: number;
    sauceCount: number;
    selectedFills: string[];
    selectedSauces: string[];
    
    // Actions
    setIngredientCount: (count: number, availableCount?: number) => void;
    setSauceCount: (count: number, availableCount?: number) => void;
    updateCount: (type: IngredientType, newCount: number, availableCount?: number) => void;
    increment: (type: IngredientType, availableCount?: number) => void;
    decrement: (type: IngredientType) => void;
    getCount: (type: IngredientType) => number;
}

export const useIngredientStore = create<IngredientState>()(
    persist(
        (set, get) => ({
            ingredientCount: 0,
            sauceCount: 0,
            selectedFills: [],
            selectedSauces: [],
            
            setIngredientCount: (count: number, availableCount?: number) => {
                const clampedCount = Math.max(0, availableCount ? Math.min(count, availableCount) : count);
                set({ ingredientCount: clampedCount });
                localStorage.setItem('numFill', String(clampedCount));
            },
            
            setSauceCount: (count: number, availableCount?: number) => {
                const clampedCount = Math.max(0, availableCount ? Math.min(count, availableCount) : count);
                set({ sauceCount: clampedCount });
                localStorage.setItem('numSauce', String(clampedCount));
            },
            
            updateCount: (type: IngredientType, newCount: number, availableCount?: number) => {
                const clampedCount = availableCount ? Math.min(newCount, availableCount) : newCount;
                
                if (type === 'fill') {
                    set({ 
                        ingredientCount: Math.max(0, clampedCount) 
                    });
                    localStorage.setItem('numFill', String(Math.max(0, clampedCount)));
                } else {
                    set({ 
                        sauceCount: Math.max(0, clampedCount) 
                    });
                    localStorage.setItem('numSauce', String(Math.max(0, clampedCount)));
                }
            },
            
            increment: (type: IngredientType, availableCount?: number) => {
                const currentCount = type === 'fill' ? get().ingredientCount : get().sauceCount;
                const canIncrement = availableCount ? currentCount < availableCount : true;
                
                if (canIncrement) {
                    const newCount = currentCount + 1;
                    if (type === 'fill') {
                        set({ ingredientCount: newCount });
                        localStorage.setItem('numFill', String(newCount));
                    } else {
                        set({ sauceCount: newCount });
                        localStorage.setItem('numSauce', String(newCount));
                    }
                }
            },
            
            decrement: (type: IngredientType) => {
                const currentCount = type === 'fill' ? get().ingredientCount : get().sauceCount;
                if (currentCount > 0) {
                    const newCount = currentCount - 1;
                    if (type === 'fill') {
                        set({ ingredientCount: newCount });
                        localStorage.setItem('numFill', String(newCount));
                    } else {
                        set({ sauceCount: newCount });
                        localStorage.setItem('numSauce', String(newCount));
                    }
                }
            },
            
            getCount: (type: IngredientType) => {
                return type === 'fill' ? get().ingredientCount : get().sauceCount;
            }
        }),
        {
            name: 'ingredient-storage',
        }
    )
);

// Helper function to get a number from localStorage with a default value
export function getLocalStorageNumber(key: string, defaultValue: number = 0): number {
    if (typeof window === 'undefined') return defaultValue;
    const value = localStorage.getItem(key);
    return value ? parseInt(value, 10) : defaultValue;
}