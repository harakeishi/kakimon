// 「問いかけ → 大きな選択肢をタップ」形式の共通エンジン。
// 3 歳児向けの前提:
// - 文字は読めない。問いは声（speak）と絵で伝え、文字は添えるだけ。
// - 間違えても「失敗」にしない。押した選択肢がぷるっと揺れて薄くなるだけで、
//   そのまま続けて選べる。2 回まちがえたら正解がゆっくり光ってヒントになる。
// - 正解は必ず祝う（✨ + ほめ言葉 + 声）。
// - タイマーや制限は無い。
//
// 画面構成（Host から渡された target の中だけで完結する）:
//
//   ┌──────────────────────┐
//   │     （絵 / 任意）      │  問いの絵: かずの果物・おなじものの見本 など
//   │  「あかは どれ？」 🔊  │  問いかけ（読み上げボタン付き）
//   ├──────┬──────┬────────┤
//   │  ○   │  ○   │   ○    │  大きな選択肢（2〜4 個）
//   ├──────┴──────┴────────┤
//   │      せいかい！ ✨     │  フィードバック
//   └──────────────────────┘

import type {
  QuestionOutcome,
  SessionContext,
  SessionHandle,
} from "@kakimon/plugin-api";
import { playCorrect, playWrong } from "./audio";
import { el, pickOne } from "./dom";
import { speak, stopSpeaking } from "./speech";

export interface TapChoice {
  /** 問題内で一意 */
  key: string;
  /** 選択肢の中身（絵・色・文字など）。engine が button の中に入れる */
  el: HTMLElement;
  /** 読み上げ用の名前（任意。正解時に「りんご！」のように復唱する） */
  name?: string;
  /** アクセシビリティ用ラベル（省略時 name） */
  ariaLabel?: string;
}

export interface TapQuestion {
  id: string;
  /** 画面に出す問いかけ（短く。読めなくてもよい） */
  text: string;
  /** 読み上げ用（省略時は text） */
  speech?: string;
  /** 問いの絵（任意） */
  art?: HTMLElement;
  choices: TapChoice[];
  answerKey: string;
  /** 正解時に復唱する言葉（任意。例: 「あか！」） */
  answerSpeech?: string;
}

export interface TapQuizOptions {
  questions: TapQuestion[];
  /** 選択肢の列数（既定: 選択肢数が 4 なら 2、それ以外は選択肢数） */
  columns?: number;
  /** 読み上げを出すか（Host の options.sound） */
  sound: boolean;
  /** console 用の接頭辞 */
  logPrefix: string;
  /** 選択肢の大きさ。"xl" は色・形など 1 列 3 個が丸ごと絵の場合 */
  choiceSize?: "lg" | "xl";
}

const PRAISE = ["せいかい！", "すごい！", "やったね！", "じょうず！", "ピンポーン！"];
const RETRY = ["もういちど！", "ちがうよ、もういちど", "おしい！"];

const NEXT_DELAY_MS = 1300;
const SPEAK_DELAY_MS = 350;
const HINT_AFTER_MISSES = 2;
// 無操作が続いたときの促し（Sesame Workshop の目安: ゲームは 6〜8 秒）。
// 1 回目は問いを言い直し、2 回目で正解をそっと光らせる。
const IDLE_PROMPT_MS = 7000;

/** 試行回数 → スコア。1 回目 1.0、2 回目 0.6、ヒント後 0.3。 */
function scoreFor(attempts: number): number {
  if (attempts <= 1) return 1;
  if (attempts === 2) return 0.6;
  return 0.3;
}

