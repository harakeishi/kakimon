// かたち: 「まるは どれ？」→ 図形をタップ。
// 1 問の中では色を揃え、「形だけ」が違う状態で見せる（色に引っ張られないように）。

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

const SVG_NS = "http://www.w3.org/2000/svg";

interface Shape {
  key: string;
  name: string;
  /** viewBox 0 0 100 100 の path */
  d: string;
}

const SHAPES: readonly Shape[] = [
  { key: "circle", name: "まる", d: "M50 6a44 44 0 1 1 0 88a44 44 0 1 1 0-88z" },
  { key: "triangle", name: "さんかく", d: "M50 8L94 90H6z" },
  { key: "square", name: "しかく", d: "M10 10h80v80H10z" },
  {
    key: "star",
    name: "ほし",
    d: "M50 5l13.5 29.2 31.9 3.7-23.6 21.8 6.3 31.5L50 75.4 21.9 91.2l6.3-31.5L4.6 37.9l31.9-3.7z",
  },
  {
    key: "heart",
    name: "ハート",
    d: "M50 90C20 66 6 52 6 34 6 20 17 10 29 10c9 0 16 5 21 12 5-7 12-12 21-12 12 0 23 10 23 24 0 18-14 32-44 56z",
  },
  { key: "diamond", name: "ひしがた", d: "M50 4L94 50 50 96 6 50z" },
  {
    key: "crescent",
    name: "みかづき",
    d: "M62 6a44 44 0 1 0 0 88a36 36 0 1 1 0-88z",
  },
];

const PALETTE = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"];

const SETS: Record<string, readonly string[]> = {
  "shapes-3": ["circle", "triangle", "square"],
  "shapes-5": ["circle", "triangle", "square", "star", "heart"],
  "shapes-7": SHAPES.map((s) => s.key),
};

/** 身の回りの「まるい もの」など。レベル 3 用。 */
const THINGS: readonly { emoji: string; name: string; shape: string }[] = [
  { emoji: "⚽", name: "サッカーボール", shape: "circle" },
  { emoji: "🍊", name: "みかん", shape: "circle" },
  { emoji: "🎈", name: "ふうせん", shape: "circle" },
  { emoji: "🕰", name: "とけい", shape: "circle" },
  { emoji: "🍕", name: "ピザ", shape: "triangle" },
  { emoji: "⛺", name: "テント", shape: "triangle" },
  { emoji: "🔺", name: "さんかくの しるし", shape: "triangle" },
  { emoji: "🎁", name: "プレゼント", shape: "square" },
  { emoji: "📦", name: "はこ", shape: "square" },
  { emoji: "🧱", name: "レンガ", shape: "square" },
  { emoji: "⭐", name: "ほし", shape: "star" },
  { emoji: "🌟", name: "きらきらぼし", shape: "star" },
  { emoji: "❤", name: "ハート", shape: "heart" },
  { emoji: "💗", name: "ピンクの ハート", shape: "heart" },
];

function shapeOf(key: string): Shape {
  return SHAPES.find((s) => s.key === key) ?? SHAPES[0]!;
}

function shapeEl(s: Shape, color: string): HTMLElement {
  const wrap = el("span", "kp-shape");
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", s.name);
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", s.d);
  path.setAttribute("fill", color);
  path.setAttribute("stroke", "#1f2937");
  path.setAttribute("stroke-width", "4");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  wrap.appendChild(svg);
  return wrap;
}

function build(difficulty: string, count: number): TapQuestion[] {
  if (difficulty === "shapes-things") {
    return pickCycle(THINGS, count, (a, b) => a.shape === b.shape).map(
      (thing, i) => {
        const shape = shapeOf(thing.shape);
        const choices = withDistractors(thing, THINGS, 3, (a, b) => a.shape === b.shape);
        return {
          id: `thing-${thing.emoji}-${i}`,
          text: `${shape.name}い ものは どれ？`,
          speech: `${shape.name}の かたちは どれ？`,
          art: shapeEl(shape, "#94a3b8"),
          choices: choices.map((t) => ({
            key: t.emoji,
            el: emojiEl(t.emoji, 88, t.name),
            name: t.name,
          })),
          answerKey: thing.emoji,
          answerSpeech: `${thing.name}！`,
        };
      }
    );
  }
  const keys = SETS[difficulty] ?? SETS["shapes-3"]!;
  const pool = keys.map(shapeOf);
  const choiceCount = pool.length >= 5 ? 4 : 3;
  return pickCycle(pool, count, (a, b) => a.key === b.key).map((answer, i) => {
    const color = pickOne(PALETTE);
    const choices = withDistractors(answer, pool, choiceCount, (a, b) => a.key === b.key);
    return {
      id: `${answer.key}-${i}`,
      text: `${answer.name}は どれ？`,
      choices: choices.map((s) => ({ key: s.key, el: shapeEl(s, color), name: s.name })),
      answerKey: answer.key,
      answerSpeech: `${answer.name}！`,
    };
  });
}

const manifest: PluginManifest = {
  ...KIDS_DEFAULTS,
  id: "io.kakimon.preschool.shape",
  name: "かたち あそび",
  description: "まる・さんかく・しかくを みつけよう",
  category: "other",
  icon: "🔷",
  difficulties: [
    { key: "shapes-3", label: "まる・さんかく・しかく", level: 1 },
    { key: "shapes-5", label: "ほし・ハートも", level: 1 },
    { key: "shapes-7", label: "7つの かたち", level: 2 },
    { key: "shapes-things", label: "かたちの もの", level: 2 },
  ],
};

export const shapePlugin = defineTapQuizPlugin(manifest, build, {
  choiceSize: "xl",
});
