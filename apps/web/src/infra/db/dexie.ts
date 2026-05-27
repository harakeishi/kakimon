import Dexie from "dexie";
import type { Table } from "dexie";
import type { Monster } from "../../domain/monster";
import type { Wallet } from "../../domain/wallet";
import type { InventoryEntry } from "../../domain/inventory";
import type { StudySession } from "../../domain/studySession";

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
  }
}

export const db = new KakimonDB();

export type { WalletRow };
