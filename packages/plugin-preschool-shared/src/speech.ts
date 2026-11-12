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

// 書き取り問題向け。品質名だけで選ぶとオンラインの音声を優先してしまい、
// PWA のオフライン利用を壊す可能性があるため、端末内の日本語音声を先に選ぶ。
// 高品質のローカル音声が見つからなければ、利用可能な候補にフォールバック。
// 端末ごとに音声一覧の読み込みが遅れるので毎回選び直す。
function pickNaturalVoice(): SpeechSynthesisVoice | null {
  try {
    const japanese = window.speechSynthesis.getVoices().filter(
      (voice) => voice.lang.toLowerCase().startsWith("ja")
    );
    if (japanese.length === 0) return pickVoice();
    const local = japanese.filter((voice) => voice.localService);
    const candidates = local.length > 0 ? local : japanese;

    function quality(voice: SpeechSynthesisVoice): number {
      const name = voice.name.toLowerCase();
      let score = 0;
      if (/natural|neural|premium|enhanced|high.quality|高品質/.test(name)) {
        score += 100;
      }
      if (/siri|nanami|masaru|kyoko|o-ren|hattori|google 日本語|google japanese/.test(name)) {
        score += 30;
      }
      if (voice.lang.toLowerCase() === "ja-jp") score += 10;
      return score;
    }

    return candidates.reduce((best, voice) =>
      quality(voice) > quality(best) ? voice : best
    );
  } catch {
    return pickVoice();
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
  /** 自然な声の候補を優先。書き取り専用（既存のクイズには影響しない）。 */
  naturalVoice?: boolean;
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
    const voice = opts.naturalVoice ? pickNaturalVoice() : pickVoice();
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
