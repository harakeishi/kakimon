// かず: 「いくつ あるかな？」→ 数字をタップ。レベル 2 には「おおい ほうは どっち？」。

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

const THINGS: readonly { emoji: string; name: string }[] = [
  { emoji: "🍎", name: "りんご" },
  { emoji: "🍓", name: "いちご" },
  { emoji: "🐣", name: "ひよこ" },
  { emoji: "⭐", name: "ほし" },
  { emoji: "🎈", name: "ふうせん" },
  { emoji: "🐶", name: "いぬ" },
  { emoji: "🍬", name: "あめ" },
  { emoji: "🌸", name: "はな" },
  { emoji: "🚗", name: "くるま" },
  { emoji: "🐟", name: "さかな" },
];

const RANGES: Record<string, number> = {
  "count-3": 3,
  "count-5": 5,
  "count-10": 10,
  "count-more": 5,
};

const JA_NUM = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう", "じゅう"];

function groupEl(emoji: string, n: number, px: number, name: string): HTMLElement {
  const wrap = el("span", "kp-count-group");
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", `${name} ${n}こ`);
  // 5 個までは 1 行、それ以上は 5 個ずつ折り返す（指で数えやすい並び）。
  wrap.style.setProperty("--kp-count-cols", String(Math.min(n, 5)));
  for (let i = 0; i < n; i++) wrap.appendChild(emojiEl(emoji, px));
  return wrap;
}

function digitEl(n: number): HTMLElement {
  return el("span", "kp-digit", String(n));
}

/** 答え n の近くから 3 つの数字の選択肢を作る（1..max の範囲）。 */
function digitChoices(n: number, max: number): number[] {
  const set = new Set<number>([n]);
  const candidates = shuffled(
    Array.from({ length: max }, (_, i) => i + 1).filter((x) => x !== n)
  );
  // 近い数を優先して混ぜる（1 と 10 のような離れた比較より学びになる）。
  candidates.sort((a, b) => Math.abs(a - n) - Math.abs(b - n) + (Math.random() - 0.5));
  for (const c of candidates) {
    if (set.size >= 3) break;
    set.add(c);
  }
  return shuffled([...set]);
}

function build(difficulty: string, count: number): TapQuestion[] {
  const max = RANGES[difficulty] ?? 3;
  const out: TapQuestion[] = [];
  let prevN = -1;
  for (let i = 0; i < count; i++) {
    const thing = pickOne(THINGS);
    if (difficulty === "count-more") {
      // 2 つのグループを並べ、「おおい ほう」「すくない ほう」を選ぶ。
      let a = 1 + Math.floor(Math.random() * max);
      let b = 1 + Math.floor(Math.random() * max);
      while (b === a) b = 1 + Math.floor(Math.random() * max);
      if (i % 2 === 1) [a, b] = [b, a];
      const askMore = Math.random() < 0.6;
      const answer = askMore ? Math.max(a, b) : Math.min(a, b);
      const choices: TapChoice[] = [a, b].map((n, j) => ({
        key: `${j}:${n}`,
        el: groupEl(thing.emoji, n, 40, thing.name),
        name: `${n}こ`,
      }));
      out.push({
        id: `more-${a}-${b}-${i}`,
        text: askMore ? "おおい ほうは どっち？" : "すくない ほうは どっち？",
        choices,
        answerKey: choices[a === answer ? 0 : 1]!.key,
        answerSpeech: `${JA_NUM[answer]}こ！`,
      });
      continue;
    }
    let n = 1 + Math.floor(Math.random() * max);
    while (n === prevN && max > 1) n = 1 + Math.floor(Math.random() * max);
    prevN = n;
    out.push({
      id: `count-${n}-${i}`,
      text: `${thing.name}は いくつ？`,
      speech: `${thing.name}は いくつ あるかな？`,
      art: groupEl(thing.emoji, n, max > 5 ? 44 : 56, thing.name),
      choices: digitChoices(n, max).map((d) => ({
        key: String(d),
        el: digitEl(d),
        name: `${JA_NUM[d]}`,
      })),
      answerKey: String(n),
      answerSpeech: `${JA_NUM[n]}こ！`,
    });
  }
  return out;
}

const manifest: PluginManifest = {
  ...KIDS_DEFAULTS,
  id: "io.kakimon.preschool.count",
  name: "かず あそび",
  description: "いくつ あるか かぞえよう",
  category: "math",
  icon: "🔢",
  difficulties: [
    { key: "count-3", label: "1〜3", level: 1 },
    { key: "count-5", label: "1〜5", level: 1 },
    { key: "count-10", label: "1〜10", level: 2 },
    { key: "count-more", label: "おおい・すくない", level: 2 },
  ],
};

export const countPlugin = defineTapQuizPlugin(manifest, build);
