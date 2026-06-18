import { useState } from "react";
import { useGameStore } from "../../state/gameStore";
import { EmojiIcon } from "../../components/EmojiIcon";
import { AdminPanel } from "./AdminPanel";

/** 今日の日付を yyyymmdd 形式で返す（ローカルタイム） */
function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * 管理者（保護者）モードの入り口。
 * - 画面右上に控えめなボタンを常設する（子供が気軽に触らない想定）。
 * - 開くと「本日の日付を yyyymmdd で入力」するゲートが出る。
 * - 正しい日付を入れると管理パネル（お金・アイテム・HP・経験値などの操作）が開く。
 */
export function AdminMode() {
  const ready = useGameStore((s) => s.ready);
  const [stage, setStage] = useState<"closed" | "gate" | "panel">("closed");
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  if (!ready) return null;

  function openGate() {
    setInput("");
    setError(false);
    setStage("gate");
  }

  function submitGate(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim() === todayYmd()) {
      setStage("panel");
      setError(false);
    } else {
      setError(true);
    }
  }

  return (
    <>
      <button
        type="button"
        className="admin-fab"
        aria-label="管理者モード"
        title="管理者モード"
        onClick={openGate}
      >
        <EmojiIcon emoji="⚙️" size={22} alt="" />
      </button>

      {stage === "gate" && (
        <div className="modal-mask" onClick={() => setStage("closed")}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <EmojiIcon emoji="🔒" size={56} alt="" />
            <h2>かんりしゃモード</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              ほんじつの ひづけを 8けた（yyyymmdd）で にゅうりょくしてください。
            </p>
            <form onSubmit={submitGate}>
              <input
                className="name-input"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                autoFocus
                placeholder="20260618"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value.replace(/[^0-9]/g, ""));
                  setError(false);
                }}
              />
              {error && (
                <p style={{ color: "var(--bad)", marginTop: 0 }}>
                  ひづけが ちがいます
                </p>
              )}
              <div className="row" style={{ marginTop: 12, gap: 10 }}>
                <button
                  type="button"
                  className="btn btn--ghost btn--block"
                  onClick={() => setStage("closed")}
                >
                  とじる
                </button>
                <button
                  type="submit"
                  className="btn btn--block btn--secondary"
                  disabled={input.length !== 8}
                >
                  はいる
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {stage === "panel" && <AdminPanel onClose={() => setStage("closed")} />}
    </>
  );
}
