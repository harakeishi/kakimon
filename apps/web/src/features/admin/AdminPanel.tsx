import { useState } from "react";
import { useGameStore } from "../../state/gameStore";
import { FOODS } from "../../domain/catalog/foods";
import { COSMETICS } from "../../domain/catalog/cosmetics";
import { countOf } from "../../domain/inventory";
import type { LifeState, MonsterStage } from "../../domain/monster";
import { EmojiIcon } from "../../components/EmojiIcon";

const LIFE_STATES: LifeState[] = [
  "healthy",
  "weak",
  "sick",
  "dying",
  "deceased",
];
const STAGES: MonsterStage[] = ["egg", "baby", "child", "teen", "adult"];

/** 入力文字列を数値へ。空や不正は fallback を返す。 */
function toNum(v: string, fallback: number): number {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) ? n : fallback;
}

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const monster = useGameStore((s) => s.monster);
  const wallet = useGameStore((s) => s.wallet);
  const inventory = useGameStore((s) => s.inventory);
  const adminSetCoins = useGameStore((s) => s.adminSetCoins);
  const adminPatchMonster = useGameStore((s) => s.adminPatchMonster);
  const adminSetItemCount = useGameStore((s) => s.adminSetItemCount);

  // 入力はすべて文字列で保持し、保存時にまとめて反映する。
  const [coins, setCoins] = useState(String(wallet.coins));
  const [hp, setHp] = useState(String(monster?.stats.hp ?? 0));
  const [maxHp, setMaxHp] = useState(String(monster?.stats.maxHp ?? 0));
  const [level, setLevel] = useState(String(monster?.level ?? 1));
  const [exp, setExp] = useState(String(monster?.exp ?? 0));
  const [expToNext, setExpToNext] = useState(String(monster?.expToNext ?? 0));
  const [attack, setAttack] = useState(String(monster?.stats.attack ?? 0));
  const [defense, setDefense] = useState(String(monster?.stats.defense ?? 0));
  const [speed, setSpeed] = useState(String(monster?.stats.speed ?? 0));
  const [smart, setSmart] = useState(String(monster?.stats.smart ?? 0));
  const [hunger, setHunger] = useState(String(monster?.condition.hunger ?? 0));
  const [mood, setMood] = useState(String(monster?.condition.mood ?? 0));
  const [cleanliness, setCleanliness] = useState(
    String(monster?.condition.cleanliness ?? 0)
  );
  const [lifeState, setLifeState] = useState<LifeState>(
    monster?.lifeState ?? "healthy"
  );
  const [stage, setStage] = useState<MonsterStage>(monster?.stage ?? "egg");
  const [items, setItems] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      FOODS.map((f) => [f.id, String(countOf(inventory, f.id, "food"))])
    )
  );
  const [cosmetics, setCosmetics] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      COSMETICS.map((c) => [
        c.id,
        String(countOf(inventory, c.id, "equipment")),
      ])
    )
  );
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await adminSetCoins(toNum(coins, wallet.coins));
    if (monster) {
      await adminPatchMonster({
        hp: toNum(hp, monster.stats.hp),
        maxHp: toNum(maxHp, monster.stats.maxHp),
        level: toNum(level, monster.level),
        exp: toNum(exp, monster.exp),
        expToNext: toNum(expToNext, monster.expToNext),
        attack: toNum(attack, monster.stats.attack),
        defense: toNum(defense, monster.stats.defense),
        speed: toNum(speed, monster.stats.speed),
        smart: toNum(smart, monster.stats.smart),
        hunger: toNum(hunger, monster.condition.hunger),
        mood: toNum(mood, monster.condition.mood),
        cleanliness: toNum(cleanliness, monster.condition.cleanliness),
        lifeState,
        stage,
      });
    }
    for (const food of FOODS) {
      const current = countOf(inventory, food.id, "food");
      const next = toNum(items[food.id] ?? "", current);
      if (next !== current) {
        await adminSetItemCount(food.id, "food", next);
      }
    }
    for (const item of COSMETICS) {
      const current = countOf(inventory, item.id, "equipment");
      const next = toNum(cosmetics[item.id] ?? "", current);
      if (next !== current) {
        await adminSetItemCount(item.id, "equipment", next);
      }
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div
        className="modal admin-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>
            <EmojiIcon emoji="⚙️" size={24} alt="" /> かんりしゃモード
          </h2>
          <div className="spacer" />
          <button className="btn btn--ghost" onClick={onClose}>
            とじる
          </button>
        </div>

        <section className="admin-section">
          <h3>おかね</h3>
          <AdminField label="コイン" value={coins} onChange={setCoins} />
        </section>

        {monster ? (
          <>
            <section className="admin-section">
              <h3>HP・けいけんち</h3>
              <div className="admin-grid">
                <AdminField label="HP" value={hp} onChange={setHp} />
                <AdminField
                  label="さいだいHP"
                  value={maxHp}
                  onChange={setMaxHp}
                />
                <AdminField label="レベル" value={level} onChange={setLevel} />
                <AdminField label="けいけんち" value={exp} onChange={setExp} />
                <AdminField
                  label="つぎまで"
                  value={expToNext}
                  onChange={setExpToNext}
                />
              </div>
            </section>

            <section className="admin-section">
              <h3>のうりょく</h3>
              <div className="admin-grid">
                <AdminField
                  label="こうげき"
                  value={attack}
                  onChange={setAttack}
                />
                <AdminField
                  label="ぼうぎょ"
                  value={defense}
                  onChange={setDefense}
                />
                <AdminField label="すばやさ" value={speed} onChange={setSpeed} />
                <AdminField label="かしこさ" value={smart} onChange={setSmart} />
              </div>
            </section>

            <section className="admin-section">
              <h3>じょうたい（0〜100）</h3>
              <div className="admin-grid">
                <AdminField
                  label="くうふく"
                  value={hunger}
                  onChange={setHunger}
                />
                <AdminField label="きげん" value={mood} onChange={setMood} />
                <AdminField
                  label="きれい"
                  value={cleanliness}
                  onChange={setCleanliness}
                />
              </div>
              <div className="admin-grid" style={{ marginTop: 8 }}>
                <label className="admin-field">
                  <span>けんこう</span>
                  <select
                    value={lifeState}
                    onChange={(e) =>
                      setLifeState(e.target.value as LifeState)
                    }
                  >
                    {LIFE_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>せいちょう</span>
                  <select
                    value={stage}
                    onChange={(e) =>
                      setStage(e.target.value as MonsterStage)
                    }
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          </>
        ) : (
          <p className="muted">モンスターが いません</p>
        )}

        <section className="admin-section">
          <h3>もちもの</h3>
          <div className="admin-grid">
            {FOODS.map((food) => (
              <AdminField
                key={food.id}
                label={`${food.icon} ${food.name}`}
                value={items[food.id] ?? "0"}
                onChange={(v) =>
                  setItems((prev) => ({ ...prev, [food.id]: v }))
                }
              />
            ))}
          </div>
        </section>

        <section className="admin-section">
          <h3>きせかえ（もちもの）</h3>
          <div className="admin-grid">
            {COSMETICS.map((item) => (
              <AdminField
                key={item.id}
                label={`${item.icon} ${item.name}`}
                value={cosmetics[item.id] ?? "0"}
                onChange={(v) =>
                  setCosmetics((prev) => ({ ...prev, [item.id]: v }))
                }
              />
            ))}
          </div>
        </section>

        <button
          className="btn btn--block btn--success"
          style={{ marginTop: 12 }}
          onClick={() => void handleSave()}
        >
          {saved ? "ほぞんしました ✓" : "ほぞんする"}
        </button>
      </div>
    </div>
  );
}

function AdminField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
