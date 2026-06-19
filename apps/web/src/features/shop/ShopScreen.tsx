import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FOODS } from "../../domain/catalog/foods";
import {
  COSMETICS,
  SLOT_LABELS,
  type EquipmentSlot,
} from "../../domain/catalog/cosmetics";
import {
  INTERIORS,
  CATEGORY_LABELS,
  MAX_FURNITURE,
  type InteriorCategory,
} from "../../domain/catalog/interior";
import { useGameStore } from "../../state/gameStore";
import { countOf } from "../../domain/inventory";
import { hasFurniture } from "../../domain/room";
import { EmojiIcon } from "../../components/EmojiIcon";

type Tab = "food" | "cosmetic" | "interior";

const SLOT_ORDER: EquipmentSlot[] = ["head", "accessory", "body"];
const CATEGORY_ORDER: InteriorCategory[] = ["wallpaper", "floor", "furniture"];

export function ShopScreen() {
  const navigate = useNavigate();
  const wallet = useGameStore((s) => s.wallet);
  const inventory = useGameStore((s) => s.inventory);
  const monster = useGameStore((s) => s.monster);
  const room = useGameStore((s) => s.room);
  const buyFood = useGameStore((s) => s.buyFood);
  const buyCosmetic = useGameStore((s) => s.buyCosmetic);
  const equipCosmetic = useGameStore((s) => s.equipCosmetic);
  const buyInterior = useGameStore((s) => s.buyInterior);
  const applyWallpaper = useGameStore((s) => s.applyWallpaper);
  const applyFloor = useGameStore((s) => s.applyFloor);
  const toggleFurniture = useGameStore((s) => s.toggleFurniture);
  const [tab, setTab] = useState<Tab>("food");
  const [confirm, setConfirm] = useState<{
    id: string;
    name: string;
    price: number;
    kind: Tab;
  } | null>(null);

  // もようがえ: 買ったあとに自動で飾る（壁紙→貼る / 床→敷く / 家具→飾る）。
  async function applyInterior(itemId: string) {
    const item = INTERIORS.find((i) => i.id === itemId);
    if (!item) return;
    if (item.category === "wallpaper") await applyWallpaper(itemId);
    else if (item.category === "floor") await applyFloor(itemId);
    else if (!hasFurniture(room, itemId)) await toggleFurniture(itemId);
  }

  async function handleBuy(item: { id: string; kind: Tab }) {
    const ok =
      item.kind === "food"
        ? await buyFood(item.id)
        : item.kind === "cosmetic"
          ? await buyCosmetic(item.id)
          : await buyInterior(item.id);
    setConfirm(null);
    if (!ok) {
      alert("コインが たりないよ");
    } else if (item.kind === "cosmetic") {
      // 買ったら すぐ きせてあげる。
      await equipCosmetic(item.id);
    } else if (item.kind === "interior") {
      // 買ったら すぐ かざってあげる。
      await applyInterior(item.id);
    }
  }

  return (
    <>
      <header className="row">
        <button className="btn btn--ghost" onClick={() => navigate(-1)}>
          ← もどる
        </button>
        <h1 style={{ margin: 0, marginLeft: 12 }}>ショップ</h1>
        <div className="spacer" />
        <strong style={{ fontSize: "1.1rem" }} className="row">
          <EmojiIcon emoji="💰" size={24} alt="コイン" />
          <span style={{ marginLeft: 4 }}>{wallet.coins}</span>
        </strong>
      </header>

      <div className="shop-tabs shop-tabs--3">
        <button
          className={`shop-tab${tab === "food" ? " is-active" : ""}`}
          onClick={() => setTab("food")}
        >
          <EmojiIcon emoji="🍎" size={22} alt="" />
          <span>ごはん</span>
        </button>
        <button
          className={`shop-tab${tab === "cosmetic" ? " is-active" : ""}`}
          onClick={() => setTab("cosmetic")}
        >
          <EmojiIcon emoji="🎀" size={22} alt="" />
          <span>きせかえ</span>
        </button>
        <button
          className={`shop-tab${tab === "interior" ? " is-active" : ""}`}
          onClick={() => setTab("interior")}
        >
          <EmojiIcon emoji="🛋" size={22} alt="" />
          <span>へや</span>
        </button>
      </div>

      {tab === "food" ? (
        <div className="list">
          {FOODS.map((food) => {
            const owned = countOf(inventory, food.id, "food");
            const canBuy = wallet.coins >= food.price;
            return (
              <div className="list-row" key={food.id}>
                <div className="icon" aria-hidden>
                  <EmojiIcon emoji={food.icon} size={36} alt="" />
                </div>
                <div>
                  <strong>{food.name}</strong>
                  <div className="muted">
                    {food.description}・ もちもの {owned}こ
                  </div>
                </div>
                <button
                  className="btn"
                  disabled={!canBuy}
                  onClick={() =>
                    setConfirm({
                      id: food.id,
                      name: food.name,
                      price: food.price,
                      kind: "food",
                    })
                  }
                >
                  <EmojiIcon emoji="💰" size={18} alt="" />
                  <span style={{ marginLeft: 2 }}>{food.price}</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : tab === "cosmetic" ? (
        <>
          <p className="muted" style={{ margin: "0 4px" }}>
            かった ふくは すぐに きられるよ。きせかえは ホームの「きせかえ」から。
          </p>
          {SLOT_ORDER.map((slot) => {
            const items = COSMETICS.filter((c) => c.slot === slot);
            return (
              <section key={slot} style={{ marginTop: 4 }}>
                <h3 style={{ margin: "8px 4px 6px", color: "var(--text-muted)" }}>
                  {SLOT_LABELS[slot]}
                </h3>
                <div className="list">
                  {items.map((item) => {
                    const owned = countOf(inventory, item.id, "equipment") > 0;
                    const wearing = monster?.equipped[slot] === item.id;
                    const canBuy = wallet.coins >= item.price;
                    return (
                      <div className="list-row" key={item.id}>
                        <div className="icon" aria-hidden>
                          <EmojiIcon emoji={item.icon} size={36} alt="" />
                        </div>
                        <div>
                          <strong>{item.name}</strong>
                          <div className="muted">{item.description}</div>
                        </div>
                        {owned ? (
                          <button
                            className="btn btn--ghost"
                            disabled={wearing}
                            onClick={() => void equipCosmetic(item.id)}
                          >
                            {wearing ? "きてるよ" : "きせる"}
                          </button>
                        ) : (
                          <button
                            className="btn"
                            disabled={!canBuy}
                            onClick={() =>
                              setConfirm({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                kind: "cosmetic",
                              })
                            }
                          >
                            <EmojiIcon emoji="💰" size={18} alt="" />
                            <span style={{ marginLeft: 2 }}>{item.price}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      ) : (
        <>
          <p className="muted" style={{ margin: "0 4px" }}>
            かった もようは すぐに へやに かざるよ。かぐは {MAX_FURNITURE}こ まで かざれるよ。
          </p>
          {CATEGORY_ORDER.map((category) => {
            const items = INTERIORS.filter((i) => i.category === category);
            const furnitureFull =
              category === "furniture" &&
              room.furnitureIds.length >= MAX_FURNITURE;
            return (
              <section key={category} style={{ marginTop: 4 }}>
                <h3 style={{ margin: "8px 4px 6px", color: "var(--text-muted)" }}>
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="list">
                  {items.map((item) => {
                    const owned = countOf(inventory, item.id, "interior") > 0;
                    const canBuy = wallet.coins >= item.price;
                    // いま へやで つかっているか
                    const inUse =
                      category === "wallpaper"
                        ? room.wallpaperId === item.id
                        : category === "floor"
                          ? room.floorId === item.id
                          : hasFurniture(room, item.id);
                    return (
                      <div className="list-row" key={item.id}>
                        <div className="icon" aria-hidden>
                          <EmojiIcon emoji={item.icon} size={36} alt="" />
                        </div>
                        <div>
                          <strong>{item.name}</strong>
                          <div className="muted">{item.description}</div>
                        </div>
                        {owned ? (
                          <InteriorOwnedButton
                            category={category}
                            inUse={inUse}
                            disabled={
                              category === "furniture" && !inUse && furnitureFull
                            }
                            onClick={() => void applyInterior(item.id)}
                            onRemove={() => void toggleFurniture(item.id)}
                          />
                        ) : (
                          <button
                            className="btn"
                            disabled={!canBuy}
                            onClick={() =>
                              setConfirm({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                kind: "interior",
                              })
                            }
                          >
                            <EmojiIcon emoji="💰" size={18} alt="" />
                            <span style={{ marginLeft: 2 }}>{item.price}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}

      {confirm && (
        <div className="modal-mask" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{confirm.name} を かう？</h2>
            <p className="muted">{confirm.price} コイン つかうよ</p>
            <div className="row" style={{ marginTop: 16, gap: 10 }}>
              <button
                className="btn btn--ghost btn--block"
                onClick={() => setConfirm(null)}
              >
                やめる
              </button>
              <button
                className="btn btn--block"
                onClick={() =>
                  void handleBuy({ id: confirm.id, kind: confirm.kind })
                }
              >
                かう
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** 所有済みもようアイテムの操作ボタン。家具は「かざる／しまう」をトグルする。 */
function InteriorOwnedButton({
  category,
  inUse,
  disabled,
  onClick,
  onRemove,
}: {
  category: InteriorCategory;
  inUse: boolean;
  disabled: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  if (category === "furniture") {
    return inUse ? (
      <button className="btn btn--ghost" onClick={onRemove}>
        しまう
      </button>
    ) : (
      <button className="btn btn--ghost" disabled={disabled} onClick={onClick}>
        かざる
      </button>
    );
  }
  // 壁紙・床は 1 つだけ選択。使用中なら無効化して状態を示す。
  const label = category === "wallpaper" ? "はってる" : "しいてる";
  const action = category === "wallpaper" ? "はる" : "しく";
  return (
    <button className="btn btn--ghost" disabled={inUse} onClick={onClick}>
      {inUse ? label : action}
    </button>
  );
}
