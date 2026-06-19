import { create } from "zustand";
import type { LifeState, Monster, MonsterStage } from "../domain/monster";
import {
  equip as equipMonster,
  feed as feedMonster,
  gainExp,
  hatch,
  isEgg,
  needsNaming,
  pet as petMonster,
  rename,
  tickMonster,
  unequip as unequipMonster,
  type EquipSlot,
} from "../domain/monster";
import type { Wallet } from "../domain/wallet";
import { earn, spend } from "../domain/wallet";
import type { Inventory, ItemKind } from "../domain/inventory";
import { addItem, countOf, removeItem } from "../domain/inventory";
import type { Room } from "../domain/room";
import {
  createInitialRoom,
  setFloor,
  setWallpaper,
  toggleFurniture,
} from "../domain/room";
import type { StudySession } from "../domain/studySession";
import type { GraveRecord } from "../domain/graveyard";
import { buildGraveRecord } from "../domain/graveyard";
import {
  bootstrapIfEmpty,
  graveyardRepo,
  inventoryRepo,
  monsterRepo,
  roomRepo,
  studySessionRepo,
  walletRepo,
} from "../infra/db/repositories";
import { db } from "../infra/db/dexie";
import { FOODS, findFood } from "../domain/catalog/foods";
import { COSMETICS, findCosmetic } from "../domain/catalog/cosmetics";
import { INTERIORS, findInterior } from "../domain/catalog/interior";

/**
 * 管理者（保護者）モードでモンスターのステータスを直接書き換えるためのパッチ。
 * 指定したフィールドだけ上書きする。通常のゲームロジック（tick / お世話 / 学習）を
 * 経由せず値を設定できる、デバッグ・調整用の経路。
 */
export interface AdminMonsterPatch {
  hp?: number;
  maxHp?: number;
  level?: number;
  exp?: number;
  expToNext?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  smart?: number;
  hunger?: number;
  mood?: number;
  cleanliness?: number;
  lifeState?: LifeState;
  stage?: MonsterStage;
}

interface GameState {
  ready: boolean;
  monster: Monster | null;
  wallet: Wallet;
  inventory: Inventory;
  /** へやのもようがえ状態（壁紙・床・家具） */
  room: Room;
  recentSessions: StudySession[];
  graves: GraveRecord[];
  init: () => Promise<void>;
  tick: () => Promise<void>;
  petMonster: () => Promise<void>;
  feedWith: (foodId: string) => Promise<boolean>;
  buyFood: (foodId: string) => Promise<boolean>;
  /** きせかえアイテムを買う。すでに持っていれば false（同じ物は 1 つで十分）。 */
  buyCosmetic: (itemId: string) => Promise<boolean>;
  /** きせかえアイテムを装備する。所有していなければ false。 */
  equipCosmetic: (itemId: string) => Promise<boolean>;
  /** 指定スロットの装備をはずす。 */
  unequipSlot: (slot: EquipSlot) => Promise<void>;
  /** へやのもよう（壁紙・床・家具）を買う。すでに持っていれば false。 */
  buyInterior: (itemId: string) => Promise<boolean>;
  /** 壁紙を貼る。所有していなければ false。 */
  applyWallpaper: (itemId: string) => Promise<boolean>;
  /** 床を敷く。所有していなければ false。 */
  applyFloor: (itemId: string) => Promise<boolean>;
  /** 家具を飾る／しまうをトグルする。所有していなければ false。 */
  toggleFurniture: (itemId: string) => Promise<boolean>;
  applyReward: (
    session: StudySession
  ) => Promise<{
    coins: number;
    exp: number;
    leveledUp: boolean;
    wasDeceased: boolean;
    /** この学習で卵が孵化したか（命名フローへ誘導するため） */
    didHatch: boolean;
  }>;
  /** 孵化後の命名 */
  nameMonster: (name: string) => Promise<void>;
  /** 「ふりだしに戻る」: 全データをまっさらにする (開発用・保護者画面用) */
  hardReset: () => Promise<void>;
  /**
   * 「新しいタマゴで再スタート」: deceased からの再生。
   * Wallet / Inventory / StudySession 履歴は保持。Monster だけ初期化する。
   * docs/04-domain-model.md 4.4 節「死亡からの再スタート」と一致。
   */
  rebirth: () => Promise<void>;
  /** 管理者モード: コイン残高を直接設定する */
  adminSetCoins: (coins: number) => Promise<void>;
  /** 管理者モード: モンスターのステータスを直接書き換える */
  adminPatchMonster: (patch: AdminMonsterPatch) => Promise<void>;
  /** 管理者モード: 所持アイテム数を直接設定する（0 で削除） */
  adminSetItemCount: (
    itemId: string,
    kind: ItemKind,
    count: number
  ) => Promise<void>;
}

// init() / bootstrap 系の二重起動を防ぐためのプロセス内 promise キャッシュ。
// React StrictMode の二度マウントでも 1 回しか走らないようにする。
let initInflight: Promise<void> | null = null;
let rebirthInflight: Promise<void> | null = null;

