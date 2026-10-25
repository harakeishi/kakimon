// 餌カタログ。実アセットは Phase 2 以降で差し替え。
//
// バランスの目安（rewardCalculator のコメントと対応）:
// - 1 日の餌代 20〜25 コインで満腹を保てるように、主食は 10 コイン前後で
//   hunger -40〜-70。
// - くだもの・やさいは安くて hp 回復つき、おかしは高めで mood 回復が大きい。
// - ごちそう（30 コイン以上）は「とくべつな ひ」のごほうび。

export type FoodCategory = "fruit" | "veggie" | "meal" | "snack" | "drink";

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  category: FoodCategory;
  effects: {
    hungerDelta: number; // 通常負の値
    moodDelta: number;
    hpDelta?: number;
  };
}

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  fruit: "くだもの",
  veggie: "やさい",
  meal: "ごはん",
  snack: "おかし",
  drink: "のみもの",
};

/** ショップで並べる順。 */
export const FOOD_CATEGORY_ORDER: readonly FoodCategory[] = [
  "fruit",
  "veggie",
  "meal",
  "snack",
  "drink",
];

export const FOODS: readonly FoodItem[] = [
  // ── くだもの ────────────────────────────────────────────
  {
    id: "food-apple",
    name: "りんご",
    description: "あまずっぱい くだもの",
    icon: "🍎",
    price: 5,
    category: "fruit",
    effects: { hungerDelta: -20, moodDelta: 5 },
  },
  {
    id: "food-banana",
    name: "バナナ",
    description: "はらもちの いい くだもの",
    icon: "🍌",
    price: 4,
    category: "fruit",
    effects: { hungerDelta: -18, moodDelta: 4 },
  },
  {
    id: "food-orange",
    name: "みかん",
    description: "ビタミン たっぷり",
    icon: "🍊",
    price: 4,
    category: "fruit",
    effects: { hungerDelta: -12, moodDelta: 5, hpDelta: 3 },
  },
  {
    id: "food-strawberry",
    name: "いちご",
    description: "まっかで あまい",
    icon: "🍓",
    price: 6,
    category: "fruit",
    effects: { hungerDelta: -10, moodDelta: 10 },
  },
  {
    id: "food-grapes",
    name: "ぶどう",
    description: "つぶつぶ たのしい",
    icon: "🍇",
    price: 6,
    category: "fruit",
    effects: { hungerDelta: -15, moodDelta: 8 },
  },
  {
    id: "food-watermelon",
    name: "すいか",
    description: "なつの あじ",
    icon: "🍉",
    price: 8,
    category: "fruit",
    effects: { hungerDelta: -25, moodDelta: 8 },
  },
  {
    id: "food-peach",
    name: "もも",
    description: "やわらかくて ジューシー",
    icon: "🍑",
    price: 8,
    category: "fruit",
    effects: { hungerDelta: -18, moodDelta: 10 },
  },

  // ── やさい ──────────────────────────────────────────────
  {
    id: "food-carrot",
    name: "にんじん",
    description: "めに いい やさい",
    icon: "🥕",
    price: 5,
    category: "veggie",
    effects: { hungerDelta: -15, moodDelta: 2, hpDelta: 6 },
  },
  {
    id: "food-tomato",
    name: "トマト",
    description: "まっかに うれた",
    icon: "🍅",
    price: 5,
    category: "veggie",
    effects: { hungerDelta: -12, moodDelta: 3, hpDelta: 5 },
  },
  {
    id: "food-broccoli",
    name: "ブロッコリー",
    description: "からだが つよく なる",
    icon: "🥦",
    price: 7,
    category: "veggie",
    effects: { hungerDelta: -18, moodDelta: 1, hpDelta: 10 },
  },
  {
    id: "food-corn",
    name: "とうもろこし",
    description: "つぶつぶ あまい",
    icon: "🌽",
    price: 7,
    category: "veggie",
    effects: { hungerDelta: -25, moodDelta: 5, hpDelta: 3 },
  },
  {
    id: "food-sweetpotato",
    name: "やきいも",
    description: "ほくほく あったかい",
    icon: "🍠",
    price: 9,
    category: "veggie",
    effects: { hungerDelta: -35, moodDelta: 8 },
  },

  // ── ごはん ──────────────────────────────────────────────
  {
    id: "food-onigiri",
    name: "おにぎり",
    description: "しっかり おなかいっぱい",
    icon: "🍙",
    price: 10,
    category: "meal",
    effects: { hungerDelta: -45, moodDelta: 8 },
  },
  {
    id: "food-bread",
    name: "パン",
    description: "ふわふわの しょくパン",
    icon: "🍞",
    price: 8,
    category: "meal",
    effects: { hungerDelta: -35, moodDelta: 5 },
  },
  {
    id: "food-croissant",
    name: "クロワッサン",
    description: "サクサク バターの かおり",
    icon: "🥐",
    price: 10,
    category: "meal",
    effects: { hungerDelta: -30, moodDelta: 10 },
  },
  {
    id: "food-pancake",
    name: "ホットケーキ",
    description: "はちみつを たっぷり",
    icon: "🥞",
    price: 14,
    category: "meal",
    effects: { hungerDelta: -35, moodDelta: 15 },
  },
  {
    id: "food-friedegg",
    name: "めだまやき",
    description: "あさごはんの ていばん",
    icon: "🍳",
    price: 8,
    category: "meal",
    effects: { hungerDelta: -25, moodDelta: 6, hpDelta: 4 },
  },
  {
    id: "food-gyoza",
    name: "ぎょうざ",
    description: "パリッと やけた",
    icon: "🥟",
    price: 12,
    category: "meal",
    effects: { hungerDelta: -40, moodDelta: 10 },
  },
  {
    id: "food-shrimp",
    name: "エビフライ",
    description: "サクサク プリプリ",
    icon: "🍤",
    price: 14,
    category: "meal",
    effects: { hungerDelta: -35, moodDelta: 14 },
  },
  {
    id: "food-burger",
    name: "ハンバーガー",
    description: "がぶっと かぶりつこう",
    icon: "🍔",
    price: 15,
    category: "meal",
    effects: { hungerDelta: -55, moodDelta: 12 },
  },
  {
    id: "food-pizza",
    name: "ピザ",
    description: "チーズが とろ〜り",
    icon: "🍕",
    price: 16,
    category: "meal",
    effects: { hungerDelta: -55, moodDelta: 14 },
  },
  {
    id: "food-ramen",
    name: "ラーメン",
    description: "あつあつの スープ",
    icon: "🍜",
    price: 18,
    category: "meal",
    effects: { hungerDelta: -65, moodDelta: 15 },
  },
  {
    id: "food-curry",
    name: "カレーライス",
    description: "みんな だいすき",
    icon: "🍛",
    price: 18,
    category: "meal",
    effects: { hungerDelta: -70, moodDelta: 12 },
  },
  {
    id: "food-bento",
    name: "おべんとう",
    description: "えいよう まんてん",
    icon: "🍱",
    price: 20,
    category: "meal",
    effects: { hungerDelta: -70, moodDelta: 12, hpDelta: 8 },
  },
  {
    id: "food-meat",
    name: "ほねつき にく",
    description: "ワイルドに かぶりつけ",
    icon: "🍖",
    price: 20,
    category: "meal",
    effects: { hungerDelta: -60, moodDelta: 10, hpDelta: 10 },
  },
  {
    id: "food-sushi",
    name: "おすし",
    description: "とくべつな ひの ごちそう",
    icon: "🍣",
    price: 22,
    category: "meal",
    effects: { hungerDelta: -55, moodDelta: 18, hpDelta: 6 },
  },

  // ── おかし ──────────────────────────────────────────────
  {
    id: "food-candy",
    name: "キャンディ",
    description: "ちいさな ごほうび",
    icon: "🍬",
    price: 3,
    category: "snack",
    effects: { hungerDelta: -5, moodDelta: 8 },
  },
  {
    id: "food-senbei",
    name: "せんべい",
    description: "パリパリ しょうゆあじ",
    icon: "🍘",
    price: 6,
    category: "snack",
    effects: { hungerDelta: -20, moodDelta: 6 },
  },
  {
    id: "food-cookie",
    name: "クッキー",
    description: "サクサク あまい",
    icon: "🍪",
    price: 8,
    category: "snack",
    effects: { hungerDelta: -15, moodDelta: 14 },
  },
  {
    id: "food-dango",
    name: "だんご",
    description: "もちもち みたらし",
    icon: "🍡",
    price: 9,
    category: "snack",
    effects: { hungerDelta: -20, moodDelta: 12 },
  },
  {
    id: "food-chocolate",
    name: "チョコレート",
    description: "くちどけ なめらか",
    icon: "🍫",
    price: 10,
    category: "snack",
    effects: { hungerDelta: -12, moodDelta: 16 },
  },
  {
    id: "food-donut",
    name: "ドーナツ",
    description: "あなが あいてる",
    icon: "🍩",
    price: 12,
    category: "snack",
    effects: { hungerDelta: -25, moodDelta: 18 },
  },
  {
    id: "food-softcream",
    name: "ソフトクリーム",
    description: "ひんやり とける",
    icon: "🍦",
    price: 12,
    category: "snack",
    effects: { hungerDelta: -15, moodDelta: 20 },
  },
  {
    id: "food-pudding",
    name: "プリン",
    description: "ぷるぷる カラメル",
    icon: "🍮",
    price: 14,
    category: "snack",
    effects: { hungerDelta: -20, moodDelta: 20 },
  },
  {
    id: "food-cupcake",
    name: "カップケーキ",
    description: "クリームが もりもり",
    icon: "🧁",
    price: 15,
    category: "snack",
    effects: { hungerDelta: -20, moodDelta: 20 },
  },
  {
    id: "food-cake",
    name: "ショートケーキ",
    description: "とくべつな ごほうび",
    icon: "🍰",
    price: 25,
    category: "snack",
    effects: { hungerDelta: -35, moodDelta: 25, hpDelta: 12 },
  },
  {
    id: "food-birthday-cake",
    name: "バースデーケーキ",
    description: "おめでとうの ひに",
    icon: "🎂",
    price: 60,
    category: "snack",
    effects: { hungerDelta: -80, moodDelta: 40, hpDelta: 30 },
  },

  // ── のみもの ────────────────────────────────────────────
  {
    id: "food-tea",
    name: "おちゃ",
    description: "ほっと ひといき",
    icon: "🍵",
    price: 4,
    category: "drink",
    effects: { hungerDelta: -5, moodDelta: 6, hpDelta: 3 },
  },
  {
    id: "food-milk",
    name: "ミルク",
    description: "ほねが つよく なる",
    icon: "🥛",
    price: 5,
    category: "drink",
    effects: { hungerDelta: -10, moodDelta: 4, hpDelta: 6 },
  },
  {
    id: "food-juice",
    name: "ジュース",
    description: "あまくて ごくごく",
    icon: "🧃",
    price: 6,
    category: "drink",
    effects: { hungerDelta: -8, moodDelta: 10 },
  },
];

export function findFood(id: string): FoodItem | undefined {
  return FOODS.find((f) => f.id === id);
}

export function foodsByCategory(category: FoodCategory): FoodItem[] {
  return FOODS.filter((f) => f.category === category);
}
