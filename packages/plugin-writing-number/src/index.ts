// 数字（0〜100）の書き取りプラグイン。
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
import type { StrokeGuide } from "@kakimon/plugin-writing-shared";
import {
  createStrokeGuide,
  createWritingQuestionVoice,
  numberToJapaneseReading,
  wrapLoadersForGuide,
} from "@kakimon/plugin-writing-shared";

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
// 2 けたをひとつの問題として出題する。100 は 3 けたなので別コースにする。
const TWO_DIGITS: readonly string[] = Array.from(
  { length: 90 },
  (_, i) => String(i + 10)
);

const manifest: PluginManifest = {
  id: "io.kakimon.writing.number",
  name: "すうじの かきとり",
  description: "0 から 100 までの すうじを かこう",
  version: "0.2.0",
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
    { key: "digits-two-digit", label: "10 〜 99（2けた）", level: 2 },
    { key: "digits-100", label: "100 に ちょうせん", level: 3 },
  ],
};

function pickQuestions(difficulty: string, count: number): string[] {
  if (difficulty === "digits-100") return count > 0 ? ["100"] : [];
  if (difficulty === "digits-all-ordered") {
    // 順番固定。count に合わせて先頭から切り出す。
    return ALL.slice(0, Math.min(count, ALL.length));
  }
  const source =
    difficulty === "digits-two-digit"
      ? TWO_DIGITS
      : difficulty === "digits-all-random"
        ? ALL
        : POOLS[difficulty] ?? ALL;
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
  // 「かきじゅんガイド」モード。いま書くべき 1 画の始点・終点・方向を
  // オーバーレイで示す。host が config.options.strokeGuide を true で渡すと有効。
  const strokeGuide = config.options?.strokeGuide === true;
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
  // 問題の表示時に読み上げ、🔊 からいつでも聞き直せるようにする。
  // 音声 OFF なら自動再生しない（手動での聞き直しは可能）。
  const questionVoice = createWritingQuestionVoice(
    header,
    config.options?.sound !== false
  );
  target.appendChild(header);

  const charHost = document.createElement("div");
  charHost.className = "kp-hiragana__char";
  // 2〜3文字の数字を、画面幅に収まる正方形セルとして横一列に表示する。
  charHost.style.width = "100%";
  charHost.style.maxWidth = "300px";
  charHost.style.display = "flex";
  charHost.style.justifyContent = "center";
  charHost.style.alignItems = "center";
  charHost.style.gap = "6px";
  charHost.style.margin = "0 auto";
  charHost.setAttribute("role", "group");
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
  // 複数桁はそれぞれ char.create し、左から順番に start() する。
  // 完了済みの数字の描画を残して「25」として見えるようにする。
  let mountedChars: Array<ReturnType<typeof char.create>> = [];
  let mountedGuides: Array<StrokeGuide | null> = [];
  let digitHosts: HTMLElement[] = [];
  let activeDigitIndex = -1;
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

  function unmountCurrent() {
    questionVoice.stop();
    // ガイドを先に外してから char インスタンスを破棄する。
    for (const guide of mountedGuides) guide?.destroy();
    for (const instance of mountedChars) {
      try {
        instance.destroy();
      } catch {
        // ignore: マウント途中で失敗している可能性
      }
    }
    mountedGuides = [];
    mountedChars = [];
    digitHosts = [];
    activeDigitIndex = -1;
    charHost.replaceChildren();
  }

  function activateDigit(index: number) {
    if (disposed || settled || index >= mountedChars.length) return;
    activeDigitIndex = index;
    digitHosts.forEach((host, i) => {
      // 未完成の桁には触れられない。完成した桁の筆跡はそのまま残す。
      host.style.pointerEvents = i === index ? "auto" : "none";
      host.style.opacity = i > index ? "0.6" : "1";
      host.style.outline = i === index ? "3px solid #34d399" : "none";
      host.setAttribute("aria-label", `${i + 1}けため`);
    });
    mountedChars[index]!.start();
    mountedGuides[index]?.attach(digitHosts[index]!);
  }

  function mountCurrent() {
    if (disposed) return;
    if (currentIndex >= questions.length) {
      safeComplete();
      return;
    }
    updateProgress();
    questionStartedAt = Date.now();

    const number = questions[currentIndex]!;
    const digits = [...number];
    const myIndex = currentIndex;
    const cellGap = 6;
    // 小さいスマホでも横に 2〜3 マス並べられるよう、描画とガイドのサイズを統一。
    const availableWidth = charHost.clientWidth || 300;
    const cellSize = Math.floor(
      (Math.min(300, availableWidth) - cellGap * (digits.length - 1)) /
        digits.length
    );
    charHost.style.height = `${cellSize}px`;
    charHost.setAttribute("aria-label", `${number}を かこう`);

    const scores: Array<{
      matched: boolean;
      score: number;
      mistakes: number;
      attempts: number;
    } | undefined> = new Array(digits.length);
    unmountCurrent();

    try {
      digits.forEach((digit, index) => {
        const host = document.createElement("div");
        host.style.width = `${cellSize}px`;
        host.style.height = `${cellSize}px`;
        host.style.flex = `0 0 ${cellSize}px`;
        host.style.position = "relative";
        host.style.borderRadius = "8px";
        host.style.pointerEvents = "none";
        host.style.touchAction = "none";
        charHost.appendChild(host);
        digitHosts.push(host);

        // 既存の「かきじゅんガイド」を各桁へ適用。現在の桁のみ表示する。
        const guide = strokeGuide ? createStrokeGuide({ size: cellSize }) : null;
        mountedGuides.push(guide);
        const loaders = wrapLoadersForGuide(guide, {
          charDataLoader,
          configLoader,
        });
        const instance = char.create(digit, {
          charDataLoader: loaders.charDataLoader,
          configLoader: loaders.configLoader,
          ...(lenient ? LENIENT_CHAR_OPTS : {}),
        });
        mountedChars.push(instance);
        instance.mount(host, {
          size: cellSize,
          showOutline: true,
          showCharacter: false,
          retainStrokes: true,
          drawingColor: "#2563eb",
          outlineColor: "#cbd5e1",
          highlightColor: "#fbbf24",
          ...(lenient ? LENIENT_MOUNT_OPTS : {}),
          onCorrectStroke: (data) => {
            if (disposed || settled || myIndex !== currentIndex) return;
            if (activeDigitIndex !== index) return;
            guide?.setStroke(data.strokeNum + 1);
          },
          onMistake: (data) => {
            if (disposed || settled || myIndex !== currentIndex) return;
            if (activeDigitIndex !== index) return;
            try {
              ctx.reportReaction?.({
                correct: false,
                meta: {
                  character: number,
                  digit,
                  digitIndex: index,
                  strokeNum: data.strokeNum,
                },
              });
            } catch (e) {
              console.error("[plugin-writing-number] reportReaction threw:", e);
            }
          },
          onComplete: (data) => {
            if (disposed || settled || myIndex !== currentIndex) return;
            if (activeDigitIndex !== index || scores[index]) return;
            guide?.hide();
            const penalty = lenient ? 0.04 : 0.1;
            scores[index] = {
              matched: data.matched,
              score: data.matched
                ? Math.max(0, 1 - data.totalMistakes * penalty)
                : 0.3,
              mistakes: data.totalMistakes,
              attempts: data.attempts,
            };
            host.style.pointerEvents = "none";

            if (index + 1 < digits.length) {
              // 数字の左から右へ。完了した桁は消さずに次の桁を開始する。
              clearPendingTimer();
              pendingTimer = window.setTimeout(() => {
                pendingTimer = null;
                if (disposed || settled || myIndex !== currentIndex) return;
                activateDigit(index + 1);
              }, 160);
              return;
            }

            consecutiveLoadFailures = 0;
            const completedScores = scores.filter(
              (s): s is NonNullable<typeof s> => s !== undefined
            );
            const totalMistakes = completedScores.reduce(
              (sum, s) => sum + s.mistakes, 0
            );
            const outcome: QuestionOutcome = {
              questionId: `${number}@${myIndex}`,
              correct: completedScores.every((s) => s.matched),
              score: completedScores.reduce((sum, s) => sum + s.score, 0) /
                digits.length,
              elapsedMs: Date.now() - questionStartedAt,
              meta: {
                character: number,
                totalMistakes,
                attempts: completedScores.reduce(
                  (sum, s) => sum + s.attempts, 0
                ),
                digitCount: digits.length,
              },
            };
            outcomes.push(outcome);
            try {
              ctx.reportOutcome?.(outcome);
            } catch (e) {
              console.error("[plugin-writing-number] reportOutcome threw:", e);
            }
            clearPendingTimer();
            pendingTimer = window.setTimeout(() => {
              pendingTimer = null;
              if (disposed || settled || myIndex !== currentIndex) return;
              unmountCurrent();
              currentIndex++;
              mountCurrent();
            }, 600);
          },
        });
      });
      activateDigit(0);
      // 二桁・三桁は桁ごとではなく「にじゅうご」のように数字全体を読む。
      questionVoice.announce(numberToJapaneseReading(number));
    } catch (err) {
      unmountCurrent();
      outcomes.push({
        questionId: `${number}@${myIndex}`,
        correct: false,
        score: 0,
        elapsedMs: Date.now() - questionStartedAt,
        meta: { character: number, error: String(err) },
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

  function onSkipClick() {
    if (disposed || settled) return;
    if (currentIndex < questions.length) {
      const ch = questions[currentIndex]!;
      const questionId = `${ch}@${currentIndex}`;
      // 書き終えて次の問題を待つ 600ms の間に「つぎへ」が押されても
      // 同じ問題を二重記録しない。
      if (!outcomes.some((o) => o.questionId === questionId)) {
        outcomes.push({
          questionId,
          correct: false,
          score: 0,
          elapsedMs: Date.now() - questionStartedAt,
          meta: { character: ch, skipped: true },
        });
      }
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
      questionVoice.destroy();
      target.replaceChildren();
    },
  };
}

export const plugin: ContentPlugin = {
  manifest,
  startSession,
};

export default plugin;
