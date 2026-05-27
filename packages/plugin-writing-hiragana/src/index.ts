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
  // import.meta.env は Vite 提供。プラグインは Vite で処理される workspace
  // source-only パッケージのためそのまま参照できる。
  const base =
    (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return base.endsWith("/") ? base : `${base}/`;
}

const charDataLoader: NonNullable<CharCreateOptions["charDataLoader"]> = (
  c,
  onLoad,
  onError
) => {
  fetch(`${baseUrl()}kakitori/chars/${encodeURIComponent(c)}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`http ${res.status}`);
      return res.json();
    })
    .then((data) => onLoad(data))
    .catch((err) => onError(err));
};

const configLoader: NonNullable<CharCreateOptions["configLoader"]> = async (
  c
): Promise<CharacterConfig | null> => {
  try {
    const res = await fetch(
      `${baseUrl()}kakitori/config/${encodeURIComponent(c)}.json`
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`http ${res.status}`);
    return (await res.json()) as CharacterConfig;
  } catch {
    return null;
  }
};

// ひらがな清音 46 文字（kakitori の hiragana セットの先頭部分から、清音だけ取り出す）。
// kakitori の `hiragana` には濁音・拗音も含まれる場合があるため、ここで清音だけ確定させる。
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

// kakitori が提供する文字集合の中から、確実にレンダリングできるものに絞る。
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

validateManifest(manifest);

function pickQuestions(difficulty: string, count: number): string[] {
  const source =
    difficulty === "easy"
      ? POOL.slice(0, Math.min(POOL.length, 10))
      : [...POOL];
  // シャッフル
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

  // ターゲットの DOM 構造を組み立てる
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
  // 一辺 300px の正方形領域
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
  let questionStartedAt = Date.now();

  function updateProgress() {
    progressLabel.textContent = `${currentIndex + 1} / ${questions.length}`;
    ctx.reportProgress({
      ratio: currentIndex / questions.length,
      label: `${currentIndex + 1} / ${questions.length}`,
    });
  }

  function mountCurrent() {
    if (disposed) return;
    if (currentIndex >= questions.length) {
      finishSession();
      return;
    }
    updateProgress();
    questionStartedAt = Date.now();

    const ch = questions[currentIndex]!;
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
          const score = data.matched
            ? Math.max(0, 1 - data.totalMistakes * 0.1)
            : 0.3;
          outcomes.push({
            questionId: `${ch}@${currentIndex}`,
            correct: data.matched,
            score,
            elapsedMs: Date.now() - questionStartedAt,
            meta: {
              character: ch,
              totalMistakes: data.totalMistakes,
              attempts: data.attempts,
            },
          });
          // 少し演出を見せてから次の問題へ
          window.setTimeout(() => {
            unmountCurrent();
            currentIndex++;
            mountCurrent();
          }, 600);
        },
      });
      instance.start();
    } catch (err) {
      // kakitori がデータを持っていない文字などのフォールバック
      const elapsed = Date.now() - questionStartedAt;
      outcomes.push({
        questionId: `${ch}@${currentIndex}`,
        correct: false,
        score: 0,
        elapsedMs: elapsed,
        meta: { character: ch, error: String(err) },
      });
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

  function finishSession() {
    if (disposed) return;
    const overall =
      outcomes.length > 0
        ? outcomes.reduce((sum, o) => sum + o.score, 0) / outcomes.length
        : 0;
    ctx.complete({
      overallScore: overall,
      outcomes,
      durationMs: Date.now() - startedAt,
    });
  }

  skipBtn.addEventListener("click", () => {
    // スキップは「不正解」扱い（score 0）で次へ進む
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
    unmountCurrent();
    currentIndex++;
    mountCurrent();
  });

  // 初回スタート
  mountCurrent();

  return {
    dispose() {
      disposed = true;
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
