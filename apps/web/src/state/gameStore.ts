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
  ) => Promise<{ coins: number; exp: number; leveledUp: boolean }>;
  resetAll: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  ready: false,
  monster: null,
  wallet: { coins: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
  inventory: { entries: [] },
  recentSessions: [],

  async init() {
    const { monster, wallet, inventory } = await bootstrapIfEmpty();
    // 起動時に tick を回す
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
    const next = petMonster(m);
    await monsterRepo.save(next);
    set({ monster: next });
  },

  async feedWith(foodId) {
    const { monster, inventory } = get();
    if (!monster) return false;
    if (countOf(inventory, foodId, "food") <= 0) return false;
    const food = findFood(foodId);
    if (!food) return false;
    const removed = removeItem(inventory, foodId, "food", 1);
    if (!removed) return false;
    const fed = feedMonster(monster, food.effects);
    await Promise.all([
      inventoryRepo.save(removed),
      monsterRepo.save(fed),
    ]);
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
    await Promise.all([walletRepo.save(spent), inventoryRepo.save(added)]);
    set({ wallet: spent, inventory: added });
    return true;
  },

  async applyReward(session) {
    const { wallet, monster } = get();
    const nextWallet = earn(wallet, session.rewards.coins);
    let leveledUp = false;
    let nextMonster = monster;
    if (monster && monster.lifeState !== "deceased") {
      const before = monster.level;
      nextMonster = gainExp(monster, session.rewards.exp);
      leveledUp = nextMonster.level > before;
    }
    await Promise.all([
      walletRepo.save(nextWallet),
      nextMonster ? monsterRepo.save(nextMonster) : Promise.resolve(),
      studySessionRepo.append(session),
    ]);
    const recent = await studySessionRepo.recent(20);
    set({
      wallet: nextWallet,
      monster: nextMonster ?? monster,
      recentSessions: recent,
    });
    return {
      coins: session.rewards.coins,
      exp: session.rewards.exp,
      leveledUp,
    };
  },

  async resetAll() {
    await monsterRepo.clear();
    await walletRepo.save({ coins: 0, lifetimeEarned: 0, lifetimeSpent: 0 });
    await inventoryRepo.save({ entries: [] });
    const fresh = await bootstrapIfEmpty();
    set({
      monster: fresh.monster,
      wallet: fresh.wallet,
      inventory: fresh.inventory,
      recentSessions: [],
    });
  },
}));

export { FOODS };
