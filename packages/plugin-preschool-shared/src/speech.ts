// 読み上げ（Web Speech API）。3 歳児は字が読めないので、問いかけと
// ほめ言葉は声で伝える。端末に日本語音声が無い／API が無い環境では
// 黙って何もしない（学習は成立する）。
//
// iOS Safari などは「ユーザ操作をきっかけにした発話」しか鳴らないことがある。
// 最初の 1 問は鳴らないかもしれないが、問いかけ横の 🔊 ボタン（ユーザ操作）で
// いつでも聞き直せるようにしている。

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  try {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const ja = voices.filter((v) => v.lang?.toLowerCase().startsWith("ja"));
    // 子供向けに自然な声を優先（端末依存。無ければ最初の日本語音声）。
    const preferred =
      ja.find((v) => /kyoko|o-ren|hattori|日本語|google 日本語/i.test(v.name)) ??
      ja[0] ??
      null;
    // 音声一覧が非同期で後から揃う端末がある（voiceschanged）。日本語音声が
    // 見つかったときだけキャッシュし、見つからないうちは毎回引き直す
    // （getVoices は軽い）。
    if (preferred) cachedVoice = preferred;
    return preferred;
  } catch {
    return null;
  }
}

export function speechAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export interface SpeakOptions {
  /** 既存の発話を止めてから話す（既定 true） */
  interrupt?: boolean;
  rate?: number;
  pitch?: number;
}

/** テキストを日本語で読み上げる。失敗しても例外は投げない。 */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!text || !speechAvailable()) return;
  try {
    const synth = window.speechSynthesis;
    if (opts.interrupt !== false) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = opts.rate ?? 0.95;
    u.pitch = opts.pitch ?? 1.15;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    synth.speak(u);
  } catch {
    // 読み上げは演出。失敗しても学習は続ける。
  }
}

export function stopSpeaking(): void {
  if (!speechAvailable()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}
