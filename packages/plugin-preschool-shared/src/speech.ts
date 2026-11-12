// 読み上げ（Web Speech API）。3 歳児は字が読めないので、問いかけと
// ほめ言葉は声で伝える。端末に日本語音声が無い／API が無い環境では
// 黙って何もしない（学習は成立する）。
//
// iOS Safari などは「ユーザ操作をきっかけにした発話」しか鳴らないことがある。
// 最初の 1 問は鳴らないかもしれないが、問いかけ横の 🔊 ボタン（ユーザ操作）で
// いつでも聞き直せるようにしている。

// 端末やブラウザによって日本語音声の品質は違う。音声名に「Natural」等が
// 明示されているものを優先し、なければ使える日本語音声にフォールバックする。
// 特定の高品質音声が必ず存在するわけではないので、音源ファイルや通信は不要。
function voicePreference(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (/natural|neural|premium|enhanced|high.quality|高品質/.test(name)) {
    score += 100;
  }
  if (/siri|nanami|masaru|kyoko|o-ren|hattori|google 日本語|google japanese/.test(name)) {
    score += 30;
  }
  if (voice.lang.toLowerCase() === "ja-jp") score += 10;
  if (voice.localService) score += 2;
  return score;
}

function pickVoice(): SpeechSynthesisVoice | null {
  try {
    // iOS などは音声一覧を非同期で読み込むため、以前選んだ音声を固定せず、
    // 再生のたびに候補を再評価する（「もういちど」で改善することもある）。
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const ja = voices.filter((v) => v.lang?.toLowerCase().startsWith("ja"));
    if (ja.length === 0) return null;
    return ja.reduce((best, voice) =>
      voicePreference(voice) > voicePreference(best) ? voice : best
    );
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
