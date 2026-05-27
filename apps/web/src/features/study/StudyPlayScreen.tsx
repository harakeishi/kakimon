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

export function StudyPlayScreen() {
  const { pluginId = "" } = useParams();
  const navigate = useNavigate();
  const plugin = useMemo(
    () => findPlugin(decodeURIComponent(pluginId)),
    [pluginId]
  );
  const applyReward = useGameStore((s) => s.applyReward);

  const [difficulty, setDifficulty] = useState<DifficultyOption | null>(null);
  const [progressLabel, setProgressLabel] = useState("");
  const targetRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<{ dispose(): void } | null>(null);
  const settledRef = useRef(false);
  const [showQuit, setShowQuit] = useState(false);

  useEffect(() => {
    if (!plugin) return;
    if (!difficulty) return;
    const target = targetRef.current;
    if (!target) return;
    settledRef.current = false;

    const ctx: SessionContext = {
      complete: (result) => {
        if (settledRef.current) return;
        settledRef.current = true;
        void finalizeSession(result);
      },
      abort: (reason) => {
        if (settledRef.current) return;
        settledRef.current = true;
        if (reason === "user") {
          navigate("/", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      },
      reportProgress: (p) => {
        setProgressLabel(p.label ?? "");
      },
      locale: "ja",
    };

    const handle = plugin.startSession(
      target,
      { difficulty: difficulty.key, questionCount: 5 },
      ctx
    );
    handleRef.current = handle;

    return () => {
      try {
        handle.dispose();
      } catch {
        // ignore
      }
      handleRef.current = null;
    };
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

  async function finalizeSession(result: SessionResult) {
    if (!difficulty) return;
    const reward = calculateReward(result, {
      difficultyLevel: difficulty.level,
    });
    const sessionRecord = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      pluginId: plugin!.manifest.id,
      startedAt: new Date(Date.now() - result.durationMs).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: result.durationMs,
      difficulty: difficulty.key,
      overallScore: result.overallScore,
      outcomes: result.outcomes,
      rewards: reward,
    };
    const applied = await applyReward(sessionRecord);
    navigate("/study/result", {
      replace: true,
      state: {
        pluginId: plugin!.manifest.id,
        pluginName: plugin!.manifest.name,
        reward: applied,
        score: result.overallScore,
        questionCount: result.outcomes.length,
      },
    });
  }

  if (!difficulty) {
    return (
      <>
        <header className="row">
          <button className="btn btn--ghost" onClick={() => navigate(-1)}>
            ← もどる
          </button>
          <h1 style={{ margin: 0, marginLeft: 12 }}>{plugin.manifest.name}</h1>
        </header>
        <p className="muted" style={{ margin: "0 4px" }}>
          むずかしさを えらんでね
        </p>
        <div className="list">
          {plugin.manifest.difficulties.map((d) => (
            <button
              key={d.key}
              className="plugin-card"
              onClick={() => setDifficulty(d)}
            >
              <div className="icon" aria-hidden>
                ⭐️
              </div>
              <div>
                <strong>{d.label}</strong>
                <div className="desc">レベル {d.level}</div>
              </div>
              <div>▶</div>
            </button>
          ))}
        </div>
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
