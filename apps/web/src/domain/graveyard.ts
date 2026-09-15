// 図鑑（おもいで）に残す、これまでのモンスターの記録。
// docs/04-domain-model.md 4.4「新しいタマゴで再スタート」に対応。
// モンスターは死なないので、ここに載るのはユーザが明示的に
// 「新しいタマゴで はじめる」を選んだ子だけ。
// 名前・誕生日・到達ステージ・累計学習セッション数を保持する。

import type { Monster, MonsterStage } from "./monster";

export interface GraveRecord {
  id: string;            // Monster.id をそのまま使う
  name: string;
  species: string;
  bornAt: string;
  diedAt: string;        // ISO（図鑑に移した日時。歴史的な名前のまま）
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
