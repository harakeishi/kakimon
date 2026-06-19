// 数字（0〜9）の書き取りプラグイン。
// kakitori の char.create() で SVG ストロークを描画し、ユーザがなぞる。

import type {
  CharCreateOptions,
  CharacterConfig,
} from "@k1low/kakitori";
import { char } from "@k1low/kakitori";
import type {
  ContentPlugin,
  PluginManifest,
  QuestionOutcome,
  SessionConfig,
  SessionContext,
  SessionHandle,
} from "@kakimon/plugin-api";

function baseUrl(): string {
  const base =
    (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return base.endsWith("/") ? base : `${base}/`;
}

const FETCH_TIMEOUT_MS = 3000;

function fetchJson<T = unknown>(url: string): Promise<T | "not-found"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { signal: controller.signal })
    .then(async (res) => {
      if (res.status === 404) return "not-found" as const;
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) {
        throw new Error(
          `expected JSON for ${url} but got '${contentType.slice(0, 60)}'`
        );
      }
      return (await res.json()) as T;
    })
    .finally(() => clearTimeout(timer));
}

const charDataLoader: NonNullable<CharCreateOptions["charDataLoader"]> = (
  c,
  onLoad,
  onError
) => {
  fetchJson<{ strokes: string[]; medians: number[][][] }>(
    `${baseUrl()}kakitori/chars/${encodeURIComponent(c)}.json`
  )
    .then((data) => {
      if (data === "not-found") {
        onError(new Error(`char data not found: ${c}`));
        return;
      }
      // ひらがなプラグインと同じ二重通知防止
      setTimeout(() => onLoad(data), 0);
    })
    .catch((err) => onError(err));
};

const configLoader: NonNullable<CharCreateOptions["configLoader"]> = async (
  c
): Promise<CharacterConfig | null> => {
  const data = await fetchJson<CharacterConfig>(
    `${baseUrl()}kakitori/config/${encodeURIComponent(c)}.json`
  ).catch((err) => {
    console.warn("[plugin-writing-number] config load failed:", err);
    return "not-found" as const;
  });
  if (data === "not-found") return null;
  return data;
};

// 数字 0〜9。kakitori-data に config が存在する文字だけ実際に描画される。
// チュートリアル順序として小→大 を採用（書きやすい 1 から始めるレッスンは
// 別途 "easy" を用意するか、後で並べ替える）。
const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const POOLS: Record<string, readonly string[]> = {
  // 「やさしい」: 形がシンプルな 1 2 3 と 0
  easy: ["1", "2", "3", "0"],
  // 「ふつう」: 4〜6
  mid: ["4", "5", "6"],
  // 「むずかしい」: 7〜9（曲線・斜め）
  hard: ["7", "8", "9"],
};
const ALL: readonly string[] = [...DIGITS];

const manifest: PluginManifest = {
  id: "io.kakimon.writing.number",
  name: "すうじの かきとり",
  description: "0 から 9 までの すうじを かこう",
  version: "0.1.0",
  ageHint: { min: 5, max: 8 },
  category: "writing",
  // 0-9 を表す絵文字は実装環境差が大きいので、シンプルに「1」を使う
  icon: "1",
  difficulties: [
    { key: "digits-easy", label: "0・1・2・3", level: 1 },
    { key: "digits-mid", label: "4・5・6", level: 1 },
    { key: "digits-hard", label: "7・8・9", level: 1 },
    { key: "digits-all-ordered", label: "0 〜 9 じゅんばん", level: 2 },
    { key: "digits-all-random", label: "0 〜 9 ランダム", level: 2 },
  ],
};

function pickQuestions(difficulty: string, count: number): string[] {
  if (difficulty === "digits-all-ordered") {
    // 順番固定。count に合わせて先頭から切り出す。
    return ALL.slice(0, Math.min(count, ALL.length));
  }
  const source =
    difficulty === "digits-all-random" ? ALL : POOLS[difficulty] ?? ALL;
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr.slice(0, Math.min(count, arr.length));
}

// 「やさしいはんてい」モード。小さい子（3 歳前後）が、なぞりの判定が厳しくて
// ストロークが通らず飽きてしまう問題への対策。host が config.options.lenient を
// true で渡すと有効になる。kakitori (hanzi-writer) の判定許容度を上げ、ストローク
// 終端の厳しさを実質無効化し、ミスしてもすぐにお手本ヒントを出す。
const LENIENT_CHAR_OPTS = { leniency: 3, strokeEndingStrictness: 0 } as const;
const LENIENT_MOUNT_OPTS = { showHintAfterMisses: 1 } as const;

