// せん なぞり（運筆）プラグイン。
// 「ひよこを ごはんまで つれていこう」: 点線の道にそって指でなぞると、ひよこが
// 指についてきて、ゴールに着くと ごはんを たべる。文字を書く前の、線を引く練習。
//
// 3 歳向けの方針（docs/05-ui-ux.md 5.9）:
// - 指が途中で離れても「部分完了」として認める。何回でも続きから なぞれる。
// - 判定は「道のどれくらいを通ったか」（coverage）だけ。はみ出しは減点しない。
// - うまくいかないときは、ひよこが お手本で道を歩いて見せる（ヒント）。
// - タイマー・失敗表示は無い。
//
// 画面（target の中だけで完結）:
//   ┌──────────────────────┐
//   │ 「ひよこを りんごまで」🔊 │ 問いかけ
//   ├──────────────────────┤
//   │   🐥 ‥‥‥‥‥‥‥‥ 🍎    │ なぞる場所（SVG）
//   ├──────────────────────┤
//   │        たべた！        │ フィードバック
//   └──────────────────────┘

import type {
  ContentPlugin,
  PluginManifest,
  QuestionOutcome,
  SessionConfig,
  SessionContext,
  SessionHandle,
} from "@kakimon/plugin-api";
import {
  el,
  emojiCode,
  baseUrl,
  pickCycle,
  pickOne,
  playCorrect,
  playWrong,
  speak,
  stopSpeaking,
} from "@kakimon/plugin-preschool-shared";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

/** 描画領域の論理サイズ（viewBox）。横長。 */
const VW = 100;
const VH = 72;

interface Track {
  key: string;
  name: string;
  /** viewBox 0 0 100 72 の path */
  d: string;
}

const TRACKS: readonly Track[] = [
  { key: "h", name: "よこに まっすぐ", d: "M12 36 L88 36" },
  { key: "v", name: "たてに まっすぐ", d: "M50 8 L50 64" },
  { key: "diag", name: "ななめに", d: "M12 60 L88 12" },
  { key: "curve", name: "やまを こえて", d: "M10 56 Q50 2 90 56" },
  { key: "valley", name: "たにを こえて", d: "M10 14 Q50 70 90 14" },
  { key: "s", name: "くねくね", d: "M10 16 C40 16 60 56 90 56" },
  { key: "zigzag", name: "ギザギザ", d: "M8 56 L28 14 L48 56 L68 14 L88 56" },
  {
    key: "wave",
    name: "なみなみ",
    d: "M6 36 C16 6 26 6 36 36 S56 66 66 36 S86 6 94 36",
  },
  { key: "circle", name: "まる", d: "M50 10 A26 26 0 1 1 27.5 23" },
  {
    key: "spiral",
    name: "ぐるぐる",
    d: "M52 38 C58 38 58 46 50 46 C38 46 38 28 52 28 C70 28 70 52 50 52 C26 52 26 18 54 14",
  },
];

const POOLS: Record<string, readonly string[]> = {
  "lines-straight": ["h", "v", "diag"],
  "lines-curve": ["curve", "valley", "s"],
  "lines-zigzag": ["zigzag", "wave"],
  "lines-loop": ["circle", "spiral"],
  "lines-all": TRACKS.map((t) => t.key),
};

const GOALS: readonly { emoji: string; name: string }[] = [
  { emoji: "🍎", name: "りんご" },
  { emoji: "🍓", name: "いちご" },
  { emoji: "🍬", name: "あめ" },
  { emoji: "🏠", name: "おうち" },
  { emoji: "⭐", name: "ほし" },
  { emoji: "🌸", name: "おはな" },
];

/** 道からこの距離（viewBox 単位）以内なら「道を通った」とみなす。 */
const TOLERANCE = 9;
/** ゴールにこの距離以内で「ついた」。 */
const GOAL_RADIUS = 11;
const SAMPLE_COUNT = 48;
const IDLE_HINT_MS = 7000;
const NEXT_DELAY_MS = 1500;

