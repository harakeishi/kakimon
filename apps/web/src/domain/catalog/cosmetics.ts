// きせかえアイテム（装備）のカタログ。実アセットは Phase 2 以降で差し替え。
// docs/04-domain-model.md の EquipmentItem と対応。
// MVP では「見た目だけ」変わる（ステータス効果は持たせない）。
// ステータスボーナスを足したくなったら statBonus を追加して gameStore で
// 合算する形に拡張できる。

export type EquipmentSlot = "head" | "body" | "accessory";

export interface EquipmentItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  slot: EquipmentSlot;
}

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  head: "あたま",
  body: "ふく",
  accessory: "アクセサリ",
};

export const COSMETICS: readonly EquipmentItem[] = [
  // ── あたま ──────────────────────────────────────────────
  {
    id: "eq-cap",
    name: "キャップ",
    description: "スポーティな ぼうし",
    icon: "🧢",
    price: 20,
    slot: "head",
  },
  {
    id: "eq-strawhat",
    name: "むぎわらぼうし",
    description: "なつの おでかけに",
    icon: "👒",
    price: 25,
    slot: "head",
  },
  {
    id: "eq-tophat",
    name: "シルクハット",
    description: "ちょっと しんしな ぼうし",
    icon: "🎩",
    price: 45,
    slot: "head",
  },
  {
    id: "eq-gradcap",
    name: "はかせぼうし",
    description: "べんきょう だいすき",
    icon: "🎓",
    price: 50,
    slot: "head",
  },
  {
    id: "eq-crown",
    name: "おうかん",
    description: "キラキラ かがやく かんむり",
    icon: "👑",
    price: 100,
    slot: "head",
  },

  // ── アクセサリ ──────────────────────────────────────────
  {
    id: "eq-glasses",
    name: "めがね",
    description: "ちょっぴり ものしりに みえる",
    icon: "👓",
    price: 20,
    slot: "accessory",
  },
  {
    id: "eq-sunglasses",
    name: "サングラス",
    description: "クールに きめよう",
    icon: "🕶",
    price: 30,
    slot: "accessory",
  },
  {
    id: "eq-ribbon",
    name: "リボン",
    description: "かわいい あかい リボン",
    icon: "🎀",
    price: 20,
    slot: "accessory",
  },
  {
    id: "eq-ring",
    name: "ゆびわ",
    description: "とくべつな ひの ために",
    icon: "💍",
    price: 80,
    slot: "accessory",
  },

  // ── ふく ────────────────────────────────────────────────
  {
    id: "eq-tshirt",
    name: "Tシャツ",
    description: "ふだんぎの Tシャツ",
    icon: "👕",
    price: 20,
    slot: "body",
  },
  {
    id: "eq-necktie",
    name: "ネクタイ",
    description: "びしっと きめよう",
    icon: "👔",
    price: 30,
    slot: "body",
  },
  {
    id: "eq-scarf",
    name: "マフラー",
    description: "ふゆに あったか",
    icon: "🧣",
    price: 30,
    slot: "body",
  },
  {
    id: "eq-dress",
    name: "ワンピース",
    description: "おでかけ ようの ふく",
    icon: "👗",
    price: 40,
    slot: "body",
  },
  {
    id: "eq-labcoat",
    name: "はかせコート",
    description: "けんきゅうしゃ みたい",
    icon: "🥼",
    price: 70,
    slot: "body",
  },
];

export function findCosmetic(id: string): EquipmentItem | undefined {
  return COSMETICS.find((c) => c.id === id);
}

export function cosmeticsBySlot(slot: EquipmentSlot): EquipmentItem[] {
  return COSMETICS.filter((c) => c.slot === slot);
}