function startSession(
  target: HTMLElement,
  config: SessionConfig,
  ctx: SessionContext
): SessionHandle {
  const startedAt = Date.now();
  const total = config.questionCount ?? 5;
  const lenient = config.options?.lenient === true;
  const questions = pickQuestions(config.difficulty, total);
  const outcomes: QuestionOutcome[] = [];

  target.replaceChildren();
  // 既存のひらがな用クラスを流用すると CSS が当たって扱いやすい
  target.classList.add("kakimon-plugin-writing-hiragana");

  const header = document.createElement("div");
  header.className = "kp-hiragana__header";
  const progressLabel = document.createElement("div");
  progressLabel.className = "kp-hiragana__progress";
  header.appendChild(progressLabel);
  target.appendChild(header);

  const charHost = document.createElement("div");
  charHost.className = "kp-hiragana__char";
  charHost.style.width = "300px";
  charHost.style.height = "300px";
  charHost.style.margin = "0 auto";
  target.appendChild(charHost);

  const controls = document.createElement("div");
  controls.className = "kp-hiragana__controls";
  const skipBtn = document.createElement("button");
  skipBtn.type = "button";
  skipBtn.className = "kp-btn kp-btn--ghost";
  skipBtn.textContent = "つぎへ";
  controls.appendChild(skipBtn);
  target.appendChild(controls);

  let currentIndex = 0;
  let currentChar: ReturnType<typeof char.create> | null = null;
  let disposed = false;
  let settled = false;
  let questionStartedAt = Date.now();
  let pendingTimer: number | null = null;
  let consecutiveLoadFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  function clearPendingTimer() {
    if (pendingTimer !== null) {
      window.clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  function updateProgress() {
    if (disposed) return;
    progressLabel.textContent = `${currentIndex + 1} / ${questions.length}`;
    ctx.reportProgress({
      ratio: currentIndex / questions.length,
      label: `${currentIndex + 1} / ${questions.length}`,
    });
  }

  function safeComplete() {
    if (disposed || settled) return;
    settled = true;
    const overall =
      outcomes.length > 0
        ? outcomes.reduce((sum, o) => sum + o.score, 0) / outcomes.length
        : 0;
    try {
      ctx.complete({
        overallScore: overall,
        outcomes,
        durationMs: Date.now() - startedAt,
      });
    } catch (e) {
      console.error("[plugin-writing-number] ctx.complete threw:", e);
    }
  }

  function safeAbort(reason: "user" | "error", detail?: string) {
    if (disposed || settled) return;
    settled = true;
    try {
      ctx.abort(reason, detail);
    } catch (e) {
      console.error("[plugin-writing-number] ctx.abort threw:", e);
    }
  }

  function mountCurrent() {
    if (disposed) return;
    if (currentIndex >= questions.length) {
      safeComplete();
      return;
    }
    updateProgress();
    questionStartedAt = Date.now();

    const ch = questions[currentIndex]!;
    const myIndex = currentIndex;
    try {
      const instance = char.create(ch, {
        charDataLoader,
        configLoader,
        ...(lenient ? LENIENT_CHAR_OPTS : {}),
      });
      currentChar = instance;
      instance.mount(charHost, {
        size: 300,
        showOutline: true,
        showCharacter: false,
        retainStrokes: true,
        drawingColor: "#2563eb",
        outlineColor: "#cbd5e1",
        highlightColor: "#fbbf24",
        ...(lenient ? LENIENT_MOUNT_OPTS : {}),
        onComplete: (data) => {
          if (disposed || settled) return;
          if (myIndex !== currentIndex) return;
          consecutiveLoadFailures = 0;
          // やさしいモードではミス 1 回あたりの減点を緩める（0.1 → 0.04）。
          const mistakePenalty = lenient ? 0.04 : 0.1;
          const score = data.matched
            ? Math.max(0, 1 - data.totalMistakes * mistakePenalty)
            : 0.3;
          outcomes.push({
            questionId: `${ch}@${myIndex}`,
            correct: data.matched,
            score,
            elapsedMs: Date.now() - questionStartedAt,
            meta: {
              character: ch,
              totalMistakes: data.totalMistakes,
              attempts: data.attempts,
            },
          });
          clearPendingTimer();
          pendingTimer = window.setTimeout(() => {
            pendingTimer = null;
            if (disposed) return;
            unmountCurrent();
            currentIndex++;
            mountCurrent();
          }, 600);
        },
      });
      instance.start();
    } catch (err) {
      const elapsed = Date.now() - questionStartedAt;
      outcomes.push({
        questionId: `${ch}@${myIndex}`,
        correct: false,
        score: 0,
        elapsedMs: elapsed,
        meta: { character: ch, error: String(err) },
      });
      consecutiveLoadFailures++;
      if (consecutiveLoadFailures >= MAX_CONSECUTIVE_FAILURES) {
        safeAbort(
          "error",
          `consecutive char load failures (${consecutiveLoadFailures})`
        );
        return;
      }
      currentIndex++;
      mountCurrent();
    }
  }

  function unmountCurrent() {
    if (currentChar) {
      try {
        currentChar.destroy();
      } catch {
        // ignore
      }
      currentChar = null;
    }
    charHost.replaceChildren();
  }

  function onSkipClick() {
    if (disposed || settled) return;
    if (currentIndex < questions.length) {
      const ch = questions[currentIndex]!;
      outcomes.push({
        questionId: `${ch}@${currentIndex}`,
        correct: false,
        score: 0,
        elapsedMs: Date.now() - questionStartedAt,
        meta: { character: ch, skipped: true },
      });
    }
    clearPendingTimer();
    unmountCurrent();
    currentIndex++;
    mountCurrent();
  }

  skipBtn.addEventListener("click", onSkipClick);

  mountCurrent();

  return {
    dispose() {
      if (disposed) return;
      if (!settled) {
        settled = true;
        try {
          ctx.abort("user", "session disposed before completion");
        } catch (e) {
          console.error("[plugin-writing-number] dispose abort threw:", e);
        }
      }
      disposed = true;
      clearPendingTimer();
      skipBtn.removeEventListener("click", onSkipClick);
      unmountCurrent();
      target.replaceChildren();
    },
  };
}

export const plugin: ContentPlugin = {
  manifest,
  startSession,
};

export default plugin;
