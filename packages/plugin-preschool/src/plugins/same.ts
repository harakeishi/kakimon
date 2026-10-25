// おなじもの: 見本と おなじものを さがす（ことばが いらない、いちばん やさしい遊び）。
// レベル 2 は「なかまはずれ」（3 つ同じ + 1 つ違う → 違うものを タッチ）。

import type { PluginManifest } from "@kakimon/plugin-api";
import {
  emojiEl,
  pickCycle,
  pickOne,
  shuffled,
  withDistractors,
  type TapQuestion,
} from "@kakimon/plugin-preschool-shared";
import { KIDS_DEFAULTS, defineTapQuizPlugin } from "../define";
import { THING_POOLS, type Thing } from "./things";

const MIXED: readonly Thing[] = [
  ...THING_POOLS.ANIMALS_1,
  ...THING_POOLS.FOODS_1,
  ...THING_POOLS.VEHICLES_1,
];

/** 似たもの同士のグループ（レベル 2 で「よく見ないと分からない」問題にする）。 */
const SIMILAR_GROUPS: readonly (readonly Thing[])[] = [
  THING_POOLS.ANIMALS_1,
  THING_POOLS.FOODS_1,
  THING_POOLS.VEHICLES_1,
];

function same(a: Thing, b: Thing): boolean {
  return a.emoji === b.emoji;
}

function sameQuestions(count: number, hard: boolean): TapQuestion[] {
  const out: TapQuestion[] = [];
  const targets = pickCycle(MIXED, count, same);
  targets.forEach((answer, i) => {
    const group = hard
      ? SIMILAR_GROUPS.find((g) => g.some((t) => same(t, answer))) ?? MIXED
      : MIXED;
    const choices = withDistractors(answer, group, hard ? 4 : 3, same);
    out.push({
      id: `same-${answer.emoji}-${i}`,
      text: "おなじ ものは どれ？",
      art: emojiEl(answer.emoji, 110, answer.name),
      choices: choices.map((t) => ({
        key: t.emoji,
        el: emojiEl(t.emoji, 84, t.name),
        name: t.name,
      })),
      answerKey: answer.emoji,
      answerSpeech: `${answer.name}！`,
    });
  });
  return out;
}

function oddOneOutQuestions(count: number): TapQuestion[] {
  const out: TapQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const group = pickOne(SIMILAR_GROUPS);
    const [common, odd] = shuffled(group).slice(0, 2) as [Thing, Thing];
    const slots = shuffled([common, common, common, odd]);
    out.push({
      id: `odd-${odd.emoji}-${i}`,
      text: "ちがう ものは どれ？",
      speech: "ひとつだけ ちがう ものは どれ？",
      choices: slots.map((t, j) => ({
        key: `${j}:${t.emoji}`,
        el: emojiEl(t.emoji, 84, t.name),
        name: t.name,
      })),
      answerKey: `${slots.indexOf(odd)}:${odd.emoji}`,
      answerSpeech: `${odd.name}！`,
    });
  }
  return out;
}

const manifest: PluginManifest = {
  ...KIDS_DEFAULTS,
  id: "io.kakimon.preschool.same",
  name: "おなじもの さがし",
  description: "みほんと おなじものを みつけよう",
  category: "other",
  icon: "👀",
  difficulties: [
    { key: "same-easy", label: "おなじもの", level: 1 },
    { key: "same-hard", label: "よくみて おなじもの", level: 2 },
    { key: "odd-one-out", label: "なかまはずれ", level: 2 },
  ],
};

export const samePlugin = defineTapQuizPlugin(manifest, (d, n) =>
  d === "odd-one-out"
    ? oddOneOutQuestions(n)
    : sameQuestions(n, d === "same-hard")
);
