import { useState } from "react";
import { EmojiIcon } from "../../components/EmojiIcon";

const SUGGESTIONS = ["もんちゃん", "ぴよた", "ぽよ", "むに", "ちび", "りる"];

const MAX_LEN = 8;

interface NameMonsterModalProps {
  onSubmit: (name: string) => Promise<void>;
}

/**
 * 孵化直後に出る命名モーダル。閉じる手段を意図的に提供しない。
 * 名前は 1〜MAX_LEN 文字。空白だけは弾く。
 */
export function NameMonsterModal({ onSubmit }: NameMonsterModalProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  async function submit(value: string) {
    if (!value.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(value.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-mask">
      <div className="modal">
        <EmojiIcon emoji="🐣" size={72} alt="" />
        <h2 style={{ margin: "8px 0 4px" }}>うまれた！</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          なまえを つけてあげよう
        </p>
        <input
          autoFocus
          className="name-input"
          type="text"
          inputMode="text"
          maxLength={MAX_LEN}
          value={name}
          placeholder="なまえ"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) void submit(name);
          }}
          aria-label="モンスターの なまえ"
        />
        <div className="suggest-row">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="suggest-chip"
              onClick={() => setName(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          className="btn btn--big btn--block btn--success"
          disabled={!canSubmit}
          onClick={() => void submit(name)}
        >
          けってい
        </button>
      </div>
    </div>
  );
}
