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
