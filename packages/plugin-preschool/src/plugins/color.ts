// いろ: 「あかは どれ？」→ 色の丸をタップ。
// レベル 3 は「りんごは なにいろ？」（物の色を答える）。

import type { PluginManifest } from "@kakimon/plugin-api";
import {
  el,
  emojiEl,
  pickCycle,
  pickOne,
  withDistractors,
  type TapQuestion,
} from "@kakimon/plugin-preschool-shared";
import { KIDS_DEFAULTS, defineTapQuizPlugin } from "../define";

interface Color {
  key: string;
  name: string;
  css: string;
  /** 白など薄い色は枠線で輪郭を出す */
  outline?: boolean;
}

const COLORS: readonly Color[] = [
  { key: "red", name: "あか", css: "#ef4444" },
  { key: "blue", name: "あお", css: "#3b82f6" },
  { key: "yellow", name: "きいろ", css: "#facc15" },
  { key: "green", name: "みどり", css: "#22c55e" },
  { key: "pink", name: "ピンク", css: "#f472b6" },
  { key: "orange", name: "オレンジ", css: "#fb923c" },
  { key: "purple", name: "むらさき", css: "#a855f7" },
  { key: "brown", name: "ちゃいろ", css: "#a16207" },
  { key: "black", name: "くろ", css: "#1f2937" },
  { key: "white", name: "しろ", css: "#ffffff", outline: true },
];

const SETS: Record<string, readonly string[]> = {
  "colors-3": ["red", "blue", "yellow"],
  "colors-6": ["red", "blue", "yellow", "green", "pink", "orange"],
  "colors-10": COLORS.map((c) => c.key),
};

/** 「もの」とその色。レベル 3 用。 */
const THINGS: readonly { emoji: string; name: string; color: string }[] = [
  { emoji: "🍎", name: "りんご", color: "red" },
  { emoji: "🍓", name: "いちご", color: "red" },
  { emoji: "🍅", name: "トマト", color: "red" },
  { emoji: "🍌", name: "バナナ", color: "yellow" },
  { emoji: "🌻", name: "ひまわり", color: "yellow" },
  { emoji: "🐣", name: "ひよこ", color: "yellow" },
  { emoji: "🫐", name: "ブルーベリー", color: "blue" },
  { emoji: "💧", name: "みずの しずく", color: "blue" },
  { emoji: "🥦", name: "ブロッコリー", color: "green" },
  { emoji: "🐸", name: "かえる", color: "green" },
  { emoji: "🍀", name: "クローバー", color: "green" },
  { emoji: "🍊", name: "みかん", color: "orange" },
  { emoji: "🥕", name: "にんじん", color: "orange" },
  { emoji: "🎃", name: "かぼちゃ", color: "orange" },
  { emoji: "🐷", name: "ぶた", color: "pink" },
  { emoji: "🌸", name: "さくら", color: "pink" },
  { emoji: "🍇", name: "ぶどう", color: "purple" },
  { emoji: "🍆", name: "なす", color: "purple" },
  { emoji: "🍫", name: "チョコレート", color: "brown" },
  { emoji: "🐻", name: "くま", color: "brown" },
];

function colorOf(key: string): Color {
  return COLORS.find((c) => c.key === key) ?? COLORS[0]!;
}

function swatchEl(c: Color): HTMLElement {
  const node = el("span", "kp-swatch");
  node.style.background = c.css;
  if (c.outline) node.classList.add("kp-swatch--outline");
  node.setAttribute("role", "img");
  node.setAttribute("aria-label", c.name);
  return node;
}

function build(difficulty: string, count: number): TapQuestion[] {
  if (difficulty === "colors-things") {
    const pool = SETS["colors-6"]!.map(colorOf);
    return pickCycle(THINGS, count, (a, b) => a.color === b.color).map(
      (thing, i) => {
        const answer = colorOf(thing.color);
        const choices = withDistractors(answer, pool, 3, (a, b) => a.key === b.key);
        return {
          id: `thing-${thing.emoji}-${i}`,
          text: `${thing.name}は なにいろ？`,
          art: emojiEl(thing.emoji, 120, thing.name),
          choices: choices.map((c) => ({ key: c.key, el: swatchEl(c), name: c.name })),
          answerKey: answer.key,
          answerSpeech: `${answer.name}！`,
        };
      }
    );
  }
  const keys = SETS[difficulty] ?? SETS["colors-3"]!;
  const pool = keys.map(colorOf);
  const choiceCount = pool.length >= 4 && difficulty !== "colors-3" ? 4 : 3;
  return pickCycle(pool, count, (a, b) => a.key === b.key).map((answer, i) => {
    const choices = withDistractors(answer, pool, choiceCount, (a, b) => a.key === b.key);
    const ask = pickOne(["は どれ？", "を さがして！"]);
    return {
      id: `${answer.key}-${i}`,
      text: `${answer.name}${ask}`,
      speech: `${answer.name}${ask === "は どれ？" ? "は どれ？" : "を さがして"}`,
      choices: choices.map((c) => ({ key: c.key, el: swatchEl(c), name: c.name })),
      answerKey: answer.key,
      answerSpeech: `${answer.name}！`,
    };
  });
}

const manifest: PluginManifest = {
  ...KIDS_DEFAULTS,
  id: "io.kakimon.preschool.color",
  name: "いろ あそび",
  description: "いわれた いろを タッチしよう",
  category: "other",
  icon: "🎨",
  difficulties: [
    { key: "colors-3", label: "あか・あお・きいろ", level: 1 },
    { key: "colors-6", label: "6しょく", level: 1 },
    { key: "colors-10", label: "10しょく", level: 2 },
    { key: "colors-things", label: "ものの いろ", level: 2 },
  ],
};

export const colorPlugin = defineTapQuizPlugin(manifest, build, {
  choiceSize: "xl",
});
