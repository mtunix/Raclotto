import { IngredientType } from "../../../model/ingredient";

// Constants
export const SAUCE_ICONS = [
  "🍯",
  "🧀",
  "🥛",
  "🧈",
  "🥄",
  "🍶",
  "🧃",
  "🥤",
  "🍹",
  "🍷",
  "🍸",
  "🍺",
  "🍻",
  "🥂",
  "🍾",
  "🧊",
  "🍼",
  "🥃",
  "🧉",
  "🍵",
  "☕",
  "🧋",
  "🥤",
  "🧃",
  "🍯",
  "🧈",
  "🧀",
  "🥛",
  "🍶",
  "🍷",
];

export const INGREDIENT_ICONS = [
  "🥗",
  "🍕",
  "🍔",
  "🌮",
  "🌯",
  "🥙",
  "🌭",
  "🍖",
  "🍗",
  "🥩",
  "🥓",
  "🍳",
  "🥚",
  "🥑",
  "🥒",
  "🥕",
  "🌽",
  "🥔",
  "🍅",
  "🥬",
  "🥦",
  "🍄",
  "🌶️",
  "🫑",
  "🧄",
  "🧅",
  "🍠",
  "🥜",
  "🌰",
  "🥖",
  "🥐",
  "🥨",
  "🥯",
  "🥞",
  "🧇",
  "🍞",
  "🥪",
  "🍝",
  "🍜",
  "🍲",
  "🍛",
  "🍣",
  "🍱",
  "🥟",
  "🥠",
  "🥡",
  "🍤",
  "🦐",
  "🦑",
  "🦞",
  "🦀",
  "🐟",
  "🐠",
  "🍢",
  "🍡",
  "🍧",
  "🍨",
  "🍦",
  "🥧",
  "🍰",
  "🎂",
  "🍮",
  "🍭",
  "🍬",
  "🍫",
  "🍿",
  "🍩",
  "🍪",
];

// Utility functions
export function getLocalStorageNumber(
  key: string,
  defaultValue: number = 1,
): number {
  const value = localStorage.getItem(key);
  return value ? parseInt(value) : defaultValue;
}

export function getRandomEmoji(ingredientType: IngredientType): string {
  const emojiArray =
    ingredientType === IngredientType.SAUCE ? SAUCE_ICONS : INGREDIENT_ICONS;
  return emojiArray[Math.floor(Math.random() * emojiArray.length)];
}

export function getIngredientTypeCount(
  ingredients: any[],
  type: IngredientType,
): number {
  return ingredients.filter((i) => i.type === type && i.available).length;
}

export function getTotalIngredientTypeCount(
  ingredients: any[],
  type: IngredientType,
): number {
  return ingredients.filter((i) => i.type === type).length;
}
