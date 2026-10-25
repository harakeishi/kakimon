// タップ式クイズのプラグインを「マニフェスト + 出題関数」だけで定義する薄い層。

import type {
  ContentPlugin,
  PluginManifest,
  SessionConfig,
  SessionContext,
  SessionHandle,
} from "@kakimon/plugin-api";
import {
  createTapQuizSession,
  type TapQuestion,
  type TapQuizOptions,
} from "@kakimon/plugin-preschool-shared";

export type QuestionBuilder = (difficulty: string, count: number) => TapQuestion[];

const DEFAULT_COUNT = 5;
const MAX_COUNT = 20;

export function defineTapQuizPlugin(
  manifest: PluginManifest,
  build: QuestionBuilder,
  extra: Partial<Pick<TapQuizOptions, "columns" | "choiceSize">> = {}
): ContentPlugin {
  function startSession(
    target: HTMLElement,
    config: SessionConfig,
    ctx: SessionContext
  ): SessionHandle {
    const total = Math.max(
      1,
      Math.min(MAX_COUNT, Math.floor(config.questionCount ?? DEFAULT_COUNT))
    );
    const sound = config.options?.sound !== false;
    const questions = build(config.difficulty, total);
    return createTapQuizSession(target, ctx, {
      questions,
      sound,
      logPrefix: `[${manifest.id}]`,
      ...extra,
    });
  }
  return { manifest, startSession };
}

/** 3 歳向けプラグイン共通のマニフェスト既定値。 */
export const KIDS_DEFAULTS: Pick<
  PluginManifest,
  "version" | "ageHint" | "kidsMode" | "questionCounts"
> = {
  version: "0.1.0",
  ageHint: { min: 3, max: 5 },
  kidsMode: true,
  questionCounts: [3, 5, 8],
};
