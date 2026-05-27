import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FOODS } from "../../domain/catalog/foods";
import { useGameStore } from "../../state/gameStore";
import { countOf } from "../../domain/inventory";

export function ShopScreen() {
  const navigate = useNavigate();
  const wallet = useGameStore((s) => s.wallet);
  const inventory = useGameStore((s) => s.inventory);
  const buyFood = useGameStore((s) => s.buyFood);
  const [confirm, setConfirm] = useState<{
    foodId: string;
    name: string;
    price: number;
  } | null>(null);

  async function handleBuy(foodId: string) {
    const ok = await buyFood(foodId);
    setConfirm(null);
    if (!ok) {
      alert("コインが たりないよ");
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
        <strong style={{ fontSize: "1.1rem" }}>💰 {wallet.coins}</strong>
      </header>

      <div className="list">
        {FOODS.map((food) => {
          const owned = countOf(inventory, food.id, "food");
          const canBuy = wallet.coins >= food.price;
          return (
            <div className="list-row" key={food.id}>
              <div className="icon" aria-hidden>
                {food.icon}
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
                  food.price >= 20
                    ? setConfirm({
                        foodId: food.id,
                        name: food.name,
                        price: food.price,
                      })
                    : handleBuy(food.id)
                }
              >
                💰{food.price}
              </button>
            </div>
          );
        })}
      </div>

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
                onClick={() => void handleBuy(confirm.foodId)}
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
