import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useGameStore } from "../../state/gameStore";
import { FOODS } from "../../domain/catalog/foods";
import { countOf } from "../../domain/inventory";
import type { Monster } from "../../domain/monster";
import { isEgg, needsNaming } from "../../domain/monster";
import { EmojiIcon } from "../../components/EmojiIcon";
import { MonsterSprite } from "../../components/MonsterSprite";
import { PetReactionFx } from "../../components/PetReactionFx";
import { pickPetReaction, type PetReaction } from "../../domain/petReactions";
import { NameMonsterModal } from "./NameMonsterModal";

const LIFE_STATE_LABELS: Record<Monster["lifeState"], string> = {
  healthy: "げんき",
  weak: "ちょっと よわってる",
  sick: "ぐあいが わるい",
  dying: "あぶないよ！",
  deceased: "おやすみちゅう",
};

export function HomeScreen() {
  const monster = useGameStore((s) => s.monster);
  const wallet = useGameStore((s) => s.wallet);
  const inventory = useGameStore((s) => s.inventory);
  const petMonster = useGameStore((s) => s.petMonster);
  const feedWith = useGameStore((s) => s.feedWith);
  const rebirth = useGameStore((s) => s.rebirth);
  const nameMonster = useGameStore((s) => s.nameMonster);
  const [confirmRebirth, setConfirmRebirth] = useState(false);
  const [showFarewell, setShowFarewell] = useState(false);
  // 「ごはんを たべている」演出用。クリックのたびに key を更新して
  // CSS アニメーションを最初から再生させる。
  const [feeding, setFeeding] = useState<{ icon: string; key: number } | null>(
    null
  );
  // 「なでた」ときの演出（吹き出し＋舞い上がる絵文字）。
  // なでるたびに key を更新し、ランダムなリアクションを選んで再生する。
  const [petFx, setPetFx] = useState<{
    reaction: PetReaction;
    key: number;
  } | null>(null);

  // なでる: 機嫌アップ（store）に加えて、ランダムなリアクション演出を出す。
  function handlePet() {
    setPetFx((prev) => ({
      reaction: pickPetReaction(prev?.reaction.id),
      key: Date.now(),
    }));
    void petMonster();
  }

  // ごはんをあげる: 在庫消費＆効果適用に加えて、たべる演出を出す。
  async function handleFeed(foodId: string, icon: string) {
    // 先に演出を出して即座に反応を返す（DB 書き込みを待たない）。
    setFeeding({ icon, key: Date.now() });
    const ok = await feedWith(foodId);
    if (!ok) setFeeding(null);
  }

  // 演出の終了でフラグを下ろす。prefers-reduced-motion などで
  // onAnimationEnd が発火しないケースに備え、タイマーでも必ず解除する。
  useEffect(() => {
    if (!feeding) return;
    const t = window.setTimeout(() => setFeeding(null), 1300);
    return () => window.clearTimeout(t);
  }, [feeding]);

  // なで演出も同様にタイマーで必ず解除する（吹き出しの表示時間に合わせる）。
  useEffect(() => {
    if (!petFx) return;
    const t = window.setTimeout(() => setPetFx(null), 1600);
    return () => window.clearTimeout(t);
  }, [petFx]);

  // 死亡を検知したら「お別れ」モーダルを 1 度だけ出す。
  useEffect(() => {
    if (monster?.lifeState === "deceased") {
      setShowFarewell(true);
    } else {
      setShowFarewell(false);
    }
  }, [monster?.id, monster?.lifeState]);

  const careNeeded = useMemo(() => {
    if (!monster) return false;
    if (isEgg(monster)) return false;
    return (
      monster.lifeState === "weak" ||
      monster.lifeState === "sick" ||
      monster.lifeState === "dying"
    );
  }, [monster]);

  if (!monster) return null;
  const isDeceased = monster.lifeState === "deceased";
  const egg = isEgg(monster);
  const naming = needsNaming(monster);
  const dying = monster.lifeState === "dying";

  const hungerBar = barClass(100 - monster.condition.hunger);
  const moodBar = barClass(monster.condition.mood);
  const hpRatio = monster.stats.maxHp
    ? Math.round((monster.stats.hp / monster.stats.maxHp) * 100)
    : 0;
  const hpBar = barClass(hpRatio);
  const displayName = monster.name || (egg ? "タマゴ" : "?");

  return (
    <>
      <header className="status-bar">
        <StatusCell label="HP" value={egg ? "—" : `${monster.stats.hp}/${monster.stats.maxHp}`} />
        <StatusCell label="レベル" value={egg ? "—" : `${monster.level}`} />
        <StatusCell label="つぎまで" value={egg ? "—" : `${monster.expToNext - monster.exp}`} />
        <StatusCell label="コイン" value={`${wallet.coins}`} />
      </header>

      {egg && (
        <div className="warn-banner sick">
          タマゴだよ。<strong>「べんきょう」</strong>すると ふかして うまれるよ！
        </div>
      )}

      {careNeeded && (
        <div className={`warn-banner${dying ? "" : " sick"}`}>
          {displayName} は {LIFE_STATE_LABELS[monster.lifeState]}。
          {dying ? " いますぐ おせわ してあげて！" : " おせわ してあげよう。"}
        </div>
      )}

      {isDeceased && (
        <div className="card center">
          <EmojiIcon emoji="🌸" size={64} alt="" />
          <h2 style={{ margin: "8px 0 4px" }}>
            {displayName} は おやすみちゅう
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            これまで ありがとう。
            <br />
            また あたらしい タマゴから はじめられるよ。
          </p>
          <button
            className="btn btn--big btn--block btn--success"
            onClick={() => setConfirmRebirth(true)}
          >
            <EmojiIcon emoji="🥚" size={28} alt="" />
            <span style={{ marginLeft: 8 }}>あたらしい タマゴで はじめる</span>
          </button>
          <p className="muted" style={{ fontSize: "0.8rem", marginBottom: 0 }}>
            コインと もちもの は そのまま のこるよ
          </p>
        </div>
      )}

      <section className="monster-stage">
        <div className="monster-state-badge">
          {egg ? "タマゴ" : LIFE_STATE_LABELS[monster.lifeState]}
        </div>
        <div
          className={`monster-art${feeding ? " monster-art--eating" : ""}${
            petFx ? " monster-art--petting" : ""
          }`}
          onClick={egg || isDeceased ? undefined : handlePet}
          role={egg || isDeceased ? undefined : "button"}
          aria-label={
            egg
              ? "タマゴ"
              : isDeceased
                ? `${displayName} は おやすみちゅう`
                : `${displayName} を なでる`
          }
          style={egg || isDeceased ? { cursor: "default" } : undefined}
        >
          <MonsterSprite monster={monster} size={160} animated />
        </div>
        {feeding && (
          <div
            className="feed-anim"
            key={feeding.key}
            aria-hidden
            onAnimationEnd={() => setFeeding(null)}
          >
            <EmojiIcon emoji={feeding.icon} size={64} alt="" />
          </div>
        )}
        {petFx && (
          <PetReactionFx
            key={petFx.key}
            reaction={petFx.reaction}
            fxKey={petFx.key}
          />
        )}
      </section>

      {/* 卵期は ふだんの UI を一切出さず「べんきょう」だけが目立つようにする */}
      {egg ? (
        <>
          <section className="card center">
            <h2 style={{ margin: 0 }}>もうすぐ うまれるよ</h2>
            <p className="muted" style={{ marginTop: 4 }}>
              はじめての べんきょうで タマゴが かえるよ
            </p>
          </section>
          <Link
            to="/study"
            className="btn btn--big btn--block btn--secondary"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <EmojiIcon emoji="📚" size={28} alt="" />
            <span>べんきょう を はじめる</span>
          </Link>
        </>
      ) : !isDeceased ? (
        <>
          <section className="card">
            <h2 style={{ margin: 0 }}>{displayName}</h2>
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

          {/* dying のときは「べんきょう」より「おせわ」優先 */}
          <section className={`actions-grid${dying ? "" : " actions-grid--4"}`}>
            {dying ? (
              <>
                <button
                  className="btn btn--big btn--secondary action-btn"
                  onClick={handlePet}
                >
                  <EmojiIcon emoji="🤗" size={28} alt="" />
                  <span>なでる</span>
                </button>
                <Link to="/shop" className="btn btn--big action-btn">
                  <EmojiIcon emoji="🛍" size={28} alt="" />
                  <span>ショップ</span>
                </Link>
                <Link to="/study" className="btn btn--big btn--ghost action-btn">
                  <EmojiIcon emoji="📚" size={28} alt="" />
                  <span>べんきょう</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/study" className="btn btn--big btn--secondary action-btn">
                  <EmojiIcon emoji="📚" size={28} alt="" />
                  <span>べんきょう</span>
                </Link>
                <Link to="/shop" className="btn btn--big action-btn">
                  <EmojiIcon emoji="🛍" size={28} alt="" />
                  <span>ショップ</span>
                </Link>
                <Link to="/closet" className="btn btn--big btn--ghost action-btn">
                  <EmojiIcon emoji="🎀" size={28} alt="" />
                  <span>きせかえ</span>
                </Link>
                <button
                  className="btn btn--big btn--ghost action-btn"
                  onClick={handlePet}
                >
                  <EmojiIcon emoji="🤗" size={28} alt="" />
                  <span>なでる</span>
                </button>
              </>
            )}
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
                      <EmojiIcon emoji={food.icon} size={36} alt="" />
                    </div>
                    <div>
                      <strong>{food.name}</strong>
                      <div className="muted">のこり {owned} こ</div>
                    </div>
                    <button
                      className="btn"
                      disabled={owned <= 0 || feeding !== null}
                      onClick={() => void handleFeed(food.id, food.icon)}
                    >
                      あげる
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      {/* 命名モーダル: 孵化済み・名前空のときに自動表示。閉じられない（必須）。 */}
      {naming && (
        <NameMonsterModal
          onSubmit={async (name) => {
            await nameMonster(name);
          }}
        />
      )}

      {/* お別れモーダル（deceased 初回検知時に 1 度だけ） */}
      {isDeceased && showFarewell && (
        <div
          className="modal-mask"
          onClick={() => setShowFarewell(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <EmojiIcon emoji="🌸" size={72} alt="" />
            <h2>{displayName} と おわかれ</h2>
            <p className="muted" style={{ marginBottom: 16 }}>
              いっしょに がんばった じかんを ありがとう。
              <br />
              {displayName} は ずっと ずかんに のこるよ。
            </p>
            <button
              className="btn btn--block btn--success"
              onClick={() => setShowFarewell(false)}
            >
              ありがとう
            </button>
          </div>
        </div>
      )}

      {confirmRebirth && (
        <div className="modal-mask" onClick={() => setConfirmRebirth(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <EmojiIcon emoji="🥚" size={64} alt="" />
            <h2>あたらしい タマゴで はじめる？</h2>
            <p className="muted">
              {displayName} は ずかんに のこるよ。
            </p>
            <div className="row" style={{ marginTop: 16, gap: 10 }}>
              <button
                className="btn btn--ghost btn--block"
                onClick={() => setConfirmRebirth(false)}
              >
                やめる
              </button>
              <button
                className="btn btn--block btn--success"
                onClick={() => {
                  setConfirmRebirth(false);
                  void rebirth();
                }}
              >
                はじめる
              </button>
            </div>
          </div>
        </div>
      )}
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
