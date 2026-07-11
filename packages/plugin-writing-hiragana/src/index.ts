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
import type { StrokeGuide } from "@kakimon/plugin-writing-shared";
import {
  createStrokeGuide,
  wrapLoadersForGuide,
} from "@kakimon/plugin-writing-shared";

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

// ひらがな清音は「行」単位でまとめる。学習プラグインの難易度キーは行を直接
// 表現し、難易度 1 = 単一行（あ行〜わ行）、難易度 2 = 全部ランダム。
// kakitori の `hiragana` に含まれない文字は念のためフィルタする。
const ROWS = [
  { key: "a",  label: "あ行", chars: ["あ","い","う","え","お"] },
  { key: "ka", label: "か行", chars: ["か","き","く","け","こ"] },
  { key: "sa", label: "さ行", chars: ["さ","し","す","せ","そ"] },
  { key: "ta", label: "た行", chars: ["た","ち","つ","て","と"] },
  { key: "na", label: "な行", chars: ["な","に","ぬ","ね","の"] },
  { key: "ha", label: "は行", chars: ["は","ひ","ふ","へ","ほ"] },
  { key: "ma", label: "ま行", chars: ["ま","み","む","め","も"] },
  { key: "ya", label: "や行", chars: ["や","ゆ","よ"] },
  { key: "ra", label: "ら行", chars: ["ら","り","る","れ","ろ"] },
  { key: "wa", label: "わ行", chars: ["わ","を","ん"] },
] as const;

const KAKITORI_HIRAGANA = new Set<string>(hiragana);
function filterRenderable(chars: readonly string[]): string[] {
  const filtered = chars.filter((c) => KAKITORI_HIRAGANA.has(c));
  return filtered.length > 0 ? filtered : [...chars];
}

const ROW_POOLS: Record<string, readonly string[]> = Object.fromEntries(
  ROWS.map((r) => [r.key, filterRenderable(r.chars)])
);
const ALL_POOL: readonly string[] = filterRenderable(
  ROWS.flatMap((r) => r.chars)
);

const manifest: PluginManifest = {
  id: "io.kakimon.writing.hiragana",
  name: "ひらがなの かきとり",
  description: "ひらがなを なぞって かこう",
  version: "0.2.0",
  ageHint: { min: 5, max: 8 },
  category: "writing",
  icon: "あ",
  difficulties: [
    // 行ごとの「セクション」（レベル 1）。順番に進めたいときに使う。
    ...ROWS.map((r) => ({
      key: `row-${r.key}`,
      label: r.label,
      level: 1 as const,
    })),
    // ぜんぶの中からランダム（レベル 2）。腕試し用。
    { key: "all-random", label: "ぜんぶ ランダム", level: 2 },
  ],
};

// 注意: validateManifest はここで呼ばない。
// プラグインの module init で throw すると、アプリ全体の起動が止まる。
// 代わりに registry が登録時に検証する (validateManifest at registration time)。

