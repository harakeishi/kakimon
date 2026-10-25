// 「なまえ → もの」のタップ: どうぶつ・たべもの・のりもの。
// 同じ作りなので 1 ファイルで 3 プラグインを定義する。
// どうぶつには「なきごえ」（ワンワンと なくのは？）のコースもある。

import type { PluginManifest } from "@kakimon/plugin-api";
import {
  emojiEl,
  pickCycle,
  withDistractors,
  type TapQuestion,
} from "@kakimon/plugin-preschool-shared";
import { KIDS_DEFAULTS, defineTapQuizPlugin } from "../define";

interface Thing {
  emoji: string;
  name: string;
  /** なきごえ（どうぶつのみ） */
  sound?: string;
}

const ANIMALS_1: readonly Thing[] = [
  { emoji: "🐶", name: "いぬ", sound: "ワンワン" },
  { emoji: "🐱", name: "ねこ", sound: "ニャーニャー" },
  { emoji: "🐰", name: "うさぎ" },
  { emoji: "🐻", name: "くま" },
  { emoji: "🐼", name: "パンダ" },
  { emoji: "🐷", name: "ぶた", sound: "ブーブー" },
  { emoji: "🐮", name: "うし", sound: "モーモー" },
  { emoji: "🐸", name: "かえる", sound: "ケロケロ" },
  { emoji: "🐥", name: "ひよこ", sound: "ピヨピヨ" },
];

const ANIMALS_2: readonly Thing[] = [
  ...ANIMALS_1,
  { emoji: "🐘", name: "ぞう", sound: "パオーン" },
  { emoji: "🦒", name: "きりん" },
  { emoji: "🦁", name: "ライオン", sound: "ガオー" },
  { emoji: "🐯", name: "とら" },
  { emoji: "🐵", name: "さる", sound: "ウキウキ" },
  { emoji: "🐔", name: "にわとり", sound: "コケコッコー" },
  { emoji: "🐧", name: "ペンギン" },
  { emoji: "🐟", name: "さかな" },
  { emoji: "🐢", name: "かめ" },
  { emoji: "🐴", name: "うま", sound: "ヒヒーン" },
  { emoji: "🐑", name: "ひつじ", sound: "メェメェ" },
  { emoji: "🦆", name: "あひる", sound: "ガーガー" },
  { emoji: "🐭", name: "ねずみ", sound: "チューチュー" },
  { emoji: "🦊", name: "きつね" },
  { emoji: "🐨", name: "コアラ" },
  { emoji: "🐝", name: "はち", sound: "ブーン" },
  { emoji: "🦋", name: "ちょうちょ" },
  { emoji: "🐌", name: "かたつむり" },
];

const FOODS_1: readonly Thing[] = [
  { emoji: "🍎", name: "りんご" },
  { emoji: "🍌", name: "バナナ" },
  { emoji: "🍇", name: "ぶどう" },
  { emoji: "🍓", name: "いちご" },
  { emoji: "🍊", name: "みかん" },
  { emoji: "🍉", name: "すいか" },
  { emoji: "🍑", name: "もも" },
  { emoji: "🥕", name: "にんじん" },
  { emoji: "🍅", name: "トマト" },
  { emoji: "🌽", name: "とうもろこし" },
];

const FOODS_2: readonly Thing[] = [
  ...FOODS_1,
  { emoji: "🍞", name: "パン" },
  { emoji: "🍙", name: "おにぎり" },
  { emoji: "🍰", name: "ケーキ" },
  { emoji: "🍦", name: "アイス" },
  { emoji: "🍩", name: "ドーナツ" },
  { emoji: "🍪", name: "クッキー" },
  { emoji: "🍬", name: "あめ" },
  { emoji: "🥛", name: "ミルク" },
  { emoji: "🍜", name: "ラーメン" },
  { emoji: "🍕", name: "ピザ" },
  { emoji: "🍔", name: "ハンバーガー" },
  { emoji: "🍣", name: "おすし" },
  { emoji: "🍳", name: "めだまやき" },
  { emoji: "🍫", name: "チョコレート" },
];

const VEHICLES_1: readonly Thing[] = [
  { emoji: "🚗", name: "くるま" },
  { emoji: "🚌", name: "バス" },
  { emoji: "🚑", name: "きゅうきゅうしゃ" },
  { emoji: "🚒", name: "しょうぼうしゃ" },
  { emoji: "🚓", name: "パトカー" },
  { emoji: "🚲", name: "じてんしゃ" },
  { emoji: "🚂", name: "きしゃ" },
  { emoji: "✈", name: "ひこうき" },
];