export function createTapQuizSession(
  target: HTMLElement,
  ctx: SessionContext,
  opts: TapQuizOptions
): SessionHandle {
  const startedAt = Date.now();
  const { questions, sound, logPrefix } = opts;
  const outcomes: QuestionOutcome[] = [];

  target.replaceChildren();
  target.classList.add("kp-tapquiz");

  const promptBox = el("div", "kp-tapquiz__prompt");
  const artBox = el("div", "kp-tapquiz__art");
  const textRow = el("div", "kp-tapquiz__text-row");
  const textEl = el("div", "kp-tapquiz__text");
  const speakBtn = el("button", "kp-tapquiz__speak");
  speakBtn.type = "button";
  speakBtn.setAttribute("aria-label", "もういちど きく");
  speakBtn.textContent = "🔊";
  textRow.append(textEl, speakBtn);
  promptBox.append(artBox, textRow);

  const choicesBox = el("div", "kp-tapquiz__choices");
  const feedback = el("div", "kp-tapquiz__feedback");
  feedback.setAttribute("aria-live", "polite");

  target.append(promptBox, choicesBox, feedback);

  let index = 0;
  let attempts = 0;
  let disposed = false;
  let settled = false;
  let locked = false;
  let questionStartedAt = Date.now();
  let idleCount = 0;
  let idleTimer: number | null = null;
  const timers = new Set<number>();

  function later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (disposed) return;
      fn();
    }, ms);
    timers.add(id);
  }

  function clearTimers() {
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
    clearIdle();
  }

  function clearIdle() {
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  /** 無操作の促し。問いを言い直し、2 回目以降は正解をそっと光らせる。 */
  function armIdle(q: TapQuestion) {
    clearIdle();
    idleTimer = window.setTimeout(() => {
      idleTimer = null;
      if (disposed || settled || locked) return;
      idleCount += 1;
      say(q.speech ?? q.text);
      if (idleCount >= 2) {
        const answerBtn = choicesBox.querySelector<HTMLButtonElement>(
          `.kp-tapquiz__choice[data-key="${CSS.escape(q.answerKey)}"]`
        );
        answerBtn?.classList.add("is-hint");
      }
      armIdle(q);
    }, IDLE_PROMPT_MS);
  }

  function say(text: string | undefined) {
    if (!sound || !text) return;
    speak(text);
  }

  function current(): TapQuestion | undefined {
    return questions[index];
  }

  function updateProgress() {
    ctx.reportProgress({
      ratio: index / questions.length,
      label: `${Math.min(index + 1, questions.length)} / ${questions.length}`,
    });
  }

  function complete() {
    if (disposed || settled) return;
    settled = true;
    clearTimers();
    const overall =
      outcomes.length > 0
        ? outcomes.reduce((s, o) => s + o.score, 0) / outcomes.length
        : 0;
    try {
      ctx.complete({
        overallScore: overall,
        outcomes,
        durationMs: Date.now() - startedAt,
      });
    } catch (e) {
      console.error(`${logPrefix} ctx.complete threw:`, e);
    }
  }

  speakBtn.addEventListener("click", () => {
    const q = current();
    if (!q) return;
    // 🔊 はユーザ操作なので、sound が OFF でも押した時だけは鳴らす。
    speak(q.speech ?? q.text);
  });

  function render() {
    if (disposed) return;
    const q = current();
    if (!q) {
      complete();
      return;
    }
    attempts = 0;
    idleCount = 0;
    locked = false;
    questionStartedAt = Date.now();
    updateProgress();

    artBox.replaceChildren();
    if (q.art) {
      artBox.appendChild(q.art);
      artBox.hidden = false;
    } else {
      artBox.hidden = true;
    }
    textEl.textContent = q.text;

    const cols = opts.columns ?? (q.choices.length === 4 ? 2 : q.choices.length);
    choicesBox.style.setProperty("--kp-cols", String(cols));
    choicesBox.className = `kp-tapquiz__choices${
      opts.choiceSize === "xl" ? " kp-tapquiz__choices--xl" : ""
    }`;
    choicesBox.replaceChildren();
    for (const c of q.choices) {
      const btn = el("button", "kp-tapquiz__choice");
      btn.type = "button";
      btn.dataset.key = c.key;
      const label = c.ariaLabel ?? c.name;
      if (label) btn.setAttribute("aria-label", label);
      btn.appendChild(c.el);
      // 指が触れた瞬間に見た目で反応する（子どもは反応が見えるまで押し続ける）。
      btn.addEventListener("pointerdown", () => {
        if (!btn.disabled) btn.classList.add("is-pressed");
      });
      const release = () => btn.classList.remove("is-pressed");
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointercancel", release);
      btn.addEventListener("pointerleave", release);
      btn.addEventListener("click", () => onTap(q, c, btn));
      choicesBox.appendChild(btn);
    }

    feedback.textContent = "";
    feedback.className = "kp-tapquiz__feedback";

    // 画面が出てから一呼吸おいて問いかける。
    later(() => say(q.speech ?? q.text), SPEAK_DELAY_MS);
    armIdle(q);
  }

  function onTap(q: TapQuestion, c: TapChoice, btn: HTMLButtonElement) {
    if (disposed || settled || locked) return;
    if (btn.disabled) return;
    attempts += 1;
    idleCount = 0;
    const correct = c.key === q.answerKey;

    if (!correct) {
      // 押した選択肢だけ薄くして揺らす。他はそのまま選べる。
      if (sound) playWrong();
      btn.disabled = true;
      btn.classList.add("is-wrong");
      feedback.className = "kp-tapquiz__feedback is-wrong";
      feedback.textContent = pickOne(RETRY);
      say(feedback.textContent);
      try {
        ctx.reportReaction?.({ correct: false, meta: { attempts } });
      } catch (e) {
        console.error(`${logPrefix} reportReaction threw:`, e);
      }
      if (attempts >= HINT_AFTER_MISSES) {
        // 正解をゆっくり光らせてヒントにする。
        const answerBtn = choicesBox.querySelector<HTMLButtonElement>(
          `.kp-tapquiz__choice[data-key="${CSS.escape(q.answerKey)}"]`
        );
        answerBtn?.classList.add("is-hint");
      }
      // 少しして問いをもう一度。
      later(() => say(q.speech ?? q.text), 1400);
      armIdle(q);
      return;
    }

    locked = true;
    clearIdle();
    if (sound) playCorrect();
    const buttons = choicesBox.querySelectorAll<HTMLButtonElement>(
      ".kp-tapquiz__choice"
    );
    for (const b of buttons) {
      b.disabled = true;
      if (b === btn) {
        b.classList.remove("is-hint");
        b.classList.add("is-correct");
      } else {
        b.classList.add("is-muted");
      }
    }
    const praise = pickOne(PRAISE);
    feedback.className = "kp-tapquiz__feedback is-correct";
    feedback.replaceChildren(
      el("span", "kp-tapquiz__sparkle", "✨"),
      el("span", undefined, praise),
      el("span", "kp-tapquiz__sparkle", "✨")
    );
    const echo = q.answerSpeech ?? c.name;
    say(echo ? `${praise} ${echo}` : praise);

    const outcome: QuestionOutcome = {
      questionId: `${q.id}@${index}`,
      correct: attempts === 1,
      score: scoreFor(attempts),
      elapsedMs: Date.now() - questionStartedAt,
      meta: { attempts, chosen: c.key },
    };
    outcomes.push(outcome);
    try {
      ctx.reportOutcome?.(outcome);
    } catch (e) {
      console.error(`${logPrefix} reportOutcome threw:`, e);
    }

    later(() => {
      index += 1;
      render();
    }, NEXT_DELAY_MS);
  }

  render();

  return {
    dispose() {
      if (disposed) return;
      if (!settled) {
        settled = true;
        try {
          ctx.abort("user", "session disposed before completion");
        } catch (e) {
          console.error(`${logPrefix} dispose abort threw:`, e);
        }
      }
      disposed = true;
      clearTimers();
      stopSpeaking();
      target.classList.remove("kp-tapquiz");
      target.replaceChildren();
    },
  };
}
