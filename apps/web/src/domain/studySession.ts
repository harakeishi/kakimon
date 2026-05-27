import type { QuestionOutcome } from "@kakimon/plugin-api";

export interface StudySession {
  id: string;
  pluginId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  difficulty: string;
  overallScore: number;
  outcomes: QuestionOutcome[];
  rewards: {
    coins: number;
    exp: number;
  };
}
