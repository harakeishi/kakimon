import { create } from "zustand";
import type { Monster } from "../domain/monster";
import {
  feed as feedMonster,
  gainExp,
  pet as petMonster,
  tickMonster,
} from "../domain/monster";
import type { Wallet } from "../domain/wallet";
import { earn, spend } from "../domain/wallet";
import type { Inventory } from "../domain/inventory";
import { addItem, countOf, removeItem } from "../domain/inventory";
import type { StudySession } from "../domain/studySession";
import {
  bootstrapIfEmpty,
  inventoryRepo,
  monsterRepo,
  studySessionRepo,
  walletRepo,
} from "../infra/db/repositories";
import { db } from "../infra/db/dexie";
import { FOODS, findFood } from "../domain/catalog/foods";

interface GameState {
  ready: boolean;
  monster: Monster | null;
  wallet: Wallet;
  inventory: Inventory;
  recentSessions: StudySession[];
  init: () => Promise<void>;
  tick: () => Promise<void>;
  petMonster: () => Promise<void>;
  feedWith: (foodId: string) => Promise<boolean>;
  buyFood: (foodId: string) => Promise<boolean>;
  applyReward: (
    session: StudySession
  ) => Promise<{
    coins: number;
    exp: number;
    leveledUp: boolean;
    wasDeceased: boolean;
  }>;
  /** 「ふりだしに戻る」: 全データをまっさらにする (開発用・保護者画面用) */
  hardReset: () => Promise<void>;
  /**
   * 「新しいタマゴで再スタート」: deceased からの再生。
   * Wallet / Inventory / StudySession 履歴は保持。Monster だけ初期化する。
   * docs/04-domain-model.md 4.4 節「死亡からの再スタート」と一致。
   */
  rebirth: () => Promise<void>;
}

// init() / bootstrap 系の二重起動を防ぐためのプロセス内 promise キャッシュ。
// React StrictMode の二度マウントでも 1 回しか走らないようにする。
let initInflight: Promise<void> | null = null;

export const useGameStore = create<GameState>((set, get) => ({
  ready: false,
  monster: null,
  wallet: { coins: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
  inventory: { entries: [] },
  recentSessions: [],

  async init() {
    if (get().ready) return;
    if (initInflight) return initInflight;
    initInflight = (async () => {
      const { monster, wallet, inventory } = await bootstrapIfEmpty();
      const ticked = tickMonster(monster, Date.now());
      if (ticked !== monster) await monsterRepo.save(ticked);
      const recent = await studySessionRepo.recent(20);
      set({
        ready: true,
        monster: ticked,
        wallet,
        inventory,
        recentSessions: recent,
      });
    })();
    try {
      await initInflight;
    } finally {
      initInflight = null;
    }
  },

  async tick() {
    const m = get().monster;
    if (!m) return;
    const ticked = tickMonster(m, Date.now());
    if (ticked !== m) {
      await monsterRepo.save(ticked);
      set({ monster: ticked });
    }
  },

  async petMonster() {
    const m = get().monster;
    if (!m) return;
    if (m.lifeState === "deceased") return; // 触れない
    const next = petMonster(m);
    if (next === m) return;
    await monsterRepo.save(next);
    set({ monster: next });
  },

  async feedWith(foodId) {
    const { monster, inventory } = get();
    if (!monster) return false;
    // 死んだモンスターには餌をあげても効果がない。在庫だけ消費する誤動作を防ぐ。
    if (monster.lifeState === "deceased") return false;
    if (countOf(inventory, foodId, "food") <= 0) return false;
    const food = findFood(foodId);
    if (!food) return false;
    const removed = removeItem(inventory, foodId, "food", 1);
    if (!removed) return false;
    const fed = feedMonster(monster, food.effects);
    // 別テーブル間 (Monster / Inventory) の atomicity は IndexedDB の単一
    // transaction で実現できる (Dexie の multi-table tx)。
    try {
      await db.transaction("rw", db.monster, db.inventory, async () => {
        await monsterRepo.save(fed);
        await inventoryRepo.save(removed);
      });
    } catch (e) {
      console.error("[gameStore.feedWith] transaction failed:", e);
      return false;
    }
    set({ monster: fed, inventory: removed });
    return true;
  },

  async buyFood(foodId) {
    const food = findFood(foodId);
    if (!food) return false;
    const { wallet, inventory } = get();
    const spent = spend(wallet, food.price);
    if (!spent) return false;
    const added = addItem(inventory, foodId, "food", 1);
    try {
      await db.transaction("rw", db.wallet, db.inventory, async () => {
        await walletRepo.save(spent);
        await inventoryRepo.save(added);
      });
    } catch (e) {
      console.error("[gameStore.buyFood] transaction failed:", e);
      return false;
    }
    set({ wallet: spent, inventory: added });
    return true;
  },

  async applyReward(session) {
    const { wallet, monster } = get();
    // 死んだモンスターはコインも経験値ももらえない (設計の死亡仕様に揃える)。
    // 学習履歴は記録する (保護者画面で見えるよう)。
    const isDeceased = !!monster && monster.lifeState === "deceased";
    const effectiveSession: StudySession = isDeceased
      ? { ...session, rewards: { coins: 0, exp: 0 } }
      : session;

    const nextWallet = earn(wallet, effectiveSession.rewards.coins);
    let leveledUp = false;
    let nextMonster = monster;
    if (monster && !isDeceased) {
      const before = monster.level;
      nextMonster = gainExp(monster, effectiveSession.rewards.exp);
      leveledUp = nextMonster.level > before;
    }
    // 3 テーブルにまたがる atomic 書き込み。途中で失敗したら全てロールバックする。
    await db.transaction(
      "rw",
      db.monster,
      db.wallet,
      db.studySession,
      async () => {
        if (nextMonster) await monsterRepo.save(nextMonster);
        await walletRepo.save(nextWallet);
        await studySessionRepo.append(effectiveSession);
      }
    );
    const recent = await studySessionRepo.recent(20);
    set({
      wallet: nextWallet,
      monster: nextMonster ?? monster,
      recentSessions: recent,
    });
    return {
      coins: effectiveSession.rewards.coins,
      exp: effectiveSession.rewards.exp,
      leveledUp,
      wasDeceased: isDeceased,
    };
  },

  async hardReset() {
    await monsterRepo.clear();
    await walletRepo.save({ coins: 0, lifetimeEarned: 0, lifetimeSpent: 0 });
    await inventoryRepo.save({ entries: [] });
    await studySessionRepo.clear();
    const fresh = await bootstrapIfEmpty();
    set({
      monster: fresh.monster,
      wallet: fresh.wallet,
      inventory: fresh.inventory,
      recentSessions: [],
    });
  },

  async rebirth() {
    // Monster のみクリア。Wallet / Inventory / StudySession は持ち越す。
    await monsterRepo.clear();
    const fresh = await bootstrapIfEmpty();
    // recentSessions は持ち越しなので再読込
    const recent = await studySessionRepo.recent(20);
    set({
      monster: fresh.monster,
      recentSessions: recent,
    });
  },
}));

export { FOODS };
