// 国旗クイズの出題データ。
//
// emoji はそのまま文字で持ち、表示時に OpenMoji のコードポイント名へ変換する
// （apps/web/scripts/sync-emoji.mjs が public/emoji/ に SVG を同期している）。
// 同期漏れがあっても img の onerror でネイティブ絵文字にフォールバックする。

export type Region = "asia" | "europe" | "americas" | "africa" | "oceania";

export interface Country {
  /** ISO 3166-1 alpha-2。countryShapes.ts のキーと一致させる */
  iso: string;
  /** 表示名 (ja)。ひらがな・カタカナで、ふりがな無しでも読めるようにする */
  name: string;
  region: Region;
  /**
   * ひよこが「身に着ける」もの（帽子・かんむりなど）。あたまに重ねて描く。
   * 頭に載せて自然な絵文字があるときだけ設定する。
   */
  wear?: string;
  /** ひよこが「楽しんでいる」もの（名物料理・動物・名所）。1〜2 個 */
  items: string[];
  /** 正解したあとに出す一言。ひらがな中心で短く */
  trivia: string;
}

export const COUNTRIES: readonly Country[] = [
  // ── アジア ──────────────────────────────────────────
  {
    iso: "JP",
    name: "にほん",
    region: "asia",
    items: ["🍣", "🗻"],
    trivia: "おすしと ふじさんが ゆうめいだよ",
  },
  {
    iso: "KR",
    name: "かんこく",
    region: "asia",
    items: ["🍲", "🎤"],
    trivia: "キムチと ケーポップの くに",
  },
  {
    iso: "CN",
    name: "ちゅうごく",
    region: "asia",
    items: ["🐼", "🥟"],
    trivia: "パンダと ぎょうざの くに",
  },
  {
    iso: "IN",
    name: "インド",
    region: "asia",
    items: ["🍛", "🐅"],
    trivia: "カレーと とらの くに",
  },
  {
    iso: "TH",
    name: "タイ",
    region: "asia",
    items: ["🐘", "🍤"],
    trivia: "ぞうと あまからい スープの くに",
  },
  {
    iso: "VN",
    name: "ベトナム",
    region: "asia",
    wear: "👒",
    items: ["🍜"],
    trivia: "とんがりぼうしと フォーの くに",
  },
  {
    iso: "ID",
    name: "インドネシア",
    region: "asia",
    items: ["🌋", "🦧"],
    trivia: "かざんと オランウータンの くに",
  },
  {
    iso: "TR",
    name: "トルコ",
    region: "asia",
    items: ["🥙", "🎈"],
    trivia: "ケバブと ききゅうの くに",
  },

  // ── ヨーロッパ ──────────────────────────────────────
  {
    iso: "IT",
    name: "イタリア",
    region: "europe",
    items: ["🍕", "🍝"],
    trivia: "ピザと パスタの くに",
  },
  {
    iso: "FR",
    name: "フランス",
    region: "europe",
    items: ["🥐", "🥖"],
    trivia: "クロワッサンと ながい パンの くに",
  },
  {
    iso: "DE",
    name: "ドイツ",
    region: "europe",
    items: ["🥨", "🚗"],
    trivia: "プレッツェルと くるまの くに",
  },
  {
    iso: "GB",
    name: "イギリス",
    region: "europe",
    wear: "👑",
    items: ["🫖"],
    trivia: "おうさまと こうちゃの くに",
  },
  {
    iso: "ES",
    name: "スペイン",
    region: "europe",
    items: ["🥘", "💃"],
    trivia: "パエリアと フラメンコの くに",
  },
  {
    iso: "CH",
    name: "スイス",
    region: "europe",
    items: ["🧀", "🏔"],
    trivia: "チーズと たかい やまの くに",
  },
  {
    iso: "NL",
    name: "オランダ",
    region: "europe",
    items: ["🌷", "🚲"],
    trivia: "チューリップと じてんしゃの くに",
  },
  {
    iso: "GR",
    name: "ギリシャ",
    region: "europe",
    items: ["🏛", "🫒"],
    trivia: "しろい しんでんと オリーブの くに",
  },
  {
    iso: "SE",
    name: "スウェーデン",
    region: "europe",
    items: ["🦌", "🌲"],
    trivia: "しかと もりの くに",
  },
  {
    iso: "NO",
    name: "ノルウェー",
    region: "europe",
    items: ["🐟", "❄️"],
    trivia: "さかなと ゆきの くに",
  },
  {
    iso: "RU",
    name: "ロシア",
    region: "europe",
    items: ["🪆", "🐻"],
    trivia: "マトリョーシカと くまの くに",
  },

  // ── アメリカたいりく ────────────────────────────────
  {
    iso: "US",
    name: "アメリカ",
    region: "americas",
    items: ["🍔", "🗽"],
    trivia: "ハンバーガーと じゆうのめがみの くに",
  },
  {
    iso: "CA",
    name: "カナダ",
    region: "americas",
    items: ["🍁", "🏒"],
    trivia: "メープルの はっぱと ホッケーの くに",
  },
  {
    iso: "MX",
    name: "メキシコ",
    region: "americas",
    wear: "👒",
    items: ["🌮", "🌵"],
    trivia: "タコスと サボテンの くに",
  },
  {
    iso: "BR",
    name: "ブラジル",
    region: "americas",
    items: ["⚽", "🦜"],
    trivia: "サッカーと カラフルな とりの くに",
  },
  {
    iso: "AR",
    name: "アルゼンチン",
    region: "americas",
    items: ["🥩", "🕺"],
    trivia: "おにくと タンゴの くに",
  },
  {
    iso: "PE",
    name: "ペルー",
    region: "americas",
    items: ["🦙", "🥔"],
    trivia: "リャマと じゃがいもの くに",
  },
  {
    iso: "CL",
    name: "チリ",
    region: "americas",
    items: ["🗿", "🍇"],
    trivia: "モアイと ぶどうの くに",
  },

  // ── アフリカ ────────────────────────────────────────
  {
    iso: "EG",
    name: "エジプト",
    region: "africa",
    items: ["🐫", "🐈"],
    trivia: "らくだと ねこの くに",
  },
  {
    iso: "KE",
    name: "ケニア",
    region: "africa",
    items: ["🦁", "🦒"],
    trivia: "ライオンと キリンの くに",
  },
  {
    iso: "ZA",
    name: "みなみアフリカ",
    region: "africa",
    items: ["🦓", "💎"],
    trivia: "シマウマと ダイヤの くに",
  },
  {
    iso: "NG",
    name: "ナイジェリア",
    region: "africa",
    items: ["🥁", "⚽"],
    trivia: "たいこと サッカーの くに",
  },
  {
    iso: "MA",
    name: "モロッコ",
    region: "africa",
    items: ["🕌", "🐪"],
    trivia: "まるい やねと らくだの くに",
  },
  {
    iso: "ET",
    name: "エチオピア",
    region: "africa",
    items: ["☕", "🏃"],
    trivia: "コーヒーと はやい ランナーの くに",
  },
  {
    iso: "MG",
    name: "マダガスカル",
    region: "africa",
    items: ["🐒", "🌴"],
    trivia: "サルと やしのきの おおきな しま",
  },

  // ── オセアニア ──────────────────────────────────────
  {
    iso: "AU",
    name: "オーストラリア",
    region: "oceania",
    items: ["🦘", "🐨"],
    trivia: "カンガルーと コアラの くに",
  },
  {
    iso: "NZ",
    name: "ニュージーランド",
    region: "oceania",
    items: ["🐑", "🥝"],
    trivia: "ひつじと キウイの くに",
  },
];

/** 難易度キー → 出題プール（ISO の配列）。 */
export const POOLS: Readonly<Record<string, readonly string[]>> = {
  // よく目にする国だけを集めた入門コース。
  "flags-popular": [
    "JP",
    "US",
    "FR",
    "IT",
    "GB",
    "DE",
    "CN",
    "KR",
    "CA",
    "BR",
    "AU",
  ],
  "flags-asia": ["JP", "KR", "CN", "IN", "TH", "VN", "ID", "TR"],
  "flags-europe": [
    "IT",
    "FR",
    "DE",
    "GB",
    "ES",
    "CH",
    "NL",
    "GR",
    "SE",
    "NO",
    "RU",
  ],
  "flags-americas": ["US", "CA", "MX", "BR", "AR", "PE", "CL"],
  "flags-africa-oceania": [
    "EG",
    "KE",
    "ZA",
    "NG",
    "MA",
    "ET",
    "MG",
    "AU",
    "NZ",
  ],
  "flags-world": COUNTRIES.map((c) => c.iso),
};

const BY_ISO = new Map(COUNTRIES.map((c) => [c.iso, c]));

export function findCountry(iso: string): Country | undefined {
  return BY_ISO.get(iso);
}
