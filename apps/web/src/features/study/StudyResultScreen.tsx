import { useLocation, useNavigate } from "react-router-dom";
import { EmojiIcon } from "../../components/EmojiIcon";

interface ResultState {
  pluginId: string;
  pluginName: string;
  reward: {
    coins: number;
    exp: number;
    leveledUp: boolean;
    wasDeceased: boolean;
    didHatch: boolean;
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
        <EmojiIcon
          emoji={
            state.reward.wasDeceased
              ? "🌸"
              : state.reward.didHatch
                ? "🐣"
                : "🎉"
          }
          size={72}
          alt=""
        />
        <h1 style={{ margin: 0 }}>
          {state.reward.didHatch ? "タマゴが かえった！" : cheer}
        </h1>
        <p className="muted">{state.pluginName} {state.questionCount}もん</p>

        {state.reward.didHatch && (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontSize: "1.1rem" }}>
              あたらしい なかまが うまれたよ！
            </div>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              ホームに もどって、なまえを つけてあげよう
            </p>
          </div>
        )}

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
            <div
              className="coin-pop row"
              style={{ justifyContent: "center", gap: 6 }}
            >
              <EmojiIcon emoji="💰" size={28} alt="" />
              <span>+{state.reward.coins} コイン</span>
            </div>
            <div className="muted">けいけんち +{state.reward.exp}</div>
            {state.reward.leveledUp && (
              <div
                style={{
                  marginTop: 10,
                  color: "var(--good)",
                  fontWeight: 700,
                }}
                className="row"
              >
                <EmojiIcon emoji="⭐" size={20} alt="" />
                <span style={{ marginLeft: 4 }}>レベルアップ！</span>
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
