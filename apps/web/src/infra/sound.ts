// 音（読み上げ・効果音）の ON/OFF。保護者が切れるように localStorage に残す。
// 既定は ON（3 歳児は字が読めないので、声が主役）。

const SOUND_STORAGE_KEY = "kakimon.sound";

export function loadSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function saveSoundEnabled(value: boolean): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // localStorage が使えない環境(プライベートモード等)でも続行する
  }
}
