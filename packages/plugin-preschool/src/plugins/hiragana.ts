// ひらがな タッチ: 「あ は どれ？」→ 文字をタップ。読む前の「見て分かる」練習。
// 書き取り（@kakimon/plugin-writing-hiragana）は 5 歳〜なので、その前段。
// 絵のヒント（あ → 🐜 あり）を添えて、音と絵と字を結びつける。

import type { PluginManifest } from "@kakimon/plugin-api";
import {
  el,
  emojiEl,
  pickCycle,
  withDistractors,
  type TapQuestion,
} from "@kakimon/plugin-preschool-shared";
import { KIDS_DEFAULTS, defineTapQuizPlugin } from "../define";

interface Kana {
  kana: string;
  /** その文字で始まる、絵で分かることば */
  word: string;
  emoji: string;
}

const ROWS: Record<string, readonly Kana[]> = {
  a: [
    { kana: "あ", word: "あり", emoji: "🐜" },
    { kana: "い", word: "いぬ", emoji: "🐶" },
    { kana: "う", word: "うさぎ", emoji: "🐰" },
    { kana: "え", word: "えんぴつ", emoji: "✏" },
    { kana: "お", word: "おにぎり", emoji: "🍙" },
  ],
  ka: [
    { kana: "か", word: "かえる", emoji: "🐸" },
    { kana: "き", word: "きりん", emoji: "🦒" },
    { kana: "く", word: "くま", emoji: "🐻" },
    { kana: "け", word: "けーき", emoji: "🍰" },
    { kana: "こ", word: "こあら", emoji: "🐨" },
  ],
  sa: [
    { kana: "さ", word: "さかな", emoji: "🐟" },
    { kana: "し", word: "しまうま", emoji: "🦓" },
    { kana: "す", word: "すいか", emoji: "🍉" },
    { kana: "せ", word: "せみ", emoji: "🪲" },
    { kana: "そ", word: "そら", emoji: "☁" },
  ],
  ta: [
    { kana: "た", word: "たまご", emoji: "🥚" },
    { kana: "ち", word: "ちょうちょ", emoji: "🦋" },
    { kana: "つ", word: "つき", emoji: "🌙" },
    { kana: "て", word: "てんとうむし", emoji: "🐞" },
    { kana: "と", word: "とり", emoji: "🐦" },
  ],
  na: [
    { kana: "な", word: "なす", emoji: "🍆" },
    { kana: "に", word: "にんじん", emoji: "🥕" },
    { kana: "ぬ", word: "ぬいぐるみ", emoji: "🧸" },
    { kana: "ね", word: "ねこ", emoji: "🐱" },
    { kana: "の", word: "のり", emoji: "🍙" },
  ],
  ha: [
    { kana: "は", word: "はな", emoji: "🌸" },
    { kana: "ひ", word: "ひよこ", emoji: "🐥" },
    { kana: "ふ", word: "ふね", emoji: "🚢" },
    { kana: "へ", word: "へび", emoji: "🐍" },
    { kana: "ほ", word: "ほし", emoji: "⭐" },
  ],
  ma: [
    { kana: "ま", word: "まめ", emoji: "🫘" },
    { kana: "み", word: "みかん", emoji: "🍊" },
    { kana: "む", word: "むし", emoji: "🐛" },
    { kana: "め", word: "めがね", emoji: "👓" },
    { kana: "も", word: "もも", emoji: "🍑" },
  ],
  ya: [
    { kana: "や", word: "やま", emoji: "⛰" },
    { kana: "ゆ", word: "ゆき", emoji: "❄" },
    { kana: "よ", word: "よっと", emoji: "⛵" },
  ],
  ra: [
    { kana: "ら", word: "らいおん", emoji: "🦁" },
    { kana: "り", word: "りんご", emoji: "🍎" },
    { kana: "る", word: "るびー", emoji: "💎" },
    { kana: "れ", word: "れもん", emoji: "🍋" },
    { kana: "ろ", word: "ろけっと", emoji: "🚀" },
  ],
  wa: [
    { kana: "わ", word: "わに", emoji: "🐊" },
    { kana: "を", word: "を", emoji: "🔤" },
    { kana: "ん", word: "ぱん", emoji: "🍞" },
  ],
};

const ALL: readonly Kana[] = Object.values(ROWS).flat();

const SETS: Record<string, readonly Kana[]> = {
  "row-a": ROWS.a!,
  "row-ka": ROWS.ka!,
  "row-sa": ROWS.sa!,
  "row-ta": ROWS.ta!,
  "row-na": ROWS.na!,
  "row-ha": ROWS.ha!,
  "row-ma": ROWS.ma!,
  "row-yarawa": [...ROWS.ya!, ...ROWS.ra!, ...ROWS.wa!],
  all: ALL,
};

function kanaEl(k: Kana): HTMLElement {
  return el("span", "kp-kana", k.kana);
}

function sameKana(a: Kana, b: Kana): boolean {
  return a.kana === b.kana;
}

function build(difficulty: string, count: number): TapQuestion[] {
  const pool = SETS[difficulty] ?? SETS["row-a"]!;
  // 似た形（ぬ/め、わ/れ など）が混ざる「ぜんぶ」だけ 4 択。
  const choiceCount = difficulty === "all" ? 4 : 3;
  return pickCycle(pool, count, sameKana).map((answer, i) => {
    const art = el("span", "kp-kana-hint");
    art.append(emojiEl(answer.emoji, 72, answer.word), el("span", "kp-kana-hint__word", answer.word));
    return {
      id: `kana-${answer.kana}-${i}`,
      text: `「${answer.kana}」は どれ？`,
      speech: `${answer.word}の、${answer.kana}、は どれ？`,
      art,
      choices: withDistractors(answer, pool, choiceCount, sameKana).map((k) => ({
        key: k.kana,
        el: kanaEl(k),
        name: k.kana,
      })),
      answerKey: answer.kana,
      answerSpeech: `${answer.kana}！ ${answer.word}の ${answer.kana}！`,
    };
  });
}

const manifest: PluginManifest = {
  ...KIDS_DEFAULTS,
  id: "io.kakimon.preschool.hiragana",
  name: "ひらがな タッチ",
  description: "いわれた もじを タッチしよう",
  category: "reading",
  icon: "あ",
  difficulties: [
    { key: "row-a", label: "あいうえお", level: 1 },
    { key: "row-ka", label: "かきくけこ", level: 1 },
    { key: "row-sa", label: "さしすせそ", level: 1 },
    { key: "row-ta", label: "たちつてと", level: 1 },
    { key: "row-na", label: "なにぬねの", level: 1 },
    { key: "row-ha", label: "はひふへほ", level: 2 },
    { key: "row-ma", label: "まみむめも", level: 2 },
    { key: "row-yarawa", label: "や・ら・わ", level: 2 },
    { key: "all", label: "ぜんぶ", level: 3 },
  ],
};

export const hiraganaTouchPlugin = defineTapQuizPlugin(manifest, build, {
  choiceSize: "xl",
});
