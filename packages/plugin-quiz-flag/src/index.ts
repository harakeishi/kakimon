// 国旗クイズプラグイン。
//
// 1 問の画面構成（docs/03-plugin-architecture.md の contract に従い、
// 渡された target 要素の中だけで完結する）:
//
//   ┌──────────────────────┐
//   │        こっき         │  上部: 国旗
//   ├──────────────────────┤
//   │   3 つの せんたくし    │  中部: 3 択ボタン
//   ├───────────┬──────────┤
//   │  くにの かたち │  ひよこ  │  下部: 左=シルエット / 右=その国を楽しむひよこ
//   └───────────┴──────────┘
//
// シルエットと ひよこ は「答えのヒント」として最初から見せる。国旗だけでは
// 難しすぎるし、形・名物・国旗をセットで覚えるほうが学習として筋が良い。

import type {
  ContentPlugin,
  PluginManifest,
  QuestionOutcome,
  SessionConfig,
  SessionContext,
  SessionHandle,
} from "@kakimon/plugin-api";
import { COUNTRIES, POOLS, findCountry, type Country } from "./countries";
import { COUNTRY_SHAPES } from "./countryShapes";

const SVG_NS = "http://www.w3.org/2000/svg";

/** 1 問あたりの選択肢の数。 */
const CHOICE_COUNT = 3;

/** 正解・不正解を見せてから次の問題へ進むまでの待ち時間 (ms)。 */
const NEXT_DELAY_CORRECT_MS = 1200;
const NEXT_DELAY_WRONG_MS = 2200;

function baseUrl(): string {
  const base =
    (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return base.endsWith("/") ? base : `${base}/`;
}

/**
 * 絵文字を OpenMoji のファイル名（コードポイントを - でつないだもの）へ変換する。
 * 異体字セレクタ (FE0F) はファイル名に含まれないので落とす。
 */
function emojiCode(emoji: string): string {
  const parts: string[] = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0);
    if (cp === undefined || cp === 0xfe0f) continue;
    parts.push(cp.toString(16).toUpperCase().padStart(4, "0"));
  }
  return parts.join("-");
}

