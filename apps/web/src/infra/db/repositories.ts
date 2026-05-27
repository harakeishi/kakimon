import { db } from "./dexie";
import type { Monster } from "../../domain/monster";
import { createInitialMonster } from "../../domain/monster";
import type { Wallet } from "../../domain/wallet";
import { createInitialWallet } from "../../domain/wallet";
import type { Inventory, InventoryEntry } from "../../domain/inventory";
import { createInitialInventory } from "../../domain/inventory";
import type { StudySession } from "../../domain/studySession";

const MAX_SESSIONS = 1000;

// MVP では Monster は端末上に 1 体のみ。複数行の漏れ込みを誘発する経路
// (StrictMode の二重 init, 旧バージョンからの移行 etc) があるため、
// 「最新の lastTickAt を持つ 1 行に正規化する」ロジックを load 内で実装する。
function lastTickMs(m: Monster): number {
  const n = Date.parse(m.lastTickAt);
  // 壊れた lastTickAt は最古 (= 削除候補) として扱う。
  // Date.parse の NaN を comparator で減算するとソート結果が処理系依存になり、
  // 「壊れた行を残して正規の行を消す」事故が起きる。
  return Number.isFinite(n) ? n : -Infinity;
}

export const monsterRepo = {
  async load(): Promise<Monster | null> {
    return db.transaction("rw", db.monster, async () => {
      const rows = await db.monster.toArray();
      if (rows.length === 0) return null;
      if (rows.length === 1) return rows[0]!;
      // 最も lastTickAt が新しいものを採用し、残りは削除する。
      rows.sort((a, b) => lastTickMs(b) - lastTickMs(a));
      const keep = rows[0]!;
      const remove = rows.slice(1).map((r) => r.id);
      await db.monster.bulkDelete(remove);
      return keep;
    });
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
  /**
   * 差分更新。clear+bulkPut だと別タブや並行 save が直前に書いた行を消す
   * (lost-update) ため、ターゲットの key だけ touch する形で reconcile する。
   */
  async save(inv: Inventory): Promise<void> {
    await db.transaction("rw", db.inventory, async () => {
      const existingKeys = (await db.inventory
        .toCollection()
        .primaryKeys()) as [string, "food" | "equipment"][];
      const nextKeyset = new Set<string>(
        inv.entries.map((e) => `${e.itemId}::${e.kind}`)
      );
      const toRemove = existingKeys.filter(
        ([itemId, kind]) => !nextKeyset.has(`${itemId}::${kind}`)
      );
      if (toRemove.length > 0) {
        await db.inventory.bulkDelete(toRemove);
      }
      if (inv.entries.length > 0) {
        await db.inventory.bulkPut(inv.entries as InventoryEntry[]);
      }
    });
  },
};

export const studySessionRepo = {
  /**
   * 挿入とトリミングを 1 transaction でまとめる。並行 append でも
   * 「2 回トリム → 多めに削除」が起きないようにする。
   */
  async append(s: StudySession): Promise<void> {
    await db.transaction("rw", db.studySession, async () => {
      await db.studySession.put(s);
      const count = await db.studySession.count();
      if (count > MAX_SESSIONS) {
        const excess = count - MAX_SESSIONS;
        const oldest = await db.studySession
          .orderBy("completedAt")
          .limit(excess)
          .primaryKeys();
        if (oldest.length > 0) {
          await db.studySession.bulkDelete(oldest);
        }
      }
    });
  },
  async recent(limit = 20): Promise<StudySession[]> {
    return db.studySession
      .orderBy("completedAt")
      .reverse()
      .limit(limit)
      .toArray();
  },
  async clear(): Promise<void> {
    await db.studySession.clear();
  },
};

/**
 * 初回起動時に空のテーブルを埋める。並行呼び出し (StrictMode の二重 init) は
 * gameStore 側の guard で防いでいるが、ここも transaction で読みと初期化を
 * 直列化しておく。
 */
export async function bootstrapIfEmpty(): Promise<{
  monster: Monster;
  wallet: Wallet;
  inventory: Inventory;
}> {
  const monster = await db.transaction(
    "rw",
    db.monster,
    async (): Promise<Monster> => {
      const existing = await monsterRepo.load();
      if (existing) return existing;
      const created = createInitialMonster();
      await db.monster.put(created);
      return created;
    }
  );
  const wallet = await db.transaction(
    "rw",
    db.wallet,
    async (): Promise<Wallet> => {
      const row = await db.wallet.get("singleton");
      if (row) {
        const { id: _id, ...rest } = row;
        void _id;
        return rest;
      }
      const fresh = createInitialWallet();
      await db.wallet.put({ id: "singleton", ...fresh });
      return fresh;
    }
  );
  const inventory = await inventoryRepo.load();
  return { monster, wallet, inventory };
}