const VEHICLES_2: readonly Thing[] = [
  ...VEHICLES_1,
  { emoji: "🚁", name: "ヘリコプター" },
  { emoji: "🚢", name: "ふね" },
  { emoji: "🚀", name: "ロケット" },
  { emoji: "🚜", name: "トラクター" },
  { emoji: "🚚", name: "トラック" },
  { emoji: "🛵", name: "バイク" },
];

function sameThing(a: Thing, b: Thing): boolean {
  return a.emoji === b.emoji;
}

function nameQuestions(pool: readonly Thing[], count: number, choiceCount: number): TapQuestion[] {
  return pickCycle(pool, count, sameThing).map((answer, i) => ({
    id: `${answer.emoji}-${i}`,
    text: `${answer.name}は どれ？`,
    choices: withDistractors(answer, pool, choiceCount, sameThing).map((t) => ({
      key: t.emoji,
      el: emojiEl(t.emoji, 88, t.name),
      name: t.name,
    })),
    answerKey: answer.emoji,
    answerSpeech: `${answer.name}！`,
  }));
}

function soundQuestions(count: number): TapQuestion[] {
  const pool = ANIMALS_2.filter((a) => a.sound);
  return pickCycle(pool, count, sameThing).map((answer, i) => ({
    id: `sound-${answer.emoji}-${i}`,
    text: `「${answer.sound}」と なくのは？`,
    speech: `${answer.sound}、と なくのは どれ？`,
    choices: withDistractors(answer, pool, 3, sameThing).map((t) => ({
      key: t.emoji,
      el: emojiEl(t.emoji, 88, t.name),
      name: t.name,
    })),
    answerKey: answer.emoji,
    answerSpeech: `${answer.name}！ ${answer.sound}！`,
  }));
}

const animalManifest: PluginManifest = {
  ...KIDS_DEFAULTS,
  id: "io.kakimon.preschool.animal",
  name: "どうぶつ あそび",
  description: "いわれた どうぶつを タッチしよう",
  category: "other",
  icon: "🐶",
  difficulties: [
    { key: "animals-1", label: "みぢかな どうぶつ", level: 1 },
    { key: "animals-2", label: "もっと どうぶつ", level: 2 },
    { key: "animals-sound", label: "なきごえ", level: 2 },
  ],
};

export const animalPlugin = defineTapQuizPlugin(animalManifest, (d, n) => {
  if (d === "animals-sound") return soundQuestions(n);
  if (d === "animals-2") return nameQuestions(ANIMALS_2, n, 4);
  return nameQuestions(ANIMALS_1, n, 3);
});

const foodManifest: PluginManifest = {
  ...KIDS_DEFAULTS,
  id: "io.kakimon.preschool.food",
  name: "たべもの あそび",
  description: "いわれた たべものを タッチしよう",
  category: "other",
  icon: "🍎",
  difficulties: [
    { key: "foods-1", label: "くだもの・やさい", level: 1 },
    { key: "foods-2", label: "ごはん・おやつも", level: 2 },
  ],
};

export const foodPlugin = defineTapQuizPlugin(foodManifest, (d, n) =>
  d === "foods-2" ? nameQuestions(FOODS_2, n, 4) : nameQuestions(FOODS_1, n, 3)
);

const vehicleManifest: PluginManifest = {
  ...KIDS_DEFAULTS,
  id: "io.kakimon.preschool.vehicle",
  name: "のりもの あそび",
  description: "いわれた のりものを タッチしよう",
  category: "other",
  icon: "🚗",
  difficulties: [
    { key: "vehicles-1", label: "みぢかな のりもの", level: 1 },
    { key: "vehicles-2", label: "もっと のりもの", level: 2 },
  ],
};

export const vehiclePlugin = defineTapQuizPlugin(vehicleManifest, (d, n) =>
  d === "vehicles-2"
    ? nameQuestions(VEHICLES_2, n, 4)
    : nameQuestions(VEHICLES_1, n, 3)
);

/** おなじもの・おおきいちいさい でも使う共通プール。 */
export const THING_POOLS = { ANIMALS_1, ANIMALS_2, FOODS_1, FOODS_2, VEHICLES_1 };
export type { Thing };