function pickQuestions(difficulty: string, count: number): string[] {
  // 行コース（row-*）は 50 音表の順番をそのまま、行を丸ごと出題する。
  // 子供が「あ・い・う・え・お」の順で覚えやすいよう、シャッフルも切り捨ても
  // しない（host の questionCount は無視する。行は 3〜5 文字で量も少ない）。
  if (difficulty.startsWith("row-")) {
    const key = difficulty.slice("row-".length);
    const source = ROW_POOLS[key] ?? ALL_POOL;
    return [...source];
  }
  // "all-random" など未知キー含め、ランダム系は全部からシャッフル
  const source = ALL_POOL;
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
// true で渡すと有効になる。kakitori (hanzi-writer) の判定許容度を上げ、ハネ・トメ・
// ハライの厳しさを実質無効化し、ミスしてもすぐにお手本ヒントを出す。
//
// - leniency: なぞり一致のしきい値。既定 1.0 に対し大きいほど緩い。
// - strokeEndingStrictness: ストローク終端(トメ/ハネ/ハライ)の厳しさ [0,1]。0 で最緩。
// - showHintAfterMisses: 何回ミスしたらお手本(ハイライト)を出すか。すぐ出して導く。
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
  // 「かきじゅんガイド」モード。いま書くべき 1 画の始点・終点・方向を
  // オーバーレイで示す。host が config.options.strokeGuide を true で渡すと有効。
  const strokeGuide = config.options?.strokeGuide === true;
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
  let currentGuide: StrokeGuide | null = null;
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
    // かきじゅんガイド。ローダをラップして文字データ (medians / strokeGroups)
    // を捕捉し、mount 後にオーバーレイを重ねる。OFF 時は一切何も作らない。
    const guide = strokeGuide ? createStrokeGuide({ size: 300 }) : null;
    currentGuide = guide;
    const loaders = wrapLoadersForGuide(guide, {
      charDataLoader,
      configLoader,
    });
    try {
      const instance = char.create(ch, {
        charDataLoader: loaders.charDataLoader,
        configLoader: loaders.configLoader,
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
        // 1 画正解するたびに、ガイドを次の画へ進める。
        // data.strokeNum は論理画インデックス (0 始まり、strokeGroups 反映済み)。
        onCorrectStroke: (data) => {
          if (disposed || settled) return;
          if (myIndex !== currentIndex) return;
          guide?.setStroke(data.strokeNum + 1);
        },
        // 1 画ごとの判定が NG だった瞬間に、モンスターへ「はげまし」を依頼する。
        // onComplete は（無制限リトライのため）基本 matched:true で終わるので、
        // 失敗時の応援はこの per-stroke コールバックで出す。
        onMistake: (data) => {
          if (disposed || settled) return;
          if (myIndex !== currentIndex) return;
          try {
            ctx.reportReaction?.({
              correct: false,
              meta: { character: ch, strokeNum: data.strokeNum },
            });
          } catch (e) {
            console.error(
              "[plugin-writing-hiragana] reportReaction threw:",
              e
            );
          }
        },
        onComplete: (data) => {
          // dispose 後に kakitori の内部キューが onComplete を発火することがある。
          // settled なら無視。インデックスがズレている場合 (例: skip で進められた後)
          // も無視。
          if (disposed || settled) return;
          if (myIndex !== currentIndex) return;
          // 書き終わったのでガイドは消す。
          guide?.hide();
          // ユーザが実際に最後まで書ききった = データ層は健康。
          // 連続失敗カウンタをリセット。char.create / mount 直後ではなく
          // 実際に書き終えた時点でリセットすることで、mount で持続失敗するケースを拾える。
          consecutiveLoadFailures = 0;
          // やさしいモードではミス 1 回あたりの減点を緩める（0.1 → 0.04）。
          // 小さい子が何度もなぞり直しても、ごほうびがしっかりもらえるように。
          const mistakePenalty = lenient ? 0.04 : 0.1;
          const score = data.matched
            ? Math.max(0, 1 - data.totalMistakes * mistakePenalty)
            : 0.3;
          const outcome: QuestionOutcome = {
            questionId: `${ch}@${myIndex}`,
            correct: data.matched,
            score,
            elapsedMs: Date.now() - questionStartedAt,
            meta: {
              character: ch,
              totalMistakes: data.totalMistakes,
              attempts: data.attempts,
            },
          };
          outcomes.push(outcome);
          // Host にリアルタイム通知（モンスターの応援演出用）。
          try {
            ctx.reportOutcome?.(outcome);
          } catch (e) {
            console.error("[plugin-writing-hiragana] reportOutcome threw:", e);
          }
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
      // mount() が charHost 内に描画レイヤを作った後にオーバーレイを重ねる。
      guide?.attach(charHost);
    } catch (err) {
      guide?.destroy();
      if (currentGuide === guide) currentGuide = null;
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
    if (currentGuide) {
      currentGuide.destroy();
      currentGuide = null;
    }
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
