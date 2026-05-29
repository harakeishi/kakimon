import Dexie from "dexie";
import type { Table } from "dexie";
import type { Monster } from "../../domain/monster";
import type { Wallet } from "../../domain/wallet";
import type { InventoryEntry } from "../../domain/inventory";
import type { StudySession } from "../../domain/studySession";
import type { GraveRecord } from "../../domain/graveyard";

interface WalletRow extends Wallet {
  id: "singleton";
}

interface SingletonRow<T> {
  id: "singleton";
  value: T;
}

export class KakimonDB extends Dexie {
  monster!: Table<Monster, string>;
  wallet!: Table<WalletRow, string>;
  inventory!: Table<InventoryEntry, [string, "food" | "equipment"]>;
  studySession!: Table<StudySession, string>;
  settings!: Table<SingletonRow<unknown>, string>;
  graveyard!: Table<GraveRecord, string>;

  constructor() {
    super("kakimon");
    // ┌─────────────────────────────────────────────────────────────────┐
    // │ スキーマを変更する場合は必ず新しい version(N) を追記すること。      │
    // │ 既存ユーザの IndexedDB はバージョンを保持しているため、in-place    │
    // │ 編集は VersionError で起動が止まる。                              │
    // │                                                                  │
    // │ 例:                                                              │
    // │   this.version(2).stores({ inventory: "[itemId+kind], kind, qty" │
    // │   }).upgrade(tx => { ... });                                     │
    // │                                                                  │
    // │ 詳細は docs/04-domain-model.md 4.5 節 + ADR 参照。                │
    // └─────────────────────────────────────────────────────────────────┘
    this.version(1).stores({
      monster: "id, stage, lifeState",
      wallet: "id",
      inventory: "[itemId+kind], kind",
      studySession: "id, pluginId, completedAt",
      settings: "id",
    });
    // v2: 図鑑（お墓）テーブル追加。死亡時に転記する。
    this.version(2)
      .stores({
        monster: "id, stage, lifeState",
        wallet: "id",
        inventory: "[itemId+kind], kind",
        studySession: "id, pluginId, completedAt",
        settings: "id",
        graveyard: "id, diedAt",
      })
      .upgrade(async (tx) => {
        // v1 時点の Monster には totalSessions が無いので 0 で埋める。
        // 既存セッション数をカウントして合算する（履歴持ち越し設計に合わせる）。
        const sessionCount = await tx.table("studySession").count();
        await tx
          .table("monster")
          .toCollection()
          .modify((row: Monster) => {
            if (typeof row.totalSessions !== "number") {
              row.totalSessions = sessionCount;
            }
          });
      });
  }
}

export const db = new KakimonDB();

export type { WalletRow };
