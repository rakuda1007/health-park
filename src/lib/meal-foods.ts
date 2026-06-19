import type { MealMasterSlot, MealSlot } from "@/lib/db/types";

/** 食べたものの区切り文字（保存・表示ともに読点で統一） */
export const MEAL_FOODS_SEPARATOR = "、";

export function mealMasterMatchesSlot(
  masterSlot: MealMasterSlot,
  mealSlot: MealSlot,
): boolean {
  return masterSlot === "any" || masterSlot === mealSlot;
}

/** 入力文字列を読点区切りの品目配列に分解する */
export function parseFoods(text: string): string[] {
  return text
    .split(/[、,，・]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 品目配列を保存用文字列に連結する */
export function joinFoods(items: string[]): string {
  return items
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(MEAL_FOODS_SEPARATOR);
}

/** 自由入力や貼り付けを正規化する */
export function normalizeFoodsText(text: string): string {
  return joinFoods(parseFoods(text));
}

/** 重複を除いて末尾に一品追加する */
export function appendFoodItem(items: string[], label: string): string[] {
  const trimmed = label.trim();
  if (!trimmed) {
    return items;
  }
  if (items.some((item) => item === trimmed)) {
    return items;
  }
  return [...items, trimmed];
}

/** セット選択時：内容を置き換える */
export function foodsFromSet(setFoods: string): string[] {
  return parseFoods(setFoods);
}
