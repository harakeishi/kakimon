// 正解・誤答の「固定 2 音」。Khan Academy Kids の「ピン」「ボン」のように、
// 言葉が分からなくても音だけで結果が伝わるようにする。
// 音源ファイルは持たず WebAudio で短い音を合成する。AudioContext は
// ユーザ操作のあとでしか鳴らない端末があるので、最初のタップ時に遅延生成する。

let ctx: AudioContext | null | undefined;

function audioCtx(): AudioContext | null {
  if (ctx !== undefined) return ctx;
  try {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    ctx = Ctor ? new Ctor() : null;
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(
  ac: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  type: OscillatorType,
  gain: number
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(gain, startAt + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

/** 「ピン♪」: 明るい 2 音。 */
export function playCorrect(): void {
  const ac = audioCtx();
  if (!ac) return;
  try {
    if (ac.state === "suspended") void ac.resume();
    const t = ac.currentTime;
    tone(ac, 880, t, 0.12, "sine", 0.25);
    tone(ac, 1318, t + 0.1, 0.22, "sine", 0.25);
  } catch {
    // 効果音は演出。失敗しても続ける。
  }
}

/** 「ボン」: 低く短く、きつくない音。 */
export function playWrong(): void {
  const ac = audioCtx();
  if (!ac) return;
  try {
    if (ac.state === "suspended") void ac.resume();
    const t = ac.currentTime;
    tone(ac, 220, t, 0.18, "triangle", 0.18);
  } catch {
    // ignore
  }
}

/** セッション完了のファンファーレ（短い上昇 3 音）。 */
export function playFanfare(): void {
  const ac = audioCtx();
  if (!ac) return;
  try {
    if (ac.state === "suspended") void ac.resume();
    const t = ac.currentTime;
    tone(ac, 659, t, 0.15, "sine", 0.22);
    tone(ac, 784, t + 0.14, 0.15, "sine", 0.22);
    tone(ac, 1046, t + 0.28, 0.35, "sine", 0.25);
  } catch {
    // ignore
  }
}
