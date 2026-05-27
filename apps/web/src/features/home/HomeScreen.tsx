import { Link } from "react-router-dom";
import { useGameStore } from "../../state/gameStore";
import { FOODS } from "../../domain/catalog/foods";
import { countOf } from "../../domain/inventory";
import type { Monster } from "../../domain/monster";

const LIFE_STATE_LABELS: Record<Monster["lifeState"], string> = {
  healthy: "げんき",
  weak: "ちょっと よわってる",
  sick: "ぐあいが わるい",
  dying: "あぶないよ！",
  deceased: "おやすみちゅう",
};

const MONSTER_FACE_BY_STAGE: Record<Monster["stage"], string> = {
  egg: "🥚",
  baby: "🐣",
  child: "🐤",
  teen: "🐥",
  adult: "🐉",
};

export function HomeScreen() {
  const monster = useGameStore((s) => s.monster);
  const wallet = useGameStore((s) => s.wallet);
  const inventory = useGameStore((s) => s.inventory);
  const petMonster = useGameStore((s) => s.petMonster);
  const feedWith = useGameStore((s) => s.feedWith);

  if (!monster) return null;

  const hungerBar = barClass(100 - monster.condition.hunger);
  const moodBar = barClass(monster.condition.mood);
  const hpRatio = monster.stats.maxHp
    ? Math.round((monster.stats.hp / monster.stats.maxHp) * 100)
    : 0;
  const hpBar = barClass(hpRatio);

  return (
    <>
      <header className="status-bar">
        <StatusCell label="HP" value={`${monster.stats.hp}/${monster.stats.maxHp}`} />
        <StatusCell label="レベル" value={`${monster.level}`} />
        <StatusCell label="つぎまで" value={`${monster.expToNext - monster.exp}`} />
        <StatusCell label="コイン" value={`${wallet.coins}`} />
      </header>

      {monster.lifeState !== "healthy" && (
        <div
          className={`warn-banner ${
            monster.lifeState === "dying" ? "" : "sick"
          }`}
        >
          {monster.name} は {LIFE_STATE_LABELS[monster.lifeState]}。
          おせわ してあげよう。
        </div>
      )}

      <section className="monster-stage">
        <div className="monster-state-badge">
          {LIFE_STATE_LABELS[monster.lifeState]}
        </div>
        <div
          className="monster-art"
          onClick={
            monster.lifeState === "deceased" ? undefined : () => void petMonster()
          }
          role={monster.lifeState === "deceased" ? undefined : "button"}
          aria-label={
            monster.lifeState === "deceased"
              ? `${monster.name} は おやすみちゅう`
              : `${monster.name} を なでる`
          }
          style={
            monster.lifeState === "deceased"
              ? { opacity: 0.5, cursor: "default" }
              : undefined
          }
        >
          {monster.lifeState === "deceased"
            ? "🌸"
            : MONSTER_FACE_BY_STAGE[monster.stage]}
        </div>
      </section>

      <section className="card">
        <h2 style={{ margin: 0 }}>{monster.name}</h2>
        <div className="muted" style={{ marginBottom: 10 }}>
          {LIFE_STATE_LABELS[monster.lifeState]} ・ Lv{monster.level}
        </div>

        <ConditionRow label="HP" value={hpRatio} bar={hpBar} />
        <ConditionRow
          label="まんぷく"
          value={Math.round(100 - monster.condition.hunger)}
          bar={hungerBar}
        />
        <ConditionRow
          label="きげん"
          value={Math.round(monster.condition.mood)}
          bar={moodBar}
        />
      </section>

      <section className="actions-grid">
        <Link to="/study" className="btn btn--big btn--secondary">
          📚 べんきょう
        </Link>
        <Link to="/shop" className="btn btn--big">
          🛍 ショップ
        </Link>
        <button
          className="btn btn--big btn--ghost"
          disabled={monster.lifeState === "deceased"}
          onClick={() => void petMonster()}
        >
          🤗 なでる
        </button>
      </section>

      <section className="card">
        <h3>ごはんを あげる</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          もちもの から ごはんを えらぼう
        </p>
        <div className="list">
          {FOODS.map((food) => {
            const owned = countOf(inventory, food.id, "food");
            return (
              <div className="list-row" key={food.id}>
                <div className="icon" aria-hidden>
                  {food.icon}
                </div>
                <div>
                  <strong>{food.name}</strong>
                  <div className="muted">のこり {owned} こ</div>
                </div>
                <button
                  className="btn"
                  disabled={owned <= 0 || monster.lifeState === "deceased"}
                  onClick={() => void feedWith(food.id)}
                >
                  あげる
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function StatusCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ConditionRow({
  label,
  value,
  bar,
}: {
  label: string;
  value: number;
  bar: string;
}) {
  return (
    <div style={{ marginTop: 8 }}>
      <div className="row" style={{ fontSize: "0.9rem" }}>
        <span>{label}</span>
        <span className="spacer" />
        <span className="muted">{value}</span>
      </div>
      <div className={`bar ${bar}`}>
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function barClass(percent: number): string {
  if (percent < 25) return "bar--bad";
  if (percent < 50) return "bar--warn";
  return "bar--good";
}
