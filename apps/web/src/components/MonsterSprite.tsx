import type { CSSProperties } from "react";
import type { Monster, MonsterStage } from "../domain/monster";
import { findCosmetic, type EquipmentSlot } from "../domain/catalog/cosmetics";
import { EmojiIcon } from "./EmojiIcon";

// 段階ごとのモンスターの「種」を絵文字で表現。
// 後でカスタムスプライトに差し替えるときも、ここを変えるだけで完結する。
const STAGE_EMOJI: Record<MonsterStage, string> = {
  egg: "🥚",
  baby: "🐣",
  child: "🦎",
  teen: "🐲",
  adult: "🐉",
};

// きせかえアイテムを基準スプライトのどこに重ねるか。
// 値は sprite サイズに対する比率（top/left は中央 50% 基準のオフセット）。
const SLOT_LAYOUT: Record<
  EquipmentSlot,
  { top: number; scale: number; rotate?: number }
> = {
  head: { top: 0.02, scale: 0.5 }, // 頭の上
  accessory: { top: 0.34, scale: 0.42 }, // 顔まわり（めがね・リボン）
  body: { top: 0.58, scale: 0.46 }, // からだ
};

export interface MonsterSpriteProps {
  monster: Pick<Monster, "stage" | "lifeState" | "name"> &
    Partial<Pick<Monster, "equipped">>;
  size?: number;
  className?: string;
  /** 卵を揺らす演出を付けるか（ホーム画面のみ） */
  animated?: boolean;
}

export function MonsterSprite({
  monster,
  size = 128,
  className,
  animated = false,
}: MonsterSpriteProps) {
  if (monster.lifeState === "deceased") {
    return (
      <EmojiIcon
        emoji="🌸"
        size={size}
        alt={`${monster.name || "モンスター"} は おやすみちゅう`}
        className={className}
        style={{ opacity: 0.7 }}
      />
    );
  }
  const cls = [
    className,
    animated && monster.stage === "egg" ? "sprite--egg-wiggle" : null,
    animated && monster.lifeState === "dying" ? "sprite--dying" : null,
    animated && monster.lifeState === "sick" ? "sprite--sick" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const base = (
    <EmojiIcon
      emoji={STAGE_EMOJI[monster.stage]}
      size={size}
      alt={monster.name || "タマゴ"}
      className={cls}
    />
  );

  // 卵はきせかえしない。装備が無ければ従来どおりベースだけ返す。
  const layers =
    monster.stage === "egg" ? [] : cosmeticLayers(monster.equipped);
  if (layers.length === 0) return base;

  const wrapStyle: CSSProperties = {
    position: "relative",
    display: "inline-block",
    width: size,
    height: size,
    lineHeight: 0,
  };

  return (
    <span style={wrapStyle} className="monster-sprite-wrap">
      {base}
      {layers.map(({ slot, icon }) => {
        const layout = SLOT_LAYOUT[slot];
        const layerSize = Math.round(size * layout.scale);
        const style: CSSProperties = {
          position: "absolute",
          left: "50%",
          top: `${layout.top * 100}%`,
          transform: `translateX(-50%)${
            layout.rotate ? ` rotate(${layout.rotate}deg)` : ""
          }`,
          pointerEvents: "none",
        };
        return (
          <span key={slot} style={style} aria-hidden>
            <EmojiIcon emoji={icon} size={layerSize} alt="" />
          </span>
        );
      })}
    </span>
  );
}

/** 装備中スロットを描画順（からだ → あたま → アクセサリ）に並べてアイコンを引く。 */
function cosmeticLayers(
  equipped: Monster["equipped"] | undefined
): { slot: EquipmentSlot; icon: string }[] {
  if (!equipped) return [];
  const order: EquipmentSlot[] = ["body", "head", "accessory"];
  const out: { slot: EquipmentSlot; icon: string }[] = [];
  for (const slot of order) {
    const id = equipped[slot];
    if (!id) continue;
    const item = findCosmetic(id);
    if (item) out.push({ slot, icon: item.icon });
  }
  return out;
}
