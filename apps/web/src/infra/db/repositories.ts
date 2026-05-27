import { db } from "./dexie";
import type { Monster } from "../../domain/monster";
import { createInitialMonster } from "../../domain/monster";
import type { Wallet } from "../../domain/wallet";
import { createInitialWallet } from "../../domain/wallet";
import type { Inventory } from "../../domain/inventory";
import { createInitialInventory } from "../../domain/inventory";
import type { StudySession } from "../../domain/studySession";

const MAX_SESSIONS = 1000;

export const monsterRepo = {
  async load(): Promise<Monster | null> {
    const rows = await db.monster.toArray();
    return rows[0] ?? null;
  },
  async save(m: Monster): Promise<void> {
    await db.monster.put(m);
  },
  async clear(): Promise<void> {
    await db.monster.clear();
  },
};

export const walletRepo = {
  async load(): Promise<Wallet> {
    const row = await db.wallet.get("singleton");
    if (!row) return createInitialWallet();
    const { id: _id, ...wallet } = row;
    void _id;
    return wallet;
  },
  async save(w: Wallet): Promise<void> {
    await db.wallet.put({ id: "singleton", ...w });
  },
};

export const inventoryRepo = {
  async load(): Promise<Inventory> {
    const entries = await db.inventory.toArray();
    return entries.length > 0 ? { entries } : createInitialInventory();
  },
  async save(inv: Inventory): Promise<void> {
    await db.transaction("rw", db.inventory, async () => {
      await db.inventory.clear();
      if (inv.entries.length > 0) {
        await db.inventory.bulkPut(inv.entries);
      }
    });
  },
};

export const studySessionRepo = {
  async append(s: StudySession): Promise<void> {
    await db.studySession.put(s);
    // 古い履歴のトリミング
    const count = await db.studySession.count();
    if (count > MAX_SESSIONS) {
      const excess = count - MAX_SESSIONS;
      const oldest = await db.studySession
        .orderBy("completedAt")
        .limit(excess)
        .primaryKeys();
      await db.studySession.bulkDelete(oldest);
    }
  },
  async recent(limit = 20): Promise<StudySession[]> {
    return db.studySession
      .orderBy("completedAt")
      .reverse()
      .limit(limit)
      .toArray();
  },
};

/**
 * 初回起動時に空のテーブルを埋める。
 */
export async function bootstrapIfEmpty(): Promise<{
  monster: Monster;
  wallet: Wallet;
  inventory: Inventory;
}> {
  let monster = await monsterRepo.load();
  if (!monster) {
    monster = createInitialMonster();
    await monsterRepo.save(monster);
  }
  const wallet = await walletRepo.load();
  // wallet は load 時に必ずオブジェクトが返るが、永続化されていなければ書く
  const walletRow = await db.wallet.get("singleton");
  if (!walletRow) {
    await walletRepo.save(wallet);
  }
  const inventory = await inventoryRepo.load();
  return { monster, wallet, inventory };
}
