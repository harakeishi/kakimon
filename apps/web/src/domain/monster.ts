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
 * - mood: 168 時間 (1 週間) で 50 → 20 までゆっくり低下 (下限 20)
 * - hp: sick / dying 中、24 時間で maxHp の 25% 減
 * - dying に入って 48 時間で deceased
 */
export function tickMonster(m: Monster, nowMs: number): Monster {
  if (m.lifeState === "deceased") return m;

  // 保存値が壊れていた場合 (NaN) は今を起点に再開し、tick の不整合伝播を防ぐ
  const lastMsRaw = Date.parse(m.lastTickAt);
  const lastMs = Number.isFinite(lastMsRaw) ? lastMsRaw : nowMs;
  const dtMs = Math.max(0, nowMs - lastMs);
  if (dtMs === 0) return m;

  const dtH = dtMs / ONE_HOUR;

  const hunger = clamp(m.condition.hunger + (100 / 24) * dtH);
  const cleanliness = clamp(m.condition.cleanliness - (100 / 72) * dtH);
  // 設計上の最低値は 20。0 まで落とすと weak 判定の mood < 40 を実質常時通すことになる
  const mood = clamp(m.condition.mood - (30 / 168) * dtH, 20, 100);

  let lifeState: LifeState = m.lifeState;
  let hp = m.stats.hp;
  let dyingSince = m.dyingSince;

  // 状態を悪化方向にだけ遷移させる。改善はお世話アクションで明示的に行う。
  // 重要: 遷移後の lifeState で drain を判定する。原状で sick じゃなくても
  // 今 tick で sick になったら hp を削る — そうしないと「長時間放置→sick 到達
  // → でも hp 満タンのまま」という設計と乖離した状態に陥り dying に至らない。
  if (lifeState === "healthy" || lifeState === "weak") {
    if (hunger >= 60 || cleanliness <= 40 || mood < 40) {
      lifeState = "weak";
    }
    if (hunger >= 85 && dtH >= 12) lifeState = "sick";
    if (cleanliness <= 20 && dtH >= 24) lifeState = "sick";
  }
  if (lifeState === "sick" || lifeState === "dying") {
    const drain = ((m.stats.maxHp * 0.25) / 24) * dtH;
    hp = Math.max(0, hp - drain);
  }
  // 浮動小数点比較は <= 0 にする (Math.max でクリップしても rounding 経路は別)
  if (lifeState === "sick" && hp <= 0) {
    lifeState = "dying";
    dyingSince = new Date(nowMs).toISOString();
  }
  if (lifeState === "dying" && dyingSince) {
    const dyingStartedRaw = Date.parse(dyingSince);
    if (Number.isFinite(dyingStartedRaw)) {
      const dyingMs = nowMs - dyingStartedRaw;
      if (dyingMs >= 48 * ONE_HOUR) {
        lifeState = "deceased";
      }
    } else {
      // 壊れた dyingSince が来た場合は dying スタートをリセットして再記録する
      dyingSince = new Date(nowMs).toISOString();
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
