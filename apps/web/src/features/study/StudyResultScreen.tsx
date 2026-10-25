import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { playFanfare, speak } from "@kakimon/plugin-preschool-shared";
import { EmojiIcon } from "../../components/EmojiIcon";
import { MonsterSprite } from "../../components/MonsterSprite";
import { useGameStore } from "../../state/gameStore";
import { loadSoundEnabled } from "../../infra/sound";

interface ResultState {
  pluginId: string;
  pluginName: string;
  reward: {
    coins: number;
    exp: number;
    leveledUp: boolean;
    didHatch: boolean;
  };
  score: number;
  questionCount: number;
}

/**
 * できばえ → ほしの数。3 歳児に % は伝わらないので 1〜3 個の ほしで見せる。
 * 1 個は必ずつく（「がんばった」は必ず認める）。
 */
function starsFor(score: number): number {
  if (score >= 0.8) return 3;
  if (score >= 0.5) return 2;
  return 1;
}

export function StudyResultScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const monster = useGameStore((s) => s.monster);
  const state = location.state as ResultState | undefined;

  const stars = state ? starsFor(state.score) : 0;
  const cheer =
    stars === 3 ? "すごい！" : stars === 2 ? "がんばったね！" : "よく できました！";

  // ファンファーレと一言。声で結果が分かるようにする（字が読めなくてもよい）。
  useEffect(() => {
    if (!state || !loadSoundEnabled()) return;
    playFanfare();
    const line = state.reward.didHatch
      ? "タマゴが かえった！ あたらしい なかまが うまれたよ！"
      : `${cheer} コインを ${state.reward.coins}こ もらったよ！`;
    const id = window.setTimeout(() => speak(line), 500);
    return () => window.clearTimeout(id);
    // state は遷移時に 1 回だけ変わる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <>
      <section className="card center">
        {state.reward.didHatch ? (
          <EmojiIcon emoji="🐣" size={96} alt="" />
        ) : monster ? (
          <span className="result-monster">
            <MonsterSprite monster={monster} size={120} />
          </span>
        ) : (
          <EmojiIcon emoji="🎉" size={72} alt="" />
        )}
        <h1 style={{ margin: "6px 0 0" }}>
          {state.reward.didHatch ? "タマゴが かえった！" : cheer}
        </h1>
        <p className="muted" style={{ margin: "2px 0 0" }}>
          {state.pluginName} {state.questionCount}もん
        </p>

        <div className="result-stars" aria-label={`ほし ${stars}こ`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`result-star${i < stars ? " is-on" : ""}`}
              style={{ animationDelay: `${0.15 * i + 0.2}s` }}
            >
              ⭐
            </span>
          ))}
        </div>

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

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontSize: "1.1rem" }}>もらえたよ</div>
          <div className="coin-pop coin-fly" style={{ justifyContent: "center" }}>
            <EmojiIcon emoji="💰" size={32} alt="" />
            <span>+{state.reward.coins}</span>
          </div>
          <div className="muted">けいけんち +{state.reward.exp}</div>
          {state.reward.leveledUp && (
            <div
              style={{ marginTop: 10, color: "var(--good)", fontWeight: 700 }}
              className="row"
            >
              <EmojiIcon emoji="⭐" size={20} alt="" />
              <span style={{ marginLeft: 4 }}>レベルアップ！</span>
            </div>
          )}
        </div>
      </section>

      {/* 「もういちど」と「おしまい」を同じ大きさで並べ、子ども自身に区切りを選ばせる */}
      <div className="row" style={{ gap: 10 }}>
        <button
          className="btn btn--big btn--block btn--secondary action-btn"
          onClick={() =>
            navigate(`/study/${encodeURIComponent(state.pluginId)}`, {
              replace: true,
            })
          }
        >
          <EmojiIcon emoji="🔁" size={26} alt="" />
          <span>もういちど</span>
        </button>
        <button
          className="btn btn--big btn--block btn--success action-btn"
          onClick={() => navigate("/", { replace: true })}
        >
          <EmojiIcon emoji="🏠" size={26} alt="" />
          <span>おしまい</span>
        </button>
      </div>
    </>
  );
}
