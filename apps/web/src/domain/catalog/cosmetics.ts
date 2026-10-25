// きせかえアイテム（装備）のカタログ。実アセットは Phase 2 以降で差し替え。
// docs/04-domain-model.md の EquipmentItem と対応。
// MVP では「見た目だけ」変わる（ステータス効果は持たせない）。
// ステータスボーナスを足したくなったら statBonus を追加して gameStore で
// 合算する形に拡張できる。
//
// slot は「同時に 1 つしか着けられない枠」（保存データのキー）。
// wear は「モンスターのどこに描くか」で、slot とは独立に決める
// （例: ネクタイは slot:"body" だが首元に描く）。描画は
// components/spriteLayout.ts が担当する。

export type EquipmentSlot = "head" | "accessory" | "body" | "hand";

/**
 * アイテムを重ねる位置（モンスターの部位）。
 * 各段階ごとの実座標は components/spriteLayout.ts の STAGE_ANCHORS。
 * - headTop: 頭の上に乗せる（帽子）。アイテムの下端を合わせる。
 * - eyes:    目元に重ねる（めがね）。アイテムの中心を合わせる。
 * - headSide: 頭の横（リボン・花）。中心を合わせる。
 * - neck:    首元から下げる（ネクタイ・マフラー・ネックレス）。上端を合わせる。
 * - body:    からだに着る（シャツ・ワンピース）。上端を合わせる。
 * - hand:    手に持つ。中心を合わせる（balloon など align 指定可）。
 * - back:    背中（はね・リュック）。モンスターの後ろに描く。
 */
export type WearZone =
  | "headTop"
  | "eyes"
  | "headSide"
  | "neck"
  | "body"
  | "hand"
  | "back";

export interface WearSpec {
  zone: WearZone;
  /** ゾーン既定値に対する大きさの倍率（1 = 既定）。 */
  scale?: number;
  /** 微調整オフセット。モンスターの「頭の幅」を 1 とした単位。右・下が正。 */
  dx?: number;
  dy?: number;
  /** アイテムの中身のどこをアンカーに合わせるか（省略時はゾーン既定）。 */
  align?: "top" | "center" | "bottom";
}

export interface EquipmentItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  price: number;
  slot: EquipmentSlot;
  wear: WearSpec;
}

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  head: "あたま",
  accessory: "アクセサリ",
  body: "ふく",
  hand: "てもち",
};

/** ショップ・クローゼットでスロットを並べる順。 */
export const SLOT_ORDER: readonly EquipmentSlot[] = [
  "head",
  "accessory",
  "body",
  "hand",
];

