/**
 * ログインボーナス。1 日 1 回コインを受け取れる。
 *
 * 「べんきょう」の報酬だけだと、モンスターのお腹を満たす餌代でコインが消えてしまい
 * アイテム購入まで届きにくい。毎日もらえる固定収入を足して難易度を下げるのがねらい。
 *
 * 連続ログイン日数 (streak) に応じてボーナスが少しずつ増える。毎日あそぶほど
 * たくさんコインがたまり、ショップのアイテムに手が届きやすくなる。
 */
export interface LoginBonus {
  /** 最後に受け取った日 (ローカル日付 YYYY-MM-DD)。未受領なら null。 */
  lastClaimedDate: string | null;
  /** 連続ログイン日数（受け取りごとに更新） */
  streak: number;
}

/** 1 日の基本ボーナス。 */
export const DAILY_BONUS_COINS = 10;
/** 連続ログイン 1 日ごとに増えるボーナス。 */
export const STREAK_BONUS_PER_DAY = 2;
/** 連続ログインボーナスの上限（base に上乗せできる最大値）。 */
export const STREAK_BONUS_CAP = 20;

export function createInitialLoginBonus(): LoginBonus {
  return { lastClaimedDate: null, streak: 0 };
}

/**
 * ローカルタイムの YYYY-MM-DD を返す。
 * UTC 変換を挟むと日本時間の深夜あたりで日付が 1 日ずれるため、
 * ローカルの年月日をそのまま組み立てる。
 */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** きょう受け取れるか（今日まだ受け取っていなければ true）。 */
export function canClaim(lb: LoginBonus, now: Date): boolean {
  return lb.lastClaimedDate !== toDateKey(now);
}

/** 連続ログイン日数に応じた受け取りコイン数。 */
export function bonusCoinsForStreak(streak: number): number {
  const bonus = Math.min(Math.max(0, streak - 1) * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP);
  return DAILY_BONUS_COINS + bonus;
}

export interface ClaimResult {
  /** 更新後のログインボーナス状態。 */
  bonus: LoginBonus;
  /** 受け取ったコイン数（受け取れなかった場合は 0）。 */
  coins: number;
  /** 受け取り後の連続ログイン日数。 */
  streak: number;
  /** 実際に受け取れたか（既に今日受け取り済みなら false）。 */
  claimed: boolean;
}

/**
 * きょうのボーナスを受け取る。今日すでに受け取っていれば claimed:false で no-op。
 * 前日に受け取っていれば streak を継続、空いていれば 1 にリセットする。
 */
export function claim(lb: LoginBonus, now: Date): ClaimResult {
  const today = toDateKey(now);
  if (lb.lastClaimedDate === today) {
    return { bonus: lb, coins: 0, streak: lb.streak, claimed: false };
  }
  const yesterday = toDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const streak = lb.lastClaimedDate === yesterday ? lb.streak + 1 : 1;
  const coins = bonusCoinsForStreak(streak);
  return {
    bonus: { lastClaimedDate: today, streak },
    coins,
    streak,
    claimed: true,
  };
}
