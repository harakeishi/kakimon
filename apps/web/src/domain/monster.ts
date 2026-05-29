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
  /** 累計学習セッション数（お墓に刻む用） */
  totalSessions: number;
}

export const STARTING_STATS: MonsterStats = {
  maxHp: 100,
  hp: 100,
  attack: 5,
  defense: 5,
  speed: 5,
  smart: 1,
};

/**
 * 新規モンスターは「卵」状態で誕生する。
 * - name は空文字（孵化時にユーザが命名する）
 * - stage は "egg"。卵期はステータスが減衰しないように tick で扱う
 * - 1 回学習すると孵化（hatch）して "baby" になり、命名フローへ進む
 */
export function createInitialMonster(): Monster {
  const now = new Date().toISOString();
  return {
    id: cryptoRandomId(),
    name: "",
    species: "placeholder-001",
    bornAt: now,
    stage: "egg",
    level: 1,
    exp: 0,
    expToNext: 50,
    stats: { ...STARTING_STATS },
    condition: { hunger: 0, mood: 100, cleanliness: 100 },
    lifeState: "healthy",
    lastTickAt: now,
    dyingSince: null,
    equipped: {},
    favoriteFoodIds: [],
    totalSessions: 0,
  };
}

/** 卵期間中かどうか。卵は世話を必要としない。 */
export function isEgg(m: Monster): boolean {
  return m.stage === "egg";
}

/** 孵化済みか（卵以外） */
export function isHatched(m: Monster): boolean {
  return m.stage !== "egg";
}

/** 命名待ちか（孵化済み・healthy系・name 空） */
export function needsNaming(m: Monster): boolean {
  return isHatched(m) && m.name.trim() === "";
}

/**
 * 卵を孵化させ、baby に進化させる。学習完了時の最初の 1 回で呼ぶ。
 * condition はベビー期の初期値に置き換える（卵期間の値ではなく標準値）。
 */
export function hatch(m: Monster, nowMs: number = Date.now()): Monster {
  if (m.stage !== "egg") return m;
  const now = new Date(nowMs).toISOString();
  return {
    ...m,
    stage: "baby",
    bornAt: now,
    lastTickAt: now,
    condition: { hunger: 20, mood: 80, cleanliness: 90 },
  };
}

/** 命名（trim 済み、空なら無視） */
export function rename(m: Monster, name: string): Monster {
  const trimmed = name.trim().slice(0, 12);
  if (!trimmed) return m;
  return { ...m, name: trimmed };
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

// チャンクサイズ。長期放置でも状態遷移と 48h dying タイマーが正しく
// 進むよう、1 時間刻みでステップ実行する。30 日不在で 720 回ループ程度。
const TICK_CHUNK_MS = ONE_HOUR;

/**
 * 放置時間に応じて Monster の状態を更新する純粋関数。
 * - hunger: 24 時間で 0 → 100
 * - cleanliness: 72 時間で 100 → 0
 * - mood: 168 時間 (1 週間) で 50 → 20 までゆっくり低下 (下限 20)
 * - hp: sick / dying 中、24 時間で maxHp の 25% 減
 * - dying に入って 48 時間で deceased
 *
 * 内部で 1 時間刻みのチャンクに分割して評価する。これにより
 * 「数日放置 → 1 度の tick で sick→dying→deceased まで進む」が正しく動く。
 */
export function tickMonster(m: Monster, nowMs: number): Monster {
  if (m.lifeState === "deceased") return m;
  // 卵期は世話を必要としない。lastTickAt だけ更新して状態は据え置き。
  if (m.stage === "egg") {
    return { ...m, lastTickAt: new Date(nowMs).toISOString() };
  }

  const lastMsRaw = Date.parse(m.lastTickAt);
  const lastMs = Number.isFinite(lastMsRaw) ? lastMsRaw : nowMs;
  const totalDt = Math.max(0, nowMs - lastMs);
  if (totalDt === 0) return m;

  let current = m;
  let cursor = lastMs;
  while (cursor < nowMs && current.lifeState !== "deceased") {
    const step = Math.min(TICK_CHUNK_MS, nowMs - cursor);
    cursor += step;
    current = tickStep(current, cursor, step);
  }
  return current;
}

function tickStep(m: Monster, atMs: number, dtMs: number): Monster {
  const dtH = dtMs / ONE_HOUR;

  const hunger = clamp(m.condition.hunger + (100 / 24) * dtH);
  const cleanliness = clamp(m.condition.cleanliness - (100 / 72) * dtH);
  // 設計上の最低値は 20。0 まで落とすと weak 判定の mood < 40 を常時通す。
  const mood = clamp(m.condition.mood - (30 / 168) * dtH, 20, 100);

  let lifeState: LifeState = m.lifeState;
  let hp = m.stats.hp;
  let dyingSince = m.dyingSince;

  // 状態は悪化方向にだけ遷移する。改善はお世話アクションで明示的に。
  if (lifeState === "healthy" || lifeState === "weak") {
    if (hunger >= 60 || cleanliness <= 40 || mood < 40) {
      lifeState = "weak";
    }
    // 1h チャンクでは「12 時間継続して hunger 高」を判定できないため、
    // 「hunger 飽和 + weak 状態が一定経過」を擬似的に sick への引き金とする。
    // 設計の意図 (12h 継続) は「ちゃんと世話してれば短時間で sick にしない」
    // ことなので、ここでは hunger == 100 (= 24h 以上空腹継続) を条件にする。
    if (hunger >= 100) lifeState = "sick";
    if (cleanliness <= 0) lifeState = "sick";
  }
  if (lifeState === "sick" || lifeState === "dying") {
    const drain = ((m.stats.maxHp * 0.25) / 24) * dtH;
    hp = Math.max(0, hp - drain);
  }
  if (lifeState === "sick" && hp <= 0) {
    lifeState = "dying";
    dyingSince = new Date(atMs).toISOString();
  }
  if (lifeState === "dying" && dyingSince) {
    const dyingStartedRaw = Date.parse(dyingSince);
    if (Number.isFinite(dyingStartedRaw)) {
      const dyingMs = atMs - dyingStartedRaw;
      if (dyingMs >= 48 * ONE_HOUR) {
        lifeState = "deceased";
      }
    } else {
      // 壊れた dyingSince はリセットして再記録
      dyingSince = new Date(atMs).toISOString();
    }
  }

  return {
    ...m,
    condition: { hunger, mood, cleanliness },
    stats: { ...m.stats, hp: Math.round(hp) },
    lifeState,
    lastTickAt: new Date(atMs).toISOString(),
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
