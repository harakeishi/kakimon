import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FOODS } from "../../domain/catalog/foods";
import {
  COSMETICS,
  SLOT_LABELS,
  type EquipmentSlot,
} from "../../domain/catalog/cosmetics";
import { useGameStore } from "../../state/gameStore";
import { countOf } from "../../domain/inventory";
import { EmojiIcon } from "../../components/EmojiIcon";

type Tab = "food" | "cosmetic";

const SLOT_ORDER: EquipmentSlot[] = ["head", "accessory", "body"];

export function ShopScreen() {
  const navigate = useNavigate();
  const wallet = useGameStore((s) => s.wallet);
  const inventory = useGameStore((s) => s.inventory);
  const monster = useGameStore((s) => s.monster);
  const buyFood = useGameStore((s) => s.buyFood);
  const buyCosmetic = useGameStore((s) => s.buyCosmetic);
  const equipCosmetic = useGameStore((s) => s.equipCosmetic);
  const [tab, setTab] = useState<Tab>("food");
  const [confirm, setConfirm] = useState<{
    id: string;
    name: string;
    price: number;
    kind: Tab;
  } | null>(null);

  async function handleBuy(item: {
    id: string;
    kind: Tab;
  }) {
    const ok =
      item.kind === "food"
        ? await buyFood(item.id)
        : await buyCosmetic(item.id);
    setConfirm(null);
    if (!ok) {
      alert("コインが たりないよ");
    } else if (item.kind === "cosmetic") {
      // 買ったら すぐ きせてあげる。
      await equipCosmetic(item.id);
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

      <div className="shop-tabs">
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
      ) : (
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