export const useGameStore = create<GameState>((set, get) => ({
  ready: false,
  monster: null,
  wallet: { coins: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
  inventory: { entries: [] },
  room: createInitialRoom(),
  recentSessions: [],
  graves: [],

  async init() {
    if (get().ready) return;
    if (initInflight) return initInflight;
    initInflight = (async () => {
      const { monster, wallet, inventory, room } = await bootstrapIfEmpty();
      const ticked = tickMonster(monster, Date.now());
      // 起動時に deceased を検知したら、お墓に転記する（未記録なら）。
      const finalMonster = await commitDeathIfNeeded(ticked);
      if (finalMonster !== monster) await monsterRepo.save(finalMonster);
      const recent = await studySessionRepo.recent(20);
      const graves = await graveyardRepo.list();
      set({
        ready: true,
        monster: finalMonster,
        wallet,
        inventory,
        room,
        recentSessions: recent,
        graves,
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
    if (ticked === m) return;
    const committed = await commitDeathIfNeeded(ticked);
    await monsterRepo.save(committed);
    set({
      monster: committed,
      graves:
        committed.lifeState === "deceased" && m.lifeState !== "deceased"
          ? await graveyardRepo.list()
          : get().graves,
    });
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

  async buyCosmetic(itemId) {
    const item = findCosmetic(itemId);
    if (!item) return false;
    const { wallet, inventory } = get();
    // きせかえは消費しない。同じ物を 2 個持っても意味がないので所有済みなら買わない。
    if (countOf(inventory, itemId, "equipment") > 0) return false;
    const spent = spend(wallet, item.price);
    if (!spent) return false;
    const added = addItem(inventory, itemId, "equipment", 1);
    try {
      await db.transaction("rw", db.wallet, db.inventory, async () => {
        await walletRepo.save(spent);
        await inventoryRepo.save(added);
      });
    } catch (e) {
      console.error("[gameStore.buyCosmetic] transaction failed:", e);
      return false;
    }
    set({ wallet: spent, inventory: added });
    return true;
  },

  async equipCosmetic(itemId) {
    const { monster, inventory } = get();
    if (!monster) return false;
    if (countOf(inventory, itemId, "equipment") <= 0) return false;
    const item = findCosmetic(itemId);
    if (!item) return false;
    const next = equipMonster(monster, item.slot, itemId);
    if (next === monster) return true;
    await monsterRepo.save(next);
    set({ monster: next });
    return true;
  },

  async unequipSlot(slot) {
    const { monster } = get();
    if (!monster) return;
    const next = unequipMonster(monster, slot);
    if (next === monster) return;
    await monsterRepo.save(next);
    set({ monster: next });
  },

  async buyInterior(itemId) {
    const item = findInterior(itemId);
    if (!item) return false;
    const { wallet, inventory } = get();
    // もようがえは非消費。同じ物を 2 個持っても意味がないので所有済みなら買わない。
    if (countOf(inventory, itemId, "interior") > 0) return false;
    const spent = spend(wallet, item.price);
    if (!spent) return false;
    const added = addItem(inventory, itemId, "interior", 1);
    try {
      await db.transaction("rw", db.wallet, db.inventory, async () => {
        await walletRepo.save(spent);
        await inventoryRepo.save(added);
      });
    } catch (e) {
      console.error("[gameStore.buyInterior] transaction failed:", e);
      return false;
    }
    set({ wallet: spent, inventory: added });
    return true;
  },

  async applyWallpaper(itemId) {
    const { room, inventory } = get();
    if (countOf(inventory, itemId, "interior") <= 0) return false;
    const item = findInterior(itemId);
    if (!item || item.category !== "wallpaper") return false;
    const next = setWallpaper(room, itemId);
    if (next === room) return true;
    await roomRepo.save(next);
    set({ room: next });
    return true;
  },

  async applyFloor(itemId) {
    const { room, inventory } = get();
    if (countOf(inventory, itemId, "interior") <= 0) return false;
    const item = findInterior(itemId);
    if (!item || item.category !== "floor") return false;
    const next = setFloor(room, itemId);
    if (next === room) return true;
    await roomRepo.save(next);
    set({ room: next });
    return true;
  },

  async toggleFurniture(itemId) {
    const { room, inventory } = get();
    if (countOf(inventory, itemId, "interior") <= 0) return false;
    const item = findInterior(itemId);
    if (!item || item.category !== "furniture") return false;
    const next = toggleFurniture(room, itemId);
    // 上限に達していて追加できなかった場合は参照が変わらない。
    if (next === room) return false;
    await roomRepo.save(next);
    set({ room: next });
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
    let didHatch = false;
    let nextMonster = monster;
    if (monster && !isDeceased) {
      // 卵 → 孵化（最初の学習で baby になる。命名は孵化後に行う）
      let m = monster;
      if (isEgg(m)) {
        m = hatch(m);
        didHatch = true;
      }
      const before = m.level;
      m = gainExp(m, effectiveSession.rewards.exp);
      leveledUp = m.level > before;
      m = { ...m, totalSessions: (m.totalSessions ?? 0) + 1 };
      nextMonster = m;
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
      didHatch,
    };
  },

  async nameMonster(name) {
    const m = get().monster;
    if (!m) return;
    if (!needsNaming(m)) return;
    const next = rename(m, name);
    if (next === m) return;
    await monsterRepo.save(next);
    set({ monster: next });
  },

  async hardReset() {
    await monsterRepo.clear();
    await walletRepo.save({ coins: 0, lifetimeEarned: 0, lifetimeSpent: 0 });
    await inventoryRepo.save({ entries: [] });
    await studySessionRepo.clear();
    await graveyardRepo.clear();
    await roomRepo.clear();
    const fresh = await bootstrapIfEmpty();
    set({
      monster: fresh.monster,
      wallet: fresh.wallet,
      inventory: fresh.inventory,
      room: fresh.room,
      recentSessions: [],
      graves: [],
    });
  },

  async rebirth() {
    if (rebirthInflight) return rebirthInflight;
    rebirthInflight = (async () => {
      // deceased の Monster はお墓に転記してからクリア。
      const current = get().monster;
      if (current && current.lifeState === "deceased") {
        const grave = buildGraveRecord(current);
        await graveyardRepo.add(grave);
      }
      await monsterRepo.clear();
      const fresh = await bootstrapIfEmpty();
      // 他タブが wallet / inventory を更新している可能性に備え、
      // bootstrap で読んだ最新値で in-memory state を上書きする。
      const recent = await studySessionRepo.recent(20);
      const graves = await graveyardRepo.list();
      set({
        monster: fresh.monster,
        wallet: fresh.wallet,
        inventory: fresh.inventory,
        // へやのもよう は再スタートでも持ち越す（Wallet / Inventory と同じ扱い）。
        room: fresh.room,
        recentSessions: recent,
        graves,
      });
    })();
    try {
      await rebirthInflight;
    } finally {
      rebirthInflight = null;
    }
  },

  async adminSetCoins(coins) {
    const { wallet } = get();
    const next: Wallet = { ...wallet, coins: Math.max(0, Math.floor(coins)) };
    await walletRepo.save(next);
    set({ wallet: next });
  },

  async adminPatchMonster(patch) {
    const m = get().monster;
    if (!m) return;
    const num = (v: number | undefined, fallback: number) =>
      typeof v === "number" && Number.isFinite(v) ? v : fallback;

    const maxHp = Math.max(1, Math.round(num(patch.maxHp, m.stats.maxHp)));
    const next: Monster = {
      ...m,
      level: Math.max(1, Math.round(num(patch.level, m.level))),
      exp: Math.max(0, Math.round(num(patch.exp, m.exp))),
      expToNext: Math.max(1, Math.round(num(patch.expToNext, m.expToNext))),
      stage: patch.stage ?? m.stage,
      lifeState: patch.lifeState ?? m.lifeState,
      stats: {
        ...m.stats,
        maxHp,
        hp: clampInt(num(patch.hp, m.stats.hp), 0, maxHp),
        attack: Math.max(0, Math.round(num(patch.attack, m.stats.attack))),
        defense: Math.max(0, Math.round(num(patch.defense, m.stats.defense))),
        speed: Math.max(0, Math.round(num(patch.speed, m.stats.speed))),
        smart: Math.max(0, Math.round(num(patch.smart, m.stats.smart))),
      },
      condition: {
        hunger: clampInt(num(patch.hunger, m.condition.hunger), 0, 100),
        mood: clampInt(num(patch.mood, m.condition.mood), 0, 100),
        cleanliness: clampInt(
          num(patch.cleanliness, m.condition.cleanliness),
          0,
          100
        ),
      },
      // deceased から生き返らせた場合は dying タイマーをリセットしておく。
      dyingSince:
        patch.lifeState && patch.lifeState !== "dying" ? null : m.dyingSince,
    };
    await monsterRepo.save(next);
    set({ monster: next });
  },

  async adminSetItemCount(itemId, kind, count) {
    const { inventory } = get();
    const target = Math.max(0, Math.floor(count));
    const others = inventory.entries.filter(
      (e) => !(e.itemId === itemId && e.kind === kind)
    );
    const next: Inventory =
      target <= 0
        ? { entries: others }
        : { entries: [...others, { itemId, kind, count: target }] };
    await inventoryRepo.save(next);
    set({ inventory: next });
  },
}));

function clampInt(v: number, min: number, max: number): number {
  const r = Math.round(v);
  if (Number.isNaN(r)) return min;
  return Math.max(min, Math.min(max, r));
}

/**
 * tick / init で deceased を検知したら、まだお墓に記録していなければ追加する。
 * rebirth() を待たず、起動時点で図鑑に残す（ユーザが rebirth せず放置しても残る）。
 */
async function commitDeathIfNeeded(m: Monster): Promise<Monster> {
  if (m.lifeState !== "deceased") return m;
  const existing = await db.graveyard.get(m.id);
  if (existing) return m;
  await graveyardRepo.add(buildGraveRecord(m));
  return m;
}

export { FOODS, COSMETICS, INTERIORS };
