// kakimon プラグイン契約。docs/03-plugin-architecture.md と一致させる。

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export type PluginCategory = "writing" | "reading" | "math" | "other";

export interface DifficultyOption {
  /** プラグイン内で一意なキー */
  key: string;
  /** UI 表示名 (ja) */
  label: string;
  /** 難易度の絶対水準 */
  level: DifficultyLevel;
}

export interface PluginManifest {
  /** 一意な識別子 (逆 DNS 推奨) */
  id: string;
  name: string;
  description: string;
  /** semver */
  version: string;
  /** 対象年齢の目安。UI 表示用 */
  ageHint?: { min: number; max: number };
  difficulties: DifficultyOption[];
  category: PluginCategory;
  /** 一覧表示で使う絵文字 or 短いラベル (MVP では絵文字でOK) */
  icon: string;
}

export interface SessionConfig {
  difficulty: string;
  questionCount?: number;
  options?: Record<string, unknown>;
}

export interface QuestionOutcome {
  questionId: string;
  correct: boolean;
  /** 0..1 の習熟度 */
  score: number;
  elapsedMs?: number;
  meta?: Record<string, unknown>;
}

export interface SessionResult {
  /** 0..1。Host が通貨換算する */
  overallScore: number;
  outcomes: QuestionOutcome[];
  durationMs: number;
}

export interface Progress {
  /** 0..1 */
  ratio: number;
  label?: string;
}

export interface SessionContext {
  complete(result: SessionResult): void;
  abort(reason: "user" | "error", detail?: string): void;
  reportProgress(progress: Progress): void;
  locale: "ja";
}

export interface SessionHandle {
  dispose(): void;
}

export interface ContentPlugin {
  manifest: PluginManifest;
  startSession(
    target: HTMLElement,
    config: SessionConfig,
    ctx: SessionContext
  ): SessionHandle;
}

/**
 * マニフェスト検証。重複や必須欠落は起動時に明示的に失敗させる。
 */
export function validateManifest(m: PluginManifest): void {
  if (!m.id || !/^[a-z0-9.\-_]+$/i.test(m.id)) {
    throw new Error(`invalid plugin id: ${String(m.id)}`);
  }
  if (!m.name) throw new Error(`plugin ${m.id}: name is required`);
  if (!m.version) throw new Error(`plugin ${m.id}: version is required`);
  if (!m.difficulties.length) {
    throw new Error(`plugin ${m.id}: at least one difficulty is required`);
  }
  const seen = new Set<string>();
  for (const d of m.difficulties) {
    if (seen.has(d.key)) {
      throw new Error(`plugin ${m.id}: duplicate difficulty key ${d.key}`);
    }
    seen.add(d.key);
  }
}
