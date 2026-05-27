import { useLocation, useNavigate } from "react-router-dom";

interface ResultState {
  pluginId: string;
  pluginName: string;
  reward: {
    coins: number;
    exp: number;
    leveledUp: boolean;
    wasDeceased: boolean;
  };
  score: number;
  questionCount: number;
}

export function StudyResultScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as ResultState | undefined;

  if (!state) {
    return (
      <>
        <div className="card center">けっか がないみたい</div>
        <button className="btn btn--block" onClick={() => navigate("/")}>
          ホームに もどる
        </button>
      </>
    );
  }

  const scorePercent = Math.round(state.score * 100);
  const cheer =
    scorePercent >= 80
      ? "すごい！"
      : scorePercent >= 50
        ? "がんばったね！"
        : "つぎは できるよ！";

  return (
    <>
      <section className="card center">
        <div className="big-emoji">{state.reward.wasDeceased ? "🌸" : "🎉"}</div>
        <h1 style={{ margin: 0 }}>{cheer}</h1>
        <p className="muted">{state.pluginName} {state.questionCount}もん</p>

        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontSize: "1.1rem" }}>できばえ</div>
          <div className="coin-pop">{scorePercent}%</div>
        </div>

        {state.reward.wasDeceased ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontSize: "1.1rem" }}>
              モンスターは おやすみちゅう
            </div>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              いまは ごほうびを もらえないけど、
              <br />
              べんきょうの きろくは ちゃんと のこっているよ。
            </p>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontSize: "1.1rem" }}>もらえたよ</div>
            <div className="coin-pop">+{state.reward.coins} コイン</div>
            <div className="muted">けいけんち +{state.reward.exp}</div>
            {state.reward.leveledUp && (
              <div
                style={{ marginTop: 10, color: "var(--good)", fontWeight: 700 }}
              >
                ⭐️ レベルアップ！
              </div>
            )}
          </div>
        )}
      </section>

      <button
        className="btn btn--big btn--block btn--success"
        onClick={() => navigate("/", { replace: true })}
      >
        ホームに もどる
      </button>
      <button
        className="btn btn--block btn--ghost"
        onClick={() => navigate(`/study/${encodeURIComponent(state.pluginId)}`, { replace: true })}
      >
        もういちど やる
      </button>
    </>
  );
}
