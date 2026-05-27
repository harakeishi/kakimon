export interface InventoryEntry {
  itemId: string;
  kind: "food" | "equipment";
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
  kind: "food" | "equipment",
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
  kind: "food" | "equipment",
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
  kind: "food" | "equipment"
): number {
  const entry = inv.entries.find(
    (e) => e.itemId === itemId && e.kind === kind
  );
  return entry?.count ?? 0;
}
