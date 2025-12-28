import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Ingredient } from '../model/ingredient';

interface IngredientState {
   ingredientCount: number;
   sauceCount: number;
   setIngredientCount: (count: number) => void;
   setSauceCount: (count: number) => void;
}

export const useIngredientStore = create<IngredientState>()(
   persist(
     (set, get) => ({
       ingredientCount: 0,
       sauceCount: 0,
       selectedFills: [],
       selectedSauces: [],
       
       setIngredientCount: (count: number) => set({ ingredientCount: count }),
       setSauceCount: (count: number) => set({ sauceCount: count }),
       
     }),
     {
       name: 'ingredient-storage',
     }
   )
 );