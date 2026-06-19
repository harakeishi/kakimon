import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { findPlugin } from "../../plugin-host/registry";
import type {
  DifficultyOption,
  SessionContext,
  SessionResult,
} from "@kakimon/plugin-api";
import { calculateReward } from "../../domain/rewardCalculator";
import { useGameStore } from "../../state/gameStore";

// プラグインがハングした場合の watchdog。
// docs/03-plugin-architecture.md「呼ばれない場合のタイムアウトは Host 側で扱う」
// に対応。MVP では一律 10 分を上限とする。
const SESSION_WATCHDOG_MS = 10 * 60 * 1000;

// 「やさしいはんてい」モードの保存キー。なぞりの判定が厳しすぎて小さい子が
// 飽きてしまうため、保護者が ON にすると判定を緩める。プラグインへは
// SessionConfig.options.lenient として渡る。設定はデバイスに残す（localStorage）。
const LENIENT_STORAGE_KEY = "kakimon.lenientJudge";

function loadLenient(): boolean {
  try {
    return localStorage.getItem(LENIENT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveLenient(value: boolean): void {
  try {
    localStorage.setItem(LENIENT_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // localStorage が使えない環境(プライベートモード等)でも続行する
  }
}

interface FinalizeArgs {
  difficulty: DifficultyOption;
  pluginId: string;
  pluginName: string;
}

export function StudyPlayScreen() {
  const { pluginId = "" } = useParams();
  const navigate = useNavigate();
  const plugin = useMemo(
    () => findPlugin(decodeURIComponent(pluginId)),
    [pluginId]
  );
  const applyReward = useGameStore((s) => s.applyReward);

  const [difficulty, setDifficulty] = useState<DifficultyOption | null>(null);
  const [lenient, setLenient] = useState<boolean>(loadLenient);
  const [progressLabel, setProgressLabel] = useState("");
  const targetRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<{ dispose(): void } | null>(null);
  const [showQuit, setShowQuit] = useState(false);

  useEffect(() => {
    if (!plugin) return;
    if (!difficulty) return;
    const target = targetRef.current;
    if (!target) return;

    // 各 effect 実行ごとに独立した settled フラグを持つ。
    // ref を共有すると、effect 再実行で旧 ctx の停止判定が新セッションに
    // 漏れ込んでしまうため、ローカル変数で閉じる。
    let settled = false;
    let watchdog: number | null = null;

    const finalizeArgs: FinalizeArgs = {
      difficulty,
      pluginId: plugin.manifest.id,
      pluginName: plugin.manifest.name,
    };

    const ctx: SessionContext = {
      complete: (result) => {
        if (settled) return;
        settled = true;
        if (watchdog !== null) window.clearTimeout(watchdog);
        void finalizeSession(result, finalizeArgs);
      },
      abort: (reason, detail) => {
        if (settled) return;
        settled = true;
        if (watchdog !== null) window.clearTimeout(watchdog);
        if (reason === "error") {
          console.warn("[study] plugin aborted with error:", detail);
        }
        navigate("/", { replace: true });
      },
      reportProgress: (p) => {
        setProgressLabel(p.label ?? "");
      },
      locale: "ja",
    };

    let handle: { dispose(): void } | null = null;
    try {
      handle = plugin.startSession(
        target,
        {
          difficulty: difficulty.key,
          questionCount: 5,
          // やさしいはんていモード。プラグインがなぞり判定の許容度を上げる。
          options: { lenient },
        },
        ctx
      );
    } catch (err) {
      console.error("[study] startSession threw:", err);
      navigate("/", { replace: true });
      return;
    }
    handleRef.current = handle;

    watchdog = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn(
        `[study] plugin ${plugin.manifest.id} did not complete in ${SESSION_WATCHDOG_MS}ms, aborting`
      );
      try {
        handle?.dispose();
      } catch {
        // ignore
      }
      navigate("/", { replace: true });
    }, SESSION_WATCHDOG_MS);

    return () => {
      if (watchdog !== null) window.clearTimeout(watchdog);
      try {
        handle?.dispose();
      } catch {
        // ignore
      }
      handleRef.current = null;
    };
    // navigate / applyReward は安定 ref。finalizeSession は下の関数宣言で巻き上げ。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, plugin]);

  // 難易度未選択ならまずプラグイン選択画面
  if (!plugin) {
    return (
      <>
        <div className="card center">プラグインが みつからない</div>
        <button className="btn btn--block" onClick={() => navigate("/study")}>
          もどる
        </button>
      </>
    );
  }

  async function finalizeSession(
    result: SessionResult,
    args: FinalizeArgs
  ) {
    const reward = calculateReward(result, {
      difficultyLevel: args.difficulty.level,
    });
    const sessionRecord = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      pluginId: args.pluginId,
      startedAt: new Date(Date.now() - result.durationMs).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: result.durationMs,
      difficulty: args.difficulty.key,
      overallScore: result.overallScore,
      outcomes: result.outcomes,
      rewards: reward,
    };
    let applied: {
      coins: number;
      exp: number;
      leveledUp: boolean;
      wasDeceased: boolean;
      didHatch: boolean;
    };
    try {
      applied = await applyReward(sessionRecord);
    } catch (e) {
      console.error("[study] applyReward failed:", e);
      // 報酬保存に失敗してもユーザを宙ぶらりんにせず、ホームへ戻す
      navigate("/", { replace: true });
      return;
    }
    navigate("/study/result", {
      replace: true,
      state: {
        pluginId: args.pluginId,
        pluginName: args.pluginName,
        reward: applied,
        score: result.overallScore,
        questionCount: result.outcomes.length,
      },
    });
  }

  if (!difficulty) {
    // 行ごと/数字グループのコースが増えたので、レベルごとにまとめて表示する。
    const byLevel = new Map<number, DifficultyOption[]>();
    for (const d of plugin.manifest.difficulties) {
      const arr = byLevel.get(d.level) ?? [];
      arr.push(d);
      byLevel.set(d.level, arr);
    }
    const levels = [...byLevel.keys()].sort((a, b) => a - b);
    return (
      <>
        <header className="row">
          <button className="btn btn--ghost" onClick={() => navigate(-1)}>
            ← もどる
          </button>
          <h1 style={{ margin: 0, marginLeft: 12 }}>{plugin.manifest.name}</h1>
        </header>
        <p className="muted" style={{ margin: "0 4px" }}>
          コースを えらんでね
        </p>
        <button
          type="button"
          className={`lenient-toggle${lenient ? " is-on" : ""}`}
          role="switch"
          aria-checked={lenient}
          onClick={() => {
            const next = !lenient;
            setLenient(next);
            saveLenient(next);
          }}
        >
          <span className="lenient-toggle__text">
            <span className="lenient-toggle__title">やさしい はんてい</span>
            <span className="lenient-toggle__hint">
              ちいさい こ むけ。はんていを ゆるくするよ
            </span>
          </span>
          <span className="lenient-toggle__switch" aria-hidden>
            <span className="lenient-toggle__knob" />
          </span>
        </button>
        {levels.map((lv) => (
          <section key={lv} className="card" style={{ padding: 12 }}>
            <h3 style={{ margin: "0 0 8px" }}>レベル {lv}</h3>
            <div className="difficulty-grid">
              {byLevel.get(lv)!.map((d) => (
                <button
                  key={d.key}
                  className="difficulty-chip"
                  onClick={() => setDifficulty(d)}
                >
                  <span className="difficulty-chip__icon" aria-hidden>
                    {plugin.manifest.icon}
                  </span>
                  <span className="difficulty-chip__label">{d.label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </>
    );
  }

  return (
    <>
      <header className="row">
        <button className="btn btn--ghost" onClick={() => setShowQuit(true)}>
          やめる
        </button>
        <div className="spacer" />
        <strong>{progressLabel}</strong>
      </header>

      <section className="card" style={{ padding: 12 }}>
        <div ref={targetRef} />
      </section>

      {showQuit && (
        <div className="modal-mask" onClick={() => setShowQuit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>ほんとうに やめる？</h2>
            <p className="muted">
              いまの がんばりは きえちゃうよ
            </p>
            <div className="row" style={{ marginTop: 16, gap: 10 }}>
              <button
                className="btn btn--ghost btn--block"
                onClick={() => setShowQuit(false)}
              >
                つづける
              </button>
              <button
                className="btn btn--block"
                onClick={() => {
                  // dispose() がプラグイン側で ctx.abort("user") を呼ぶ。
                  // abort callback の navigate("/") で戻るため、ここでは
                  // 二重 navigate しない。ただし dispose が失敗するケースに
                  // 備えて保険として navigate も呼ぶ (idempotent)。
                  try {
                    handleRef.current?.dispose();
                  } catch {
                    // ignore
                  }
                  navigate("/", { replace: true });
                }}
              >
                やめる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