/** ISO 3166-1 alpha-2 → 国旗絵文字（地域表示記号のペア）。 */
function flagEmoji(iso: string): string {
  return [...iso.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

/**
 * OpenMoji の SVG を img で表示する。SVG が同期されていない場合は
 * ネイティブ絵文字のテキストへフォールバックする（apps/web の EmojiIcon と同じ方針）。
 */
function emojiEl(emoji: string, px: number, alt = ""): HTMLElement {
  const img = document.createElement("img");
  img.src = `${baseUrl()}emoji/${emojiCode(emoji)}.svg`;
  img.alt = alt;
  img.width = px;
  img.height = px;
  img.draggable = false;
  img.style.width = `${px}px`;
  img.style.height = `${px}px`;
  img.addEventListener(
    "error",
    () => {
      const span = document.createElement("span");
      span.textContent = emoji;
      span.style.fontSize = `${px}px`;
      span.style.lineHeight = "1";
      if (alt) span.setAttribute("aria-label", alt);
      else span.setAttribute("aria-hidden", "true");
      img.replaceWith(span);
    },
    { once: true }
  );
  return img;
}

function shuffled<T>(source: readonly T[]): T[] {
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function poolFor(difficulty: string): Country[] {
  const isos = POOLS[difficulty] ?? POOLS["flags-world"]!;
  const list = isos
    .map((iso) => findCountry(iso))
    .filter((c): c is Country => c !== undefined);
  return list.length >= CHOICE_COUNT ? list : [...COUNTRIES];
}

/**
 * count 問ぶんの出題を作る。プールが count より小さいときはシャッフルし直して
 * 使い回す（3 / 5 / 10 問をどのコースでも選べるようにするため）。
 * 同じ国が続けて出ないようにだけ気をつける。
 */
function pickQuestions(pool: Country[], count: number): Country[] {
  const out: Country[] = [];
  while (out.length < count) {
    let batch = shuffled(pool);
    const prev = out[out.length - 1];
    if (prev && batch[0]?.iso === prev.iso && batch.length > 1) {
      const tmp = batch[0]!;
      batch[0] = batch[1]!;
      batch[1] = tmp;
    }
    for (const c of batch) {
      if (out.length >= count) break;
      out.push(c);
    }
  }
  return out;
}

/** 正解 1 つ + 同じプールからのダミー 2 つを、順番をまぜて返す。 */
function pickChoices(answer: Country, pool: Country[]): Country[] {
  const others = shuffled(pool.filter((c) => c.iso !== answer.iso));
  const choices = [answer, ...others.slice(0, CHOICE_COUNT - 1)];
  return shuffled(choices);
}

const manifest: PluginManifest = {
  id: "io.kakimon.quiz.flag",
  name: "こっきクイズ",
  description: "こっきを みて くにの なまえを あてよう",
  version: "0.1.0",
  ageHint: { min: 4, max: 10 },
  category: "other",
  icon: "🌍",
  questionCounts: [3, 5, 10],
  difficulties: [
    { key: "flags-popular", label: "よく みる くに", level: 1 },
    { key: "flags-asia", label: "アジア", level: 2 },
    { key: "flags-europe", label: "ヨーロッパ", level: 2 },
    { key: "flags-americas", label: "アメリカたいりく", level: 3 },
    { key: "flags-africa-oceania", label: "アフリカ・オセアニア", level: 3 },
    { key: "flags-world", label: "せかい ぜんぶ", level: 4 },
  ],
};

/** 国のシルエットを描いた SVG。データが無い国は null を返す（枠ごと出さない）。 */
function shapeEl(iso: string): SVGSVGElement | null {
  const d = COUNTRY_SHAPES[iso];
  if (!d) return null;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("class", "kp-flagquiz__shape-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "くにの かたち");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  // レソトのような「国の中の穴」を穴として抜くため evenodd が必要。
  path.setAttribute("fill-rule", "evenodd");
  svg.appendChild(path);
  return svg;
}

/** その国の名物を身に着けたり楽しんだりしている ひよこ。 */
function chickEl(country: Country): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "kp-flagquiz__chick";

  const stage = document.createElement("div");
  stage.className = "kp-flagquiz__chick-stage";

  const chick = emojiEl("🐣", 68, `${country.name}の ひよこ`);
  chick.classList.add("kp-flagquiz__chick-base");
  stage.appendChild(chick);

  if (country.wear) {
    const hat = emojiEl(country.wear, 38);
    hat.classList.add("kp-flagquiz__chick-wear");
    stage.appendChild(hat);
  }

  // 2 個なら左右に、1 個なら「持っている」ように右側だけに置く。
  const items = country.items.slice(0, 2);
  items.forEach((item, i) => {
    const el = emojiEl(item, 34);
    el.classList.add(
      "kp-flagquiz__chick-item",
      items.length === 1 || i === 1
        ? "kp-flagquiz__chick-item--right"
        : "kp-flagquiz__chick-item--left"
    );
    stage.appendChild(el);
  });

  wrap.appendChild(stage);
  return wrap;
}

function startSession(
  target: HTMLElement,
  config: SessionConfig,
  ctx: SessionContext
): SessionHandle {
  const startedAt = Date.now();
  const pool = poolFor(config.difficulty);
  const total = Math.max(1, Math.min(20, Math.floor(config.questionCount ?? 5)));
  const questions = pickQuestions(pool, total);
  const outcomes: QuestionOutcome[] = [];

  target.replaceChildren();
  target.classList.add("kakimon-plugin-quiz-flag");

  const flagBox = document.createElement("div");
  flagBox.className = "kp-flagquiz__flag";

  const choicesBox = document.createElement("div");
  choicesBox.className = "kp-flagquiz__choices";

  const feedback = document.createElement("div");
  feedback.className = "kp-flagquiz__feedback";
  // 回答前も高さを確保しておき、判定が出たときに画面が跳ねないようにする。
  feedback.textContent = "";

  const bottom = document.createElement("div");
  bottom.className = "kp-flagquiz__bottom";
  const shapeBox = document.createElement("div");
  shapeBox.className = "kp-flagquiz__shape";
  const chickBox = document.createElement("div");
  chickBox.className = "kp-flagquiz__chick-slot";
  bottom.append(shapeBox, chickBox);

  // 進捗は Host のヘッダが reportProgress のラベルを出すので、ここでは持たない。
  target.append(flagBox, choicesBox, feedback, bottom);

  let currentIndex = 0;
  let disposed = false;
  let settled = false;
  let answered = false;
  let questionStartedAt = Date.now();
  let pendingTimer: number | null = null;

  function clearPendingTimer() {
    if (pendingTimer !== null) {
      window.clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  function updateProgress() {
    const label = `${currentIndex + 1} / ${questions.length}`;
    ctx.reportProgress({ ratio: currentIndex / questions.length, label });
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
      console.error("[plugin-quiz-flag] ctx.complete threw:", e);
    }
  }

  function renderQuestion() {
    if (disposed) return;
    if (currentIndex >= questions.length) {
      safeComplete();
      return;
    }
    answered = false;
    questionStartedAt = Date.now();
    updateProgress();

    const answer = questions[currentIndex]!;

    // 上部: 国旗
    flagBox.replaceChildren(
      emojiEl(flagEmoji(answer.iso), 180, "この くにの こっき")
    );

    // 中部: 3 択
    const choices = pickChoices(answer, pool);
    choicesBox.replaceChildren();
    for (const c of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kp-flagquiz__choice";
      btn.textContent = c.name;
      btn.dataset.iso = c.iso;
      btn.addEventListener("click", () => onAnswer(answer, c));
      choicesBox.appendChild(btn);
    }

    feedback.textContent = "";
    feedback.className = "kp-flagquiz__feedback";

    // 下部左: くにの かたち
    const shape = shapeEl(answer.iso);
    shapeBox.replaceChildren();
    if (shape) {
      shapeBox.appendChild(shape);
      shapeBox.style.visibility = "visible";
    } else {
      // シルエットが無い国でもレイアウトを崩さないよう、枠だけ残して隠す。
      shapeBox.style.visibility = "hidden";
    }

    // 下部右: その国を楽しんでいる ひよこ
    chickBox.replaceChildren(chickEl(answer));
  }

  function onAnswer(answer: Country, chosen: Country) {
    if (disposed || settled || answered) return;
    answered = true;
    const correct = chosen.iso === answer.iso;

    const buttons = choicesBox.querySelectorAll<HTMLButtonElement>(
      ".kp-flagquiz__choice"
    );
    for (const btn of buttons) {
      btn.disabled = true;
      if (btn.dataset.iso === answer.iso) {
        btn.classList.add("is-correct");
      } else if (btn.dataset.iso === chosen.iso) {
        btn.classList.add("is-wrong");
      }
    }

    feedback.className = `kp-flagquiz__feedback ${
      correct ? "is-correct" : "is-wrong"
    }`;
    feedback.textContent = correct
      ? `せいかい！ ${answer.name}は ${answer.trivia}`
      : `${answer.name}だよ。${answer.trivia}`;

    const outcome: QuestionOutcome = {
      questionId: `${answer.iso}@${currentIndex}`,
      correct,
      score: correct ? 1 : 0,
      elapsedMs: Date.now() - questionStartedAt,
      meta: { iso: answer.iso, chosen: chosen.iso },
    };
    outcomes.push(outcome);
    try {
      ctx.reportOutcome?.(outcome);
    } catch (e) {
      console.error("[plugin-quiz-flag] reportOutcome threw:", e);
    }

    clearPendingTimer();
    pendingTimer = window.setTimeout(
      () => {
        pendingTimer = null;
        if (disposed) return;
        currentIndex++;
        renderQuestion();
      },
      correct ? NEXT_DELAY_CORRECT_MS : NEXT_DELAY_WRONG_MS
    );
  }

  renderQuestion();

  return {
    dispose() {
      if (disposed) return;
      if (!settled) {
        settled = true;
        try {
          ctx.abort("user", "session disposed before completion");
        } catch (e) {
          console.error("[plugin-quiz-flag] dispose abort threw:", e);
        }
      }
      disposed = true;
      clearPendingTimer();
      target.classList.remove("kakimon-plugin-quiz-flag");
      target.replaceChildren();
    },
  };
}

export const plugin: ContentPlugin = {
  manifest,
  startSession,
};

export default plugin;
