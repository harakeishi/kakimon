import type { SessionResult } from "@kakimon/plugin-api";

// 難易度別ベース値。プラグイン間でバランス調整を一箇所に集約する。
const BASE_COINS_BY_LEVEL: Record<number, number> = {
  1: 5,
  2: 8,
  3: 12,
  4: 18,
  5: 25,
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
