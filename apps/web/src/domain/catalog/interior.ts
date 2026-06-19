// へやのもようがえアイテム（壁紙・床・家具）のカタログ。実アセットは Phase 2 以降で
// 差し替え。MVP では「見た目だけ」変わる（ステータス効果は持たせない）。
// きせかえ（cosmetics）と同じく非消費アイテムで、買うと inventory に kind:"interior"
// として積まれ、へやに飾れるようになる。

export type InteriorCategory = "wallpaper" | "floor" | "furniture";

export interface InteriorItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  category: InteriorCategory;
  /**
   * 壁紙・床の見た目（CSS background 値）。furniture では使わない。
   * gameStore / HomeScreen がそのまま style に渡す。
   */
  background?: string;
}

export const CATEGORY_LABELS: Record<InteriorCategory, string> = {
  wallpaper: "かべがみ",
  floor: "ゆか",
  furniture: "かぐ",
};

// へやに同時に飾れる家具の数。多すぎるとモンスターが見えなくなるので制限する。
export const MAX_FURNITURE = 4;

export const INTERIORS: readonly InteriorItem[] = [
  // ── かべがみ ────────────────────────────────────────────
  {
    id: "wall-cream",
    name: "クリームの かべ",
    description: "やわらかい きいろの かべ",
    icon: "🟨",
    price: 20,
    category: "wallpaper",
    background: "linear-gradient(180deg, #fde68a 0%, #fef3c7 100%)",
  },
  {
    id: "wall-sky",
    name: "そらいろの かべ",
    description: "さわやかな みずいろ",
    icon: "🟦",
    price: 30,
    category: "wallpaper",
    background: "linear-gradient(180deg, #bae6fd 0%, #e0f2fe 100%)",
  },
  {
    id: "wall-sakura",
    name: "さくらの かべ",
    description: "はるの ピンクいろ",
    icon: "🌸",
    price: 35,
    category: "wallpaper",
    background: "linear-gradient(180deg, #fbcfe8 0%, #fce7f3 100%)",
  },
  {
    id: "wall-night",
    name: "よぞらの かべ",
    description: "ほしが きらめく よる",
    icon: "🌌",
    price: 60,
    category: "wallpaper",
    background:
      "radial-gradient(circle at 20% 20%, #fef08a 0 2px, transparent 3px), radial-gradient(circle at 70% 35%, #fef08a 0 2px, transparent 3px), radial-gradient(circle at 45% 60%, #fef08a 0 1.5px, transparent 2.5px), linear-gradient(180deg, #1e293b 0%, #334155 100%)",
  },

  // ── ゆか ────────────────────────────────────────────────
  {
    id: "floor-wood",
    name: "きの ゆか",
    description: "あたたかい もくめの ゆか",
    icon: "🟫",
    price: 20,
    category: "floor",
    background: "linear-gradient(180deg, #c8945f 0%, #a9743f 100%)",
  },
  {
    id: "floor-grass",
    name: "くさの ゆか",
    description: "ふかふかの みどり",
    icon: "🌱",
    price: 25,
    category: "floor",
    background: "linear-gradient(180deg, #86efac 0%, #4ade80 100%)",
  },
  {
    id: "floor-tatami",
    name: "たたみ",
    description: "おちつく わしつ",
    icon: "🟩",
    price: 30,
    category: "floor",
    background: "linear-gradient(180deg, #d9e6a3 0%, #bccb7e 100%)",
  },
  {
    id: "floor-carpet",
    name: "あかい カーペット",
    description: "ごうかな あかい じゅうたん",
    icon: "🟥",
    price: 45,
    category: "floor",
    background: "linear-gradient(180deg, #f87171 0%, #dc2626 100%)",
  },

  // ── かぐ ────────────────────────────────────────────────
  {
    id: "furn-plant",
    name: "かんようしょくぶつ",
    description: "みどりが ふえると げんきに",
    icon: "🪴",
    price: 25,
    category: "furniture",
  },
  {
    id: "furn-chair",
    name: "いす",
    description: "ひとやすみ できる いす",
    icon: "🪑",
    price: 30,
    category: "furniture",
  },
  {
    id: "furn-clock",
    name: "とけい",
    description: "かべに かける まるい とけい",
    icon: "🕰",
    price: 35,
    category: "furniture",
  },
  {
    id: "furn-lamp",
    name: "ランプ",
    description: "ほんわか あかるい あかり",
    icon: "🪔",
    price: 35,
    category: "furniture",
  },
  {
    id: "furn-books",
    name: "ほんだな",
    description: "ものしりに なれそう",
    icon: "📚",
    price: 40,
    category: "furniture",
  },
  {
    id: "furn-teddy",
    name: "クマの ぬいぐるみ",
    description: "なかよしの おともだち",
    icon: "🧸",
    price: 45,
    category: "furniture",
  },
  {
    id: "furn-balloon",
    name: "ふうせん",
    description: "パーティーきぶん",
    icon: "🎈",
    price: 30,
    category: "furniture",
  },
  {
    id: "furn-cactus",
    name: "サボテン",
    description: "ちくちく かわいい",
    icon: "🌵",
    price: 30,
    category: "furniture",
  },
];

export function findInterior(id: string): InteriorItem | undefined {
  return INTERIORS.find((i) => i.id === id);
}

export function interiorsByCategory(
  category: InteriorCategory
): InteriorItem[] {
  return INTERIORS.filter((i) => i.category === category);
}
