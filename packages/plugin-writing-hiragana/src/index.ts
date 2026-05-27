import type {
  CharCreateOptions,
  CharacterConfig,
} from "@k1low/kakitori";
import { char, hiragana } from "@k1low/kakitori";
import type {
  ContentPlugin,
  PluginManifest,
  QuestionOutcome,
  SessionConfig,
  SessionContext,
  SessionHandle,
} from "@kakimon/plugin-api";
import { validateManifest } from "@kakimon/plugin-api";

// ホストが用意したデータの公開 URL (web アプリの BASE_URL に対する相対)。
// kakitori のデフォルトは unpkg を直接叩くため、PWA 設計に反する。
// host 側で scripts/sync-kakitori-data.mjs が public/kakitori/ を作る前提。
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
      // SPA の navigation fallback で index.html を 200 で返されるケースを弾く。
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
      // onLoad 自身の例外を .catch(onError) に流すと
      // 「成功と失敗が両方ディスパッチされる」二重通知になる。
      // setTimeout で別タスクに切ってチェーンから切り離す。
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
    // 通信・パースなど 404 以外のエラーはログに残しつつ null で先に進む。
    // kakitori の default は throw するが、ここではプレイ続行を優先する。
    console.warn("[plugin-writing-hiragana] config load failed:", err);
    return "not-found" as const;
  });
  if (data === "not-found") return null;
  return data;
};

// ひらがな清音 46 文字。kakitori の `hiragana` には濁音・拗音が含まれる場合があるため、
// プラグイン側で清音だけに絞り込む。
const SEION = [
  "あ","い","う","え","お",
  "か","き","く","け","こ",
  "さ","し","す","せ","そ",
  "た","ち","つ","て","と",
  "な","に","ぬ","ね","の",
  "は","ひ","ふ","へ","ほ",
  "ま","み","む","め","も",
  "や","ゆ","よ",
  "ら","り","る","れ","ろ",
  "わ","を","ん",
] as const;

const KAKITORI_HIRAGANA = new Set<string>(hiragana);
const RENDERABLE = SEION.filter((c) => KAKITORI_HIRAGANA.has(c));
const POOL: readonly string[] =
  RENDERABLE.length > 0 ? RENDERABLE : [...SEION];

const manifest: PluginManifest = {
  id: "io.kakimon.writing.hiragana",
  name: "ひらがなの かきとり",
  description: "ひらがなを なぞって かこう",
  version: "0.1.0",
  ageHint: { min: 5, max: 8 },
  category: "writing",
  icon: "あ",
  difficulties: [
    { key: "easy", label: "あ〜こ", level: 1 },
    { key: "normal", label: "ぜんぶ", level: 2 },
  ],
};

// 注意: validateManifest はここで呼ばない。
// プラグインの module init で throw すると、アプリ全体の起動が止まる。
// 代わりに registry が登録時に検証する (validateManifest at registration time)。

function pickQuestions(difficulty: string, count: number): string[] {
  const source =
    difficulty === "easy"
      ? POOL.slice(0, Math.min(POOL.length, 10))
      : [...POOL];
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr.slice(0, Math.min(count, arr.length));
}

function startSession(
  target: HTMLElement,
  config: SessionConfig,
  ctx: SessionContext
): SessionHandle {
  const startedAt = Date.now();
  const total = config.questionCount ?? 5;
  const questions = pickQuestions(config.difficulty, total);
  const outcomes: QuestionOutcome[] = [];

  target.innerHTML = "";
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
  let settled = false; // ctx.complete / abort を 1 度だけ呼ぶ guard
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
      // ctx.complete 自体で host が例外を投げた場合、後始末を保証する
      console.error("[plugin-writing-hiragana] ctx.complete threw:", e);
    }
  }

  function safeAbort(reason: "user" | "error", detail?: string) {
    if (disposed || settled) return;
    settled = true;
    try {
      ctx.abort(reason, detail);
    } catch (e) {
      console.error("[plugin-writing-hiragana] ctx.abort threw:", e);
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
        onComplete: (data) => {
          // dispose 後に kakitori の内部キューが onComplete を発火することがある。
          // settled なら無視。インデックスがズレている場合 (例: skip で進められた後)
          // も無視。
          if (disposed || settled) return;
          if (myIndex !== currentIndex) return;
          // ユーザが実際に最後まで書ききった = データ層は健康。
          // 連続失敗カウンタをリセット。char.create / mount 直後ではなく
          // 実際に書き終えた時点でリセットすることで、mount で持続失敗するケースを拾える。
          consecutiveLoadFailures = 0;
          const score = data.matched
            ? Math.max(0, 1 - data.totalMistakes * 0.1)
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
        // データ層がまるごと壊れているとき、偽の「完了」を host に送ると
        // 0 点セッションが履歴に残ってしまう。abort で host に
        // 「環境の問題で中断した」ことを伝える。
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
        // ignore: 既に destroy 済みの可能性
      }
      currentChar = null;
    }
    charHost.innerHTML = "";
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
      // 注意: safeAbort は `disposed || settled` で即 return するため、
      // disposed = true をセットする前に呼ぶ必要がある。
      // ここで host に "user abort" を通知し、その後で disposed フラグを立てて
      // 以降の発火を止める。
      if (!settled) {
        settled = true;
        try {
          ctx.abort("user", "session disposed before completion");
        } catch (e) {
          console.error("[plugin-writing-hiragana] dispose abort threw:", e);
        }
      }
      disposed = true;
      clearPendingTimer();
      skipBtn.removeEventListener("click", onSkipClick);
      unmountCurrent();
      target.innerHTML = "";
    },
  };
}

export const plugin: ContentPlugin = {
  manifest,
  startSession,
};

export default plugin;
