// アイテムの種別。
// - food: 餌（消費する）
// - equipment: きせかえ（モンスターに装備、非消費）
// - interior: へやのもよう（壁紙・床・家具、非消費）
export type ItemKind = "food" | "equipment" | "interior";

export interface InventoryEntry {
  itemId: string;
  kind: ItemKind;
  count: number;
}

export interface Inventory {
  entries: InventoryEntry[];
}

export function createInitialInventory(): Inventory {
  return { entries: [] };
}

export function addItem(
  inv: Inventory,
  itemId: string,
  kind: ItemKind,
  amount = 1
): Inventory {
  const idx = inv.entries.findIndex(
    (e) => e.itemId === itemId && e.kind === kind
  );
  if (idx === -1) {
    return { entries: [...inv.entries, { itemId, kind, count: amount }] };
  }
  const next = [...inv.entries];
  const existing = next[idx]!;
  next[idx] = { ...existing, count: existing.count + amount };
  return { entries: next };
}

export function removeItem(
  inv: Inventory,
  itemId: string,
  kind: ItemKind,
  amount = 1
): Inventory | null {
  const idx = inv.entries.findIndex(
    (e) => e.itemId === itemId && e.kind === kind
  );
  if (idx === -1) return null;
  const existing = inv.entries[idx]!;
  if (existing.count < amount) return null;
  const next = [...inv.entries];
  const newCount = existing.count - amount;
  if (newCount === 0) {
    next.splice(idx, 1);
  } else {
    next[idx] = { ...existing, count: newCount };
  }
  return { entries: next };
}

export function countOf(
  inv: Inventory,
  itemId: string,
  kind: ItemKind
): number {
  const entry = inv.entries.find(
    (e) => e.itemId === itemId && e.kind === kind
  );
  return entry?.count ?? 0;
}
