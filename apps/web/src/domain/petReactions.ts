// なでた（撫でた）ときのリアクション・パターン定義。
// 1 回なでるごとに、ここからランダムに 1 つ選んで吹き出し＋絵文字を出す。
// 3 歳児が声に出して読んであげやすい短いことばにする。

/** 吹き出しの見た目バリエーション（色だけ変える） */
export type PetBubbleVariant = "love" | "happy" | "star" | "music";

export interface PetReaction {
  id: string;
  /** 吹き出しに出すコメント */
  comment: string;
  /** ふわっと舞い上がる絵文字の候補（複数パターン） */
  emojis: string[];
  variant: PetBubbleVariant;
}

// 撫でリアクションの全パターン。コメントと絵文字（ハート・星・音符など）を
// 組み合わせた複数パターンを用意し、なでるたびに表情が変わるようにする。
export const PET_REACTIONS: readonly PetReaction[] = [
  {
    id: "love",
    comment: "なでなで だいすき♡",
    emojis: ["❤️", "💕", "💗"],
    variant: "love",
  },
  {
    id: "happy",
    comment: "きもちいい〜",
    emojis: ["😊", "✨", "💛"],
    variant: "happy",
  },
  {
    id: "star",
    comment: "うれしいな！",
    emojis: ["⭐", "🌟", "✨"],
    variant: "star",
  },
  {
    id: "music",
    comment: "ふふ〜ん♪",
    emojis: ["🎵", "🎶", "💕"],
    variant: "music",
  },
  {
    id: "more",
    comment: "もっと なでて〜",
    emojis: ["💞", "🌸", "💕"],
    variant: "love",
  },
  {
    id: "giggle",
    comment: "くすぐったいよ〜",
    emojis: ["😆", "💫", "⭐"],
    variant: "happy",
  },
  {
    id: "shy",
    comment: "えへへ…",
    emojis: ["☺️", "💗", "✨"],
    variant: "love",
  },
  {
    id: "fun",
    comment: "たのしい！",
    emojis: ["🎉", "⭐", "🎶"],
    variant: "star",
  },
];

/**
 * 撫でリアクションを 1 つ選ぶ。直前と同じパターンは避けて、
 * なでるたびに違う反応が返るようにする。
 */
export function pickPetReaction(prevId?: string): PetReaction {
  const pool =
    prevId === undefined
      ? PET_REACTIONS
      : PET_REACTIONS.filter((r) => r.id !== prevId);
  const list = pool.length > 0 ? pool : PET_REACTIONS;
  return list[Math.floor(Math.random() * list.length)]!;
}
