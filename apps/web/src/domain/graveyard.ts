// 図鑑（お墓）に残す死亡モンスターの記録。
// docs/04-domain-model.md 4.4「死亡からの再スタート」に対応。
// 名前・誕生日・到達ステージ・累計学習セッション数を保持する。

import type { Monster, MonsterStage } from "./monster";

export interface GraveRecord {
  id: string;            // Monster.id をそのまま使う
  name: string;
  species: string;
  bornAt: string;
  diedAt: string;        // ISO
  reachedStage: MonsterStage;
  reachedLevel: number;
  totalSessions: number;
}

export function buildGraveRecord(m: Monster, diedAtMs: number = Date.now()): GraveRecord {
  return {
    id: m.id,
    name: m.name || "ななし",
    species: m.species,
    bornAt: m.bornAt,
    diedAt: new Date(diedAtMs).toISOString(),
    reachedStage: m.stage,
    reachedLevel: m.level,
    totalSessions: m.totalSessions ?? 0,
  };
}
