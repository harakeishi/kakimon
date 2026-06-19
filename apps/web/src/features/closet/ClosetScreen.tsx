import { Link, useNavigate } from "react-router-dom";
import {
  COSMETICS,
  SLOT_LABELS,
  type EquipmentSlot,
} from "../../domain/catalog/cosmetics";
import { useGameStore } from "../../state/gameStore";
import { countOf } from "../../domain/inventory";
import { EmojiIcon } from "../../components/EmojiIcon";
import { MonsterSprite } from "../../components/MonsterSprite";

const SLOT_ORDER: EquipmentSlot[] = ["head", "accessory", "body"];

export function ClosetScreen() {
  const navigate = useNavigate();
  const monster = useGameStore((s) => s.monster);
  const inventory = useGameStore((s) => s.inventory);
  const equipCosmetic = useGameStore((s) => s.equipCosmetic);
  const unequipSlot = useGameStore((s) => s.unequipSlot);

  if (!monster) return null;

  // 所有しているきせかえアイテム（スロットごと）。
  const ownedBySlot = (slot: EquipmentSlot) =>
    COSMETICS.filter(
      (c) => c.slot === slot && countOf(inventory, c.id, "equipment") > 0
    );

  const ownedTotal = COSMETICS.filter(
    (c) => countOf(inventory, c.id, "equipment") > 0
  ).length;

  return (
    <>
      <header className="row">
        <button className="btn btn--ghost" onClick={() => navigate(-1)}>
          ← もどる
        </button>
        <h1 style={{ margin: 0, marginLeft: 12 }}>きせかえ</h1>
      </header>

      <section className="monster-stage" style={{ height: 220 }}>
        <MonsterSprite monster={monster} size={150} />
      </section>

      {ownedTotal === 0 ? (
        <div className="card center">
          <EmojiIcon emoji="🛍" size={56} alt="" />
          <h2 style={{ margin: "8px 0 4px" }}>まだ ふくが ないよ</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            ショップで ぼうしや ふくを かって きせかえしよう！
          </p>
          <Link to="/shop" className="btn btn--block btn--secondary">
            ショップへ いく
          </Link>
        </div>
      ) : (
        SLOT_ORDER.map((slot) => {
          const items = ownedBySlot(slot);
          const equippedId = monster.equipped[slot];
          return (
            <section className="card" key={slot}>
              <div className="row">
                <h3 style={{ margin: 0 }}>{SLOT_LABELS[slot]}</h3>
                <div className="spacer" />
                {equippedId && (
                  <button
                    className="btn btn--ghost"
                    style={{ minHeight: 40, padding: "6px 14px" }}
                    onClick={() => void unequipSlot(slot)}
                  >
                    はずす
                  </button>
                )}
              </div>
              {items.length === 0 ? (
                <p className="muted" style={{ marginBottom: 0 }}>
                  もっていないよ
                </p>
              ) : (
                <div className="closet-grid">
                  {items.map((item) => {
                    const wearing = equippedId === item.id;
                    return (
                      <button
                        key={item.id}
                        className={`closet-item${wearing ? " is-on" : ""}`}
                        onClick={() =>
                          wearing
                            ? void unequipSlot(slot)
                            : void equipCosmetic(item.id)
                        }
                        aria-pressed={wearing}
                      >
                        <EmojiIcon emoji={item.icon} size={40} alt="" />
                        <span className="closet-item__name">{item.name}</span>
                        {wearing && (
                          <span className="closet-item__badge">きてる</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })
      )}
    </>
  );
}