export const COSMETICS: readonly EquipmentItem[] = [
  // ── あたま ──────────────────────────────────────────────
  {
    id: "eq-cap",
    name: "キャップ",
    description: "スポーティな ぼうし",
    icon: "🧢",
    price: 20,
    slot: "head",
    wear: { zone: "headTop" },
  },
  {
    id: "eq-strawhat",
    name: "むぎわらぼうし",
    description: "なつの おでかけに",
    icon: "👒",
    price: 25,
    slot: "head",
    wear: { zone: "headTop", scale: 1.25 },
  },
  {
    id: "eq-tophat",
    name: "シルクハット",
    description: "ちょっと しんしな ぼうし",
    icon: "🎩",
    price: 45,
    slot: "head",
    wear: { zone: "headTop", scale: 1.05, dy: 0.04 },
  },
  {
    id: "eq-gradcap",
    name: "はかせぼうし",
    description: "べんきょう だいすき",
    icon: "🎓",
    price: 50,
    slot: "head",
    wear: { zone: "headTop", scale: 1.2, dy: 0.06 },
  },
  {
    id: "eq-crown",
    name: "おうかん",
    description: "キラキラ かがやく かんむり",
    icon: "👑",
    price: 100,
    slot: "head",
    wear: { zone: "headTop", scale: 0.95, dy: -0.04 },
  },
  {
    id: "eq-helmet",
    name: "あんぜんヘルメット",
    description: "こうじげんばで はたらく",
    icon: "⛑",
    price: 30,
    slot: "head",
    wear: { zone: "headTop", scale: 1.1, dy: 0.1 },
  },
  {
    id: "eq-army-helmet",
    name: "ヘルメット",
    description: "ぼうけんに でかけよう",
    icon: "🪖",
    price: 35,
    slot: "head",
    wear: { zone: "headTop", scale: 1.1, dy: 0.1 },
  },
  {
    id: "eq-headphones",
    name: "ヘッドホン",
    description: "おんがくを きこう",
    icon: "🎧",
    price: 40,
    slot: "head",
    wear: { zone: "eyes", align: "center", scale: 1.2, dy: -0.12 },
  },
  {
    id: "eq-mushroom",
    name: "きのこぼうし",
    description: "もりの ようせい みたい",
    icon: "🍄",
    price: 35,
    slot: "head",
    wear: { zone: "headTop", scale: 1.0, dy: 0.08 },
  },
  {
    id: "eq-sunflower",
    name: "ひまわりぼうし",
    description: "なつの たいよう",
    icon: "🌻",
    price: 30,
    slot: "head",
    wear: { zone: "headTop", scale: 0.9, dy: 0.04 },
  },
  {
    id: "eq-strawberry",
    name: "いちごぼうし",
    description: "あまい においが しそう",
    icon: "🍓",
    price: 30,
    slot: "head",
    wear: { zone: "headTop", scale: 0.8, dy: 0.08 },
  },
  {
    id: "eq-pumpkin",
    name: "かぼちゃぼうし",
    description: "ハロウィンの よるに",
    icon: "🎃",
    price: 40,
    slot: "head",
    wear: { zone: "headTop", scale: 0.95, dy: 0.08 },
  },
  {
    id: "eq-xmas-tree",
    name: "ツリーぼうし",
    description: "メリークリスマス！",
    icon: "🎄",
    price: 45,
    slot: "head",
    wear: { zone: "headTop", scale: 0.75, dy: 0.02 },
  },
  {
    id: "eq-softcream",
    name: "ソフトクリームぼうし",
    description: "とけないうちに",
    icon: "🍦",
    price: 35,
    slot: "head",
    wear: { zone: "headTop", scale: 0.7, dy: 0.02 },
  },
  {
    id: "eq-cupcake",
    name: "カップケーキぼうし",
    description: "おかしの くにから",
    icon: "🧁",
    price: 40,
    slot: "head",
    wear: { zone: "headTop", scale: 0.8, dy: 0.04 },
  },

  // ── アクセサリ ──────────────────────────────────────────
  {
    id: "eq-glasses",
    name: "めがね",
    description: "ちょっぴり ものしりに みえる",
    icon: "👓",
    price: 20,
    slot: "accessory",
    wear: { zone: "eyes" },
  },
  {
    id: "eq-sunglasses",
    name: "サングラス",
    description: "クールに きめよう",
    icon: "🕶",
    price: 30,
    slot: "accessory",
    wear: { zone: "eyes" },
  },
  {
    id: "eq-goggles",
    name: "ゴーグル",
    description: "プールでも へいき",
    icon: "🥽",
    price: 30,
    slot: "accessory",
    wear: { zone: "eyes", scale: 1.05 },
  },
  {
    id: "eq-ribbon",
    name: "リボン",
    description: "かわいい あかい リボン",
    icon: "🎀",
    price: 20,
    slot: "accessory",
    wear: { zone: "headSide" },
  },
  {
    id: "eq-sakura",
    name: "さくらの はなかざり",
    description: "はるの おしゃれ",
    icon: "🌸",
    price: 25,
    slot: "accessory",
    wear: { zone: "headSide" },
  },
  {
    id: "eq-clover",
    name: "よつばの クローバー",
    description: "しあわせが くるかも",
    icon: "🍀",
    price: 35,
    slot: "accessory",
    wear: { zone: "headSide", scale: 0.95 },
  },
  {
    id: "eq-butterfly",
    name: "ちょうちょ",
    description: "あたまに とまった",
    icon: "🦋",
    price: 40,
    slot: "accessory",
    wear: { zone: "headSide", scale: 1.1, dy: -0.08 },
  },
  {
    id: "eq-bee",
    name: "ミツバチ",
    description: "なかよしの ハチ",
    icon: "🐝",
    price: 40,
    slot: "accessory",
    wear: { zone: "headSide", scale: 1.0, dx: 0.12, dy: -0.16 },
  },
  {
    id: "eq-necklace",
    name: "ネックレス",
    description: "キラリと ひかる",
    icon: "📿",
    price: 45,
    slot: "accessory",
    wear: { zone: "neck", scale: 1.1, dy: -0.06 },
  },
  {
    id: "eq-medal",
    name: "メダル",
    description: "がんばった しるし",
    icon: "🏅",
    price: 50,
    slot: "accessory",
    wear: { zone: "neck", scale: 0.85 },
  },
  {
    id: "eq-gold-medal",
    name: "きんメダル",
    description: "いちばんの あかし",
    icon: "🥇",
    price: 90,
    slot: "accessory",
    wear: { zone: "neck", scale: 0.85 },
  },
  {
    id: "eq-gem",
    name: "ほうせきの ブローチ",
    description: "むねもとで かがやく",
    icon: "💎",
    price: 70,
    slot: "accessory",
    wear: { zone: "neck", scale: 0.55, dy: 0.1 },
  },
  {
    id: "eq-star-badge",
    name: "ほしの バッジ",
    description: "キラキラ ひかる ほし",
    icon: "⭐",
    price: 25,
    slot: "accessory",
    wear: { zone: "neck", scale: 0.55, dy: 0.1 },
  },
  {
    id: "eq-ring",
    name: "ゆびわ",
    description: "とくべつな ひの ために",
    icon: "💍",
    price: 80,
    slot: "accessory",
    wear: { zone: "hand", scale: 0.7 },
  },
  {
    id: "eq-backpack",
    name: "リュック",
    description: "おでかけの じゅんび",
    icon: "🎒",
    price: 40,
    slot: "accessory",
    wear: { zone: "back", scale: 0.6, dx: -0.35, dy: -0.15 },
  },
  {
    id: "eq-wings",
    name: "てんしの はね",
    description: "そらを とべそう",
    icon: "🪽",
    price: 120,
    slot: "accessory",
    wear: { zone: "back", scale: 0.9, dx: -0.4, dy: -0.45 },
  },

  // ── ふく ────────────────────────────────────────────────
  {
    id: "eq-tshirt",
    name: "Tシャツ",
    description: "ふだんぎの Tシャツ",
    icon: "👕",
    price: 20,
    slot: "body",
    wear: { zone: "body" },
  },
  {
    id: "eq-necktie",
    name: "ネクタイ",
    description: "びしっと きめよう",
    icon: "👔",
    price: 30,
    slot: "body",
    wear: { zone: "neck", scale: 1.0, dy: -0.08 },
  },
  {
    id: "eq-scarf",
    name: "マフラー",
    description: "ふゆに あったか",
    icon: "🧣",
    price: 30,
    slot: "body",
    wear: { zone: "neck", scale: 1.05, dy: -0.18 },
  },
  {
    id: "eq-dress",
    name: "ワンピース",
    description: "おでかけ ようの ふく",
    icon: "👗",
    price: 40,
    slot: "body",
    wear: { zone: "body", scale: 0.7 },
  },
  {
    id: "eq-labcoat",
    name: "はかせコート",
    description: "けんきゅうしゃ みたい",
    icon: "🥼",
    price: 70,
    slot: "body",
    wear: { zone: "body", scale: 0.85 },
  },
  {
    id: "eq-vest",
    name: "あんぜんベスト",
    description: "ピカピカ ひかる ベスト",
    icon: "🦺",
    price: 30,
    slot: "body",
    wear: { zone: "body", scale: 0.85 },
  },
  {
    id: "eq-blouse",
    name: "ブラウス",
    description: "ひらひら かわいい",
    icon: "👚",
    price: 35,
    slot: "body",
    wear: { zone: "body", scale: 1.0 },
  },
  {
    id: "eq-coat",
    name: "コート",
    description: "さむい ひも あたたか",
    icon: "🧥",
    price: 55,
    slot: "body",
    wear: { zone: "body", scale: 0.8 },
  },
  {
    id: "eq-kimono",
    name: "きもの",
    description: "おまつりや おしょうがつに",
    icon: "👘",
    price: 80,
    slot: "body",
    wear: { zone: "body", scale: 0.9 },
  },
  {
    id: "eq-swimsuit",
    name: "みずぎ",
    description: "プールへ いこう",
    icon: "🩱",
    price: 35,
    slot: "body",
    wear: { zone: "body", scale: 0.7 },
  },
  {
    id: "eq-dougi",
    name: "どうぎ",
    description: "おす！ つよく なるぞ",
    icon: "🥋",
    price: 60,
    slot: "body",
    wear: { zone: "body", scale: 1.0 },
  },
  {
    id: "eq-running",
    name: "ランニングシャツ",
    description: "はしるのが はやく なりそう",
    icon: "🎽",
    price: 30,
    slot: "body",
    wear: { zone: "body", scale: 0.85 },
  },
  {
    id: "eq-sari",
    name: "サリー",
    description: "あざやかな いろの ふく",
    icon: "🥻",
    price: 70,
    slot: "body",
    wear: { zone: "body", scale: 0.7 },
  },

  // ── てもち ──────────────────────────────────────────────
  {
    id: "eq-pencil",
    name: "えんぴつ",
    description: "べんきょうの あいぼう",
    icon: "✏",
    price: 15,
    slot: "hand",
    wear: { zone: "hand", scale: 1.1 },
  },
  {
    id: "eq-crayon",
    name: "クレヨン",
    description: "おえかき しよう",
    icon: "🖍",
    price: 15,
    slot: "hand",
    wear: { zone: "hand", scale: 1.1 },
  },
  {
    id: "eq-wand",
    name: "まほうの つえ",
    description: "ビビデバビデブー",
    icon: "🪄",
    price: 60,
    slot: "hand",
    wear: { zone: "hand", scale: 1.2 },
  },
  {
    id: "eq-balloon",
    name: "ふうせん",
    description: "とんでいかないように",
    icon: "🎈",
    price: 25,
    slot: "hand",
    wear: { zone: "hand", scale: 1.3, align: "bottom", dy: 0.1 },
  },
  {
    id: "eq-umbrella",
    name: "かさ",
    description: "あめの ひも へいき",
    icon: "☂",
    price: 30,
    slot: "hand",
    wear: { zone: "hand", scale: 1.6, align: "bottom", dy: 0.15 },
  },
  {
    id: "eq-lollipop",
    name: "ペロペロキャンディ",
    description: "おおきな あめ",
    icon: "🍭",
    price: 20,
    slot: "hand",
    wear: { zone: "hand", scale: 1.1 },
  },
  {
    id: "eq-guitar",
    name: "ギター",
    description: "ジャカジャカ ひこう",
    icon: "🎸",
    price: 70,
    slot: "hand",
    wear: { zone: "hand", scale: 1.6, dx: -0.1 },
  },
  {
    id: "eq-violin",
    name: "バイオリン",
    description: "きれいな ねいろ",
    icon: "🎻",
    price: 75,
    slot: "hand",
    wear: { zone: "hand", scale: 1.5, dx: -0.1 },
  },
  {
    id: "eq-mic",
    name: "マイク",
    description: "うたって おどろう",
    icon: "🎤",
    price: 40,
    slot: "hand",
    wear: { zone: "hand", scale: 1.0 },
  },
  {
    id: "eq-crystal",
    name: "すいしょうだま",
    description: "みらいが みえるかも",
    icon: "🔮",
    price: 80,
    slot: "hand",
    wear: { zone: "hand", scale: 1.0 },
  },
  {
    id: "eq-camera",
    name: "カメラ",
    description: "はい チーズ！",
    icon: "📷",
    price: 50,
    slot: "hand",
    wear: { zone: "hand", scale: 1.1 },
  },
  {
    id: "eq-basketball",
    name: "バスケットボール",
    description: "シュートを きめよう",
    icon: "🏀",
    price: 30,
    slot: "hand",
    wear: { zone: "hand", scale: 1.0 },
  },
  {
    id: "eq-baseball",
    name: "やきゅうボール",
    description: "キャッチボール しよう",
    icon: "⚾",
    price: 25,
    slot: "hand",
    wear: { zone: "hand", scale: 0.8 },
  },
  {
    id: "eq-soccer",
    name: "サッカーボール",
    description: "ゴールを ねらえ",
    icon: "⚽",
    price: 30,
    slot: "hand",
    wear: { zone: "hand", scale: 1.0 },
  },
  {
    id: "eq-tennis",
    name: "テニスボール",
    description: "ポンポン はずむ",
    icon: "🎾",
    price: 20,
    slot: "hand",
    wear: { zone: "hand", scale: 0.7 },
  },
  {
    id: "eq-yoyo",
    name: "ヨーヨー",
    description: "くるくる まわる",
    icon: "🪀",
    price: 20,
    slot: "hand",
    wear: { zone: "hand", scale: 0.9 },
  },
  {
    id: "eq-teddy",
    name: "クマの ぬいぐるみ",
    description: "いつも いっしょ",
    icon: "🧸",
    price: 45,
    slot: "hand",
    wear: { zone: "hand", scale: 1.2 },
  },
  {
    id: "eq-gloves",
    name: "てぶくろ",
    description: "ふゆの おともに",
    icon: "🧤",
    price: 25,
    slot: "hand",
    wear: { zone: "hand", scale: 1.0 },
  },
  {
    id: "eq-fan",
    name: "せんす",
    description: "パタパタ あおごう",
    icon: "🪭",
    price: 35,
    slot: "hand",
    wear: { zone: "hand", scale: 1.3 },
  },
];

export function findCosmetic(id: string): EquipmentItem | undefined {
  return COSMETICS.find((c) => c.id === id);
}

export function cosmeticsBySlot(slot: EquipmentSlot): EquipmentItem[] {
  return COSMETICS.filter((c) => c.slot === slot);
}
