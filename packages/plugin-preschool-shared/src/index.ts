// 3 歳児向けプラグイン群（@kakimon/plugin-preschool など）の共通コード。
// plugin-api / plugin-writing-shared と同じ source-only パッケージ。

export {
  baseUrl,
  el,
  emojiCode,
  emojiEl,
  pickCycle,
  pickOne,
  shuffled,
  withDistractors,
} from "./dom";
export { playCorrect, playFanfare, playWrong } from "./audio";
export { speak, speechAvailable, stopSpeaking, type SpeakOptions } from "./speech";
export {
  createTapQuizSession,
  type TapChoice,
  type TapQuestion,
  type TapQuizOptions,
} from "./tapQuiz";
