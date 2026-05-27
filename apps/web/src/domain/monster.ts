// docs/04-domain-model.md と同期。仮置きステータスとロジック。

export type LifeState = "healthy" | "weak" | "sick" | "dying" | "deceased";

export type MonsterStage = "egg" | "baby" | "child" | "teen" | "adult";

export interface MonsterStats {
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  smart: number;
}

export interface MonsterCondition {
  hunger: number; // 0..100, 高いほど空腹
  mood: number; // 0..100
  cleanliness: number; // 0..100
}

export interface MonsterEquipped {
  head?: string;
  body?: string;
  accessory?: string;
}

export interface Monster {
  id: string;
  name: string;
  species: string;
  bornAt: string;
  stage: MonsterStage;
  level: number;
  exp: number;
  expToNext: number;
  stats: MonsterStats;
  condition: MonsterCondition;
  lifeState: LifeState;
  lastTickAt: string;
  /** dying に入った時刻。null なら未到達 */
  dyingSince: string | null;
  equipped: MonsterEquipped;
  favoriteFoodIds: string[];
}

export const STARTING_STATS: MonsterStats = {
  maxHp: 100,
  hp: 100,
  attack: 5,
  defense: 5,
  speed: 5,
  smart: 1,
};

export function createInitialMonster(name = "もんちゃん"): Monster {
  const now = new Date().toISOString();
  return {
    id: cryptoRandomId(),
    name,
    species: "placeholder-001",
    bornAt: now,
    stage: "baby",
    level: 1,
    exp: 0,
    expToNext: 50,
    stats: { ...STARTING_STATS },
    condition: { hunger: 30, mood: 70, cleanliness: 80 },
    lifeState: "healthy",
    lastTickAt: now,
    dyingSince: null,
    equipped: {},
    favoriteFoodIds: [],
  };
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

// ─────────────────────────────────────────────────────────────────
// 時間経過 (tick)
// ─────────────────────────────────────────────────────────────────

const ONE_HOUR = 60 * 60 * 1000;

/**
 * 放置時間に応じて Monster の状態を更新する純粋関数。
 * - hunger: 24 時間で 0 → 100
 * - cleanliness: 72 時間で 100 → 0
 * - mood: 168 時間 (1 週間) で 50 → 20 までゆっくり低下
 * - hp: sick 中のみ 24 時間で maxHp の 25% 減
 * - dying に入って 48 時間で deceased
 */
export function tickMonster(m: Monster, nowMs: number): Monster {
  if (m.lifeState === "deceased") return m;

  const lastMs = Date.parse(m.lastTickAt);
  const dtMs = Math.max(0, nowMs - lastMs);
  if (dtMs === 0) return m;

  const dtH = dtMs / ONE_HOUR;

  const hunger = clamp(m.condition.hunger + (100 / 24) * dtH);
  const cleanliness = clamp(m.condition.cleanliness - (100 / 72) * dtH);
  const mood = clamp(m.condition.mood - (30 / 168) * dtH);

  // 健康度遷移は段階的に判定する
  let lifeState: LifeState = m.lifeState;
  let hp = m.stats.hp;
  let dyingSince = m.dyingSince;

  // sick 中は hp が減る
  if (m.lifeState === "sick" || m.lifeState === "dying") {
    const drain = (m.stats.maxHp * 0.25) * dtH / 24;
    hp = Math.max(0, hp - drain);
  }

  // 状態判定 (悪化方向のみ。改善はお世話アクションで明示的に行う)
  if (lifeState === "healthy" || lifeState === "weak") {
    if (hunger >= 60 || cleanliness <= 40 || mood < 40) {
      lifeState = "weak";
    }
    // 12 時間以上 hunger >= 85、または 24 時間以上 cleanliness <= 20 で sick へ
    // 簡易判定として、現在値が閾値を超えていて経過時間が長ければ sick へ。
    if (hunger >= 85 && dtH >= 12) lifeState = "sick";
    if (cleanliness <= 20 && dtH >= 24) lifeState = "sick";
  }
  if (lifeState === "sick" && hp === 0) {
    lifeState = "dying";
    dyingSince = new Date(nowMs).toISOString();
  }
  if (lifeState === "dying" && dyingSince) {
    const dyingMs = nowMs - Date.parse(dyingSince);
    if (dyingMs >= 48 * ONE_HOUR) {
      lifeState = "deceased";
    }
  }

  return {
    ...m,
    condition: { hunger, mood, cleanliness },
    stats: { ...m.stats, hp: Math.round(hp) },
    lifeState,
    lastTickAt: new Date(nowMs).toISOString(),
    dyingSince,
  };
}

function clamp(v: number, min = 0, max = 100): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

// ─────────────────────────────────────────────────────────────────
// お世話アクション
// ─────────────────────────────────────────────────────────────────

export function feed(
  m: Monster,
  effects: { hungerDelta: number; moodDelta: number; hpDelta?: number }
): Monster {
  if (m.lifeState === "deceased") return m;
  const hunger = clamp(m.condition.hunger + effects.hungerDelta);
  const mood = clamp(m.condition.mood + effects.moodDelta);
  const hp = clamp(
    m.stats.hp + (effects.hpDelta ?? 0),
    0,
    m.stats.maxHp
  );
  // hp が戻ったら dying → sick に降格、sick も healthy 寄りに改善できる
  let lifeState: LifeState = m.lifeState;
  let dyingSince = m.dyingSince;
  if (lifeState === "dying" && hp > 0) {
    lifeState = "sick";
    dyingSince = null;
  }
  if (lifeState === "sick" && hunger < 60 && hp >= m.stats.maxHp * 0.6) {
    lifeState = "weak";
  }
  if (
    lifeState === "weak" &&
    hunger < 50 &&
    mood >= 50 &&
    m.condition.cleanliness >= 50
  ) {
    lifeState = "healthy";
  }
  return {
    ...m,
    condition: { ...m.condition, hunger, mood },
    stats: { ...m.stats, hp },
    lifeState,
    dyingSince,
  };
}

export function pet(m: Monster): Monster {
  if (m.lifeState === "deceased") return m;
  const mood = clamp(m.condition.mood + 3);
  return { ...m, condition: { ...m.condition, mood } };
}

// ─────────────────────────────────────────────────────────────────
// 学習による経験値とレベル
// ─────────────────────────────────────────────────────────────────

export function gainExp(m: Monster, exp: number): Monster {
  if (m.lifeState === "deceased") return m;
  let level = m.level;
  let cur = m.exp + exp;
  let next = m.expToNext;
  let smart = m.stats.smart;
  while (cur >= next) {
    cur -= next;
    level += 1;
    smart += 1;
    next = Math.floor(next * 1.2 + 10);
  }
  return {
    ...m,
    level,
    exp: cur,
    expToNext: next,
    stats: { ...m.stats, smart },
  };
}