function trackOf(key: string): Track {
  return TRACKS.find((t) => t.key === key) ?? TRACKS[0]!;
}

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {}
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** 絵文字を SVG の image として置く（OpenMoji の SVG を href で参照）。 */
function emojiImage(emoji: string, size: number): SVGImageElement {
  const img = svgEl("image", {
    width: String(size),
    height: String(size),
  });
  const href = `${baseUrl()}emoji/${emojiCode(emoji)}.svg`;
  img.setAttribute("href", href);
  img.setAttributeNS(XLINK_NS, "xlink:href", href);
  return img;
}

interface Pt {
  x: number;
  y: number;
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const manifest: PluginManifest = {
  id: "io.kakimon.preschool.trace",
  name: "せん なぞり",
  description: "ひよこを ごはんまで つれていこう",
  version: "0.1.0",
  ageHint: { min: 3, max: 5 },
  kidsMode: true,
  category: "writing",
  icon: "✏",
  questionCounts: [3, 5, 8],
  difficulties: [
    { key: "lines-straight", label: "まっすぐ", level: 1 },
    { key: "lines-curve", label: "まがる", level: 1 },
    { key: "lines-zigzag", label: "ギザギザ・なみなみ", level: 2 },
    { key: "lines-loop", label: "まる・ぐるぐる", level: 2 },
    { key: "lines-all", label: "ぜんぶ", level: 3 },
  ],
};

function startSession(
  target: HTMLElement,
  config: SessionConfig,
  ctx: SessionContext
): SessionHandle {
  const startedAt = Date.now();
  const total = Math.max(1, Math.min(20, Math.floor(config.questionCount ?? 5)));
  const sound = config.options?.sound !== false;
  const pool = (POOLS[config.difficulty] ?? POOLS["lines-straight"]!).map(trackOf);
  const questions = pickCycle(pool, total, (a, b) => a.key === b.key);
  const outcomes: QuestionOutcome[] = [];

  target.replaceChildren();
  target.classList.add("kp-trace");

  const textRow = el("div", "kp-tapquiz__text-row");
  const textEl = el("div", "kp-tapquiz__text");
  const speakBtn = el("button", "kp-tapquiz__speak", "🔊");
  speakBtn.type = "button";
  speakBtn.setAttribute("aria-label", "もういちど きく");
  textRow.append(textEl, speakBtn);

  const board = el("div", "kp-trace__board");
  const svg = svgEl("svg", {
    viewBox: `0 0 ${VW} ${VH}`,
    class: "kp-trace__svg",
    role: "img",
  });
  const guide = svgEl("path", { class: "kp-trace__guide" });
  const trail = svgEl("path", { class: "kp-trace__trail" });
  const goalImg = emojiImage("🍎", 14);
  goalImg.setAttribute("class", "kp-trace__goal");
  const chickImg = emojiImage("🐥", 14);
  chickImg.setAttribute("class", "kp-trace__chick");
  svg.append(guide, trail, goalImg, chickImg);
  board.appendChild(svg);

  const feedback = el("div", "kp-tapquiz__feedback");
  feedback.setAttribute("aria-live", "polite");

  target.append(textRow, board, feedback);

  let index = 0;
  let disposed = false;
  let settled = false;
  let locked = false;
  let retries = 0;
  let questionStartedAt = Date.now();
  let samples: Pt[] = [];
  let covered: boolean[] = [];
  let strokes: Pt[][] = [];
  let drawing = false;
  let goal = GOALS[0]!;
  let prompt = "";
  let idleTimer: number | null = null;
  let hintAnim: number | null = null;
  const timers = new Set<number>();

  function later(fn: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (disposed) return;
      fn();
    }, ms);
    timers.add(id);
  }

  function clearAll() {
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
    clearIdle();
    stopHint();
  }

  function clearIdle() {
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function stopHint() {
    if (hintAnim !== null) {
      cancelAnimationFrame(hintAnim);
      hintAnim = null;
    }
  }

  function say(text: string) {
    if (!sound) return;
    speak(text);
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
    clearAll();
    const overall =
      outcomes.length > 0
        ? outcomes.reduce((s, o) => s + o.score, 0) / outcomes.length
        : 0;
    try {
      ctx.complete({ overallScore: overall, outcomes, durationMs: Date.now() - startedAt });
    } catch (e) {
      console.error("[plugin-trace-line] ctx.complete threw:", e);
    }
  }

  function placeImage(img: SVGImageElement, p: Pt, size: number) {
    img.setAttribute("x", String(p.x - size / 2));
    img.setAttribute("y", String(p.y - size / 2));
  }

  function toLocal(e: PointerEvent): Pt {
    const r = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * VW,
      y: ((e.clientY - r.top) / r.height) * VH,
    };
  }

  function coverage(): number {
    const n = covered.filter(Boolean).length;
    return samples.length ? n / samples.length : 0;
  }

  function renderTrail() {
    const d = strokes
      .filter((s) => s.length > 0)
      .map((s) =>
        s
          .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(" ")
      )
      .join(" ");
    trail.setAttribute("d", d);
  }

  /** ひよこが道を歩いて見せる お手本。 */
  function playHint() {
    stopHint();
    const len = guide.getTotalLength();
    const start = performance.now();
    const duration = 1800;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const p = guide.getPointAtLength(len * t);
      placeImage(chickImg, p, 14);
      if (t < 1 && !disposed) {
        hintAnim = requestAnimationFrame(step);
      } else {
        hintAnim = null;
        // お手本のあとは出発点に戻す。
        later(() => {
          if (!locked) placeImage(chickImg, samples[0]!, 14);
        }, 500);
      }
    };
    hintAnim = requestAnimationFrame(step);
  }

  function armIdle() {
    clearIdle();
    idleTimer = window.setTimeout(() => {
      idleTimer = null;
      if (disposed || settled || locked || drawing) return;
      say(prompt);
      playHint();
      armIdle();
    }, IDLE_HINT_MS);
  }

  function render() {
    if (disposed) return;
    const track = questions[index];
    if (!track) {
      complete();
      return;
    }
    locked = false;
    retries = 0;
    drawing = false;
    strokes = [];
    questionStartedAt = Date.now();
    updateProgress();

    goal = pickOne(GOALS);
    prompt = `ひよこを ${goal.name}まで つれていこう`;
    textEl.textContent = prompt;

    guide.setAttribute("d", track.d);
    trail.setAttribute("d", "");
    const len = guide.getTotalLength();
    samples = Array.from({ length: SAMPLE_COUNT }, (_, i) =>
      guide.getPointAtLength((len * i) / (SAMPLE_COUNT - 1))
    ).map((p) => ({ x: p.x, y: p.y }));
    covered = samples.map(() => false);

    const href = `${baseUrl()}emoji/${emojiCode(goal.emoji)}.svg`;
    goalImg.setAttribute("href", href);
    goalImg.setAttributeNS(XLINK_NS, "xlink:href", href);
    placeImage(goalImg, samples[samples.length - 1]!, 14);
    placeImage(chickImg, samples[0]!, 14);
    chickImg.classList.remove("is-happy");

    feedback.textContent = "";
    feedback.className = "kp-tapquiz__feedback";

    later(() => say(prompt), 350);
    armIdle();
  }

  function markCovered(p: Pt) {
    for (let i = 0; i < samples.length; i++) {
      if (!covered[i] && dist(samples[i]!, p) <= TOLERANCE) covered[i] = true;
    }
  }

  function onDown(e: PointerEvent) {
    if (disposed || settled || locked) return;
    e.preventDefault();
    stopHint();
    clearIdle();
    drawing = true;
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const p = toLocal(e);
    strokes.push([p]);
    markCovered(p);
    placeImage(chickImg, p, 14);
    renderTrail();
  }

  function onMove(e: PointerEvent) {
    if (!drawing || disposed || locked) return;
    e.preventDefault();
    const p = toLocal(e);
    const cur = strokes[strokes.length - 1]!;
    const last = cur[cur.length - 1]!;
    if (dist(last, p) < 0.8) return;
    cur.push(p);
    markCovered(p);
    placeImage(chickImg, p, 14);
    renderTrail();
    // ゴールに触れたら、そこで判定する（指を離すのを待たない）。
    if (dist(p, samples[samples.length - 1]!) <= GOAL_RADIUS && coverage() >= 0.45) {
      finish(true);
    }
  }

  function onUp(e: PointerEvent) {
    if (!drawing) return;
    drawing = false;
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (locked) return;
    const p = toLocal(e);
    const reached = dist(p, samples[samples.length - 1]!) <= GOAL_RADIUS;
    const cov = coverage();
    if (reached && cov >= 0.45) {
      finish(true);
    } else if (cov >= 0.85) {
      // 道はほぼ通ったがゴールの手前で離した: 十分なので ついたことにする。
      finish(true);
    } else {
      // 途中で離した。続きから なぞれるので、やさしく促すだけ。
      retries += 1;
      feedback.className = "kp-tapquiz__feedback is-wrong";
      feedback.textContent = cov < 0.2 ? "てんせんの うえを なぞってね" : "もうすこし！ つづけて";
      if (sound) playWrong();
      try {
        ctx.reportReaction?.({ correct: false, meta: { coverage: cov } });
      } catch (err) {
        console.error("[plugin-trace-line] reportReaction threw:", err);
      }
      later(() => say(feedback.textContent ?? ""), 100);
      if (retries >= 2) later(playHint, 1200);
      armIdle();
    }
  }

  function finish(success: boolean) {
    if (locked) return;
    locked = true;
    drawing = false;
    clearIdle();
    stopHint();
    const cov = coverage();
    // 1 回で通れたら 1.0。やり直しや部分完了は少し下げるが、必ず進める。
    const score = Math.max(0.3, Math.min(1, retries === 0 ? 0.6 + cov * 0.4 : 0.3 + cov * 0.4));
    const goalPt = samples[samples.length - 1]!;
    placeImage(chickImg, goalPt, 14);
    chickImg.classList.add("is-happy");
    goalImg.setAttribute("opacity", "0.25");
    feedback.className = "kp-tapquiz__feedback is-correct";
    feedback.replaceChildren(
      el("span", "kp-tapquiz__sparkle", "✨"),
      el("span", undefined, `${goal.name}を たべた！`),
      el("span", "kp-tapquiz__sparkle", "✨")
    );
    if (sound) playCorrect();
    say(`やったー！ ${goal.name}を たべた！`);
    const outcome: QuestionOutcome = {
      questionId: `${questions[index]!.key}@${index}`,
      correct: success && retries === 0,
      score,
      elapsedMs: Date.now() - questionStartedAt,
      meta: { coverage: cov, retries, strokes: strokes.length },
    };
    outcomes.push(outcome);
    try {
      ctx.reportOutcome?.(outcome);
    } catch (e) {
      console.error("[plugin-trace-line] reportOutcome threw:", e);
    }
    later(() => {
      index += 1;
      render();
    }, NEXT_DELAY_MS);
  }

  svg.addEventListener("pointerdown", onDown);
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerup", onUp);
  svg.addEventListener("pointercancel", onUp);
  speakBtn.addEventListener("click", () => speak(prompt));

  render();

  return {
    dispose() {
      if (disposed) return;
      if (!settled) {
        settled = true;
        try {
          ctx.abort("user", "session disposed before completion");
        } catch (e) {
          console.error("[plugin-trace-line] dispose abort threw:", e);
        }
      }
      disposed = true;
      clearAll();
      stopSpeaking();
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
      svg.removeEventListener("pointercancel", onUp);
      target.classList.remove("kp-trace");
      target.replaceChildren();
    },
  };
}

export const plugin: ContentPlugin = { manifest, startSession };
export default plugin;
