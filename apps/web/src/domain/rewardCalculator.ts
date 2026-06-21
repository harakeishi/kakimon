import type { SessionResult } from "@kakimon/plugin-api";

// 難易度別ベース値。プラグイン間でバランス調整を一箇所に集約する。
// コインは「1 日 3 回ほどの学習で、モンスターの満腹を保ちつつアイテム購入の
// 貯金もできる」ことを目安に調整している（餌代の目安は 1 日あたり 20〜25 コイン）。
const BASE_COINS_BY_LEVEL: Record<number, number> = {
  1: 12,
  2: 18,
  3: 25,
  4: 32,
  5: 40,
};

const BASE_EXP_BY_LEVEL: Record<number, number> = {
  1: 3,
  2: 6,
  3: 10,
  4: 16,
  5: 24,
};

export interface RewardContext {
  /** 難易度レベル (1..5) */
  difficultyLevel: 1 | 2 | 3 | 4 | 5;
}

export interface Reward {
  coins: number;
  exp: number;
}

export function calculateReward(
  result: SessionResult,
  ctx: RewardContext
): Reward {
  const baseCoins = BASE_COINS_BY_LEVEL[ctx.difficultyLevel] ?? 5;
  const baseExp = BASE_EXP_BY_LEVEL[ctx.difficultyLevel] ?? 3;
  const score = clamp01(result.overallScore);
  // 問題数のスケーリング: 短時間セッションでも報酬を増減できるよう問題数を倍率に
  const sizeMul = Math.max(1, result.outcomes.length / 5);
  const coins = Math.max(0, Math.floor(baseCoins * score * sizeMul));
  const exp = Math.max(0, Math.floor(baseExp * score * sizeMul));
  return { coins, exp };
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
