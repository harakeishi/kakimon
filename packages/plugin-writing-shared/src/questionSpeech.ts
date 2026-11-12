// 書き取り問題の読み上げを、ひらがな・数字で共通化する。
// 既存の preschool-shared の Web Speech 実装と端末ごとの音声選択を利用する。
import {
  speak,
  speechAvailable,
  stopSpeaking,
} from "@kakimon/plugin-preschool-shared";

// 数字をそのまま TTS に渡すと「1」が「ワン」などになる環境があるので、
// 学習用の日本語の読みを明示する。4 は「よん」、7 は「なな」、9 は「きゅう」。
const ONES = [
  "ぜろ", "いち", "に", "さん", "よん",
  "ご", "ろく", "なな", "はち", "きゅう",
] as const;

export function numberToJapaneseReading(value: string): string {
  if (!/^(0|[1-9]\d{0,2})$/.test(value)) return value;
  const n = Number(value);
  if (n > 100) return value;
  if (n === 100) return "ひゃく";
  if (n < 10) return ONES[n]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const prefix = tens === 1 ? "" : ONES[tens]!;
  return `${prefix}じゅう${ones === 0 ? "" : ONES[ones]!}`;
}

export interface WritingQuestionVoice {
  /** 次の問題が表示された時に読み上げる。自動再生は音声設定に従う。 */
  announce(text: string): void;
  /** 次の問題へ移る前に、前の発話を止める。 */
  stop(): void;
  /** ボタンや発話を破棄する。 */
  destroy(): void;
}

/** 手動での聞き直しは音声 OFF でも許可する（既存の3歳向けクイズと同じ）。 */
export function createWritingQuestionVoice(
  header: HTMLElement,
  autoSpeak: boolean
): WritingQuestionVoice {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "kp-btn kp-btn--ghost";
  button.textContent = "🔊 もういちど";
  button.setAttribute("aria-label", "もんだいを もういちど きく");
  button.style.fontSize = "0.85rem";
  button.style.padding = "8px 12px";
  button.style.minHeight = "44px";
  button.disabled = !speechAvailable();
  if (button.disabled) {
    button.title = "この たんまつでは よみあげが つかえません";
  }
  header.appendChild(button);

  let currentText = "";
  let destroyed = false;

  function say(): void {
    if (destroyed || !currentText) return;
    // 幼児向けに少しゆっくり、声の高さを変えずに発話する。
    // 短い1文字・数字でも、文末として自然に区切れるよう句点を付ける。
    // 実際の速度・声質は端末の日本語音声エンジンによって多少異なる。
    speak(`${currentText}。`, { rate: 0.84, pitch: 1.0 });
  }

  button.addEventListener("click", say);

  return {
    announce(text) {
      if (destroyed) return;
      stopSpeaking();
      currentText = text;
      if (autoSpeak) say();
    },
    stop() {
      if (destroyed) return;
      stopSpeaking();
      currentText = "";
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopSpeaking();
      currentText = "";
      button.removeEventListener("click", say);
      button.remove();
    },
  };
}
