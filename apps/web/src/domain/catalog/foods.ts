// 仮置きの餌カタログ。実アセットは Phase 2 以降で差し替え。

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  effects: {
    hungerDelta: number; // 通常負の値
    moodDelta: number;
    hpDelta?: number;
  };
}

export const FOODS: readonly FoodItem[] = [
  {
    id: "food-apple",
    name: "りんご",
    description: "あまずっぱい くだもの",
    icon: "🍎",
    price: 5,
    effects: { hungerDelta: -15, moodDelta: 5 },
  },
  {
    id: "food-onigiri",
    name: "おにぎり",
    description: "しっかり おなかいっぱい",
    icon: "🍙",
    price: 10,
    effects: { hungerDelta: -30, moodDelta: 8 },
  },
  {
    id: "food-cake",
    name: "ショートケーキ",
    description: "とくべつな ごほうび",
    icon: "🍰",
    price: 30,
    effects: { hungerDelta: -25, moodDelta: 25, hpDelta: 10 },
  },
];

export function findFood(id: string): FoodItem | undefined {
  return FOODS.find((f) => f.id === id);
}
