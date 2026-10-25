// おおきい・ちいさい: 同じものを 3 つの大きさで並べ、「いちばん おおきいのは？」。
// レベル 2 は ながい・みじかい（棒）と たかい・ひくい（塔）。

import type { PluginManifest } from "@kakimon/plugin-api";
import {
  el,
  emojiEl,
  pickOne,
  shuffled,
  type TapChoice,
  type TapQuestion,
} from "@kakimon/plugin-preschool-shared";
import { KIDS_DEFAULTS, defineTapQuizPlugin } from "../define";
import { THING_POOLS, type Thing } from "./things";

const POOL: readonly Thing[] = [
  ...THING_POOLS.ANIMALS_1,
  ...THING_POOLS.FOODS_1,
  ...THING_POOLS.VEHICLES_1,
];

const SIZES = [38, 64, 100] as const;

function sizeQuestions(count: number, mode: "big" | "small" | "mix"): TapQuestion[] {
  const out: TapQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const thing = pickOne(POOL);
    const askBig = mode === "big" ? true : mode === "small" ? false : i % 2 === 0;
    const order = shuffled([0, 1, 2]);
    const choices: TapChoice[] = order.map((sz) => ({
      key: String(sz),
      el: wrapFixed(emojiEl(thing.emoji, SIZES[sz]!, thing.name)),
      name: sz === 2 ? "おおきい" : sz === 0 ? "ちいさい" : "ちゅうくらい",
    }));
    out.push({
      id: `size-${thing.emoji}-${i}`,
      text: askBig ? "いちばん おおきいのは？" : "いちばん ちいさいのは？",
      speech: askBig
        ? `いちばん おおきい ${thing.name}は どれ？`
        : `いちばん ちいさい ${thing.name}は どれ？`,
      choices,
      answerKey: askBig ? "2" : "0",
      answerSpeech: askBig ? "おおきい！" : "ちいさい！",
    });
  }
  return out;
}

/** 選択肢の枠の高さを揃える（小さい絵でも押しやすいように）。 */
function wrapFixed(node: HTMLElement): HTMLElement {
  const wrap = el("span", "kp-size-slot");
  wrap.appendChild(node);
  return wrap;
}

function barEl(length: number, vertical: boolean, color: string): HTMLElement {
  const bar = el("span", vertical ? "kp-bar kp-bar--v" : "kp-bar");
  bar.style.background = color;
  if (vertical) bar.style.height = `${length}px`;
  else bar.style.width = `${length}px`;
  return bar;
}

function lengthQuestions(count: number): TapQuestion[] {
  const out: TapQuestion[] = [];
  const colors = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];
  for (let i = 0; i < count; i++) {
    const vertical = i % 2 === 1;
    const askLong = Math.random() < 0.5;
    const lengths = shuffled([40, 80, 120]);
    const color = pickOne(colors);
    const choices: TapChoice[] = lengths.map((len) => ({
      key: String(len),
      el: wrapFixed(barEl(len, vertical, color)),
      name: len === 120 ? (vertical ? "たかい" : "ながい") : len === 40 ? (vertical ? "ひくい" : "みじかい") : "ちゅうくらい",
    }));
    const text = vertical
      ? askLong
        ? "いちばん たかいのは？"
        : "いちばん ひくいのは？"
      : askLong
        ? "いちばん ながいのは？"
        : "いちばん みじかいのは？";
    out.push({
      id: `len-${i}`,
      text,
      choices,
      answerKey: askLong ? "120" : "40",
      answerSpeech: vertical ? (askLong ? "たかい！" : "ひくい！") : askLong ? "ながい！" : "みじかい！",
    });
  }
  return out;
}

const manifest: PluginManifest = {
  ...KIDS_DEFAULTS,
  id: "io.kakimon.preschool.size",
  name: "おおきい ちいさい",
  description: "おおきさを くらべよう",
  category: "math",
  icon: "🐘",
  difficulties: [
    { key: "size-big", label: "おおきいのは？", level: 1 },
    { key: "size-small", label: "ちいさいのは？", level: 1 },
    { key: "size-mix", label: "おおきい・ちいさい", level: 2 },
    { key: "length", label: "ながい・たかい", level: 2 },
  ],
};

export const sizePlugin = defineTapQuizPlugin(manifest, (d, n) => {
  if (d === "length") return lengthQuestions(n);
  if (d === "size-small") return sizeQuestions(n, "small");
  if (d === "size-mix") return sizeQuestions(n, "mix");
  return sizeQuestions(n, "big");
});
