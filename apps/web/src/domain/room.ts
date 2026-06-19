import { MAX_FURNITURE } from "./catalog/interior";

/**
 * へや（ホーム画面のステージ）のもようがえ状態。
 * - wallpaperId / floorId: 選んでいる壁紙・床。null ならデフォルトの見た目。
 * - furnitureIds: 飾っている家具（最大 MAX_FURNITURE 個）。並び順 = 表示順。
 *
 * Monster とは独立した端末単位の状態なので、settings テーブルに singleton で持つ。
 */
export interface Room {
  wallpaperId: string | null;
  floorId: string | null;
  furnitureIds: string[];
}

export function createInitialRoom(): Room {
  return { wallpaperId: null, floorId: null, furnitureIds: [] };
}

/** 壊れた保存値（古いスキーマ・手書き）でも安全に Room へ正規化する。 */
export function normalizeRoom(value: unknown): Room {
  if (!value || typeof value !== "object") return createInitialRoom();
  const v = value as Partial<Room>;
  const furniture = Array.isArray(v.furnitureIds)
    ? v.furnitureIds.filter((x): x is string => typeof x === "string")
    : [];
  return {
    wallpaperId: typeof v.wallpaperId === "string" ? v.wallpaperId : null,
    floorId: typeof v.floorId === "string" ? v.floorId : null,
    furnitureIds: furniture.slice(0, MAX_FURNITURE),
  };
}

export function setWallpaper(room: Room, id: string): Room {
  if (room.wallpaperId === id) return room;
  return { ...room, wallpaperId: id };
}

export function setFloor(room: Room, id: string): Room {
  if (room.floorId === id) return room;
  return { ...room, floorId: id };
}

export function hasFurniture(room: Room, id: string): boolean {
  return room.furnitureIds.includes(id);
}

/**
 * 家具の飾る／しまうをトグルする。上限に達しているときの追加は無視する
 * （= 変化なしで同じ参照を返す）。
 */
export function toggleFurniture(room: Room, id: string): Room {
  if (room.furnitureIds.includes(id)) {
    return { ...room, furnitureIds: room.furnitureIds.filter((x) => x !== id) };
  }
  if (room.furnitureIds.length >= MAX_FURNITURE) return room;
  return { ...room, furnitureIds: [...room.furnitureIds, id] };
}
