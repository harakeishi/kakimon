import type { CSSProperties } from "react";
import type { Monster, MonsterStage } from "../domain/monster";
import {
  findCosmetic,
  type EquipmentSlot,
  type WearSpec,
} from "../domain/catalog/cosmetics";
import { EmojiIcon } from "./EmojiIcon";
import { placeWearable, type WearableStage } from "./spriteLayout";

// 段階ごとのモンスターの「種」を絵文字で表現。
// 後でカスタムスプライトに差し替えるときも、ここを変えるだけで完結する。
const STAGE_EMOJI: Record<MonsterStage, string> = {
  egg: "🥚",
  baby: "🐣",
  child: "🦎",
  teen: "🐲",
  adult: "🐉",
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
  if (monster.stage === "egg") return base;
  const layers = cosmeticLayers(monster.equipped);
  if (layers.length === 0) return base;

  const wrapStyle: CSSProperties = {
    position: "relative",
    display: "inline-block",
    width: size,
    height: size,
    lineHeight: 0,
    // behind レイヤを z-index:-1 にしても、このラッパの外（ステージ背景など）
    // より下に潜らないよう、ここでスタッキングコンテキストを作る。
    isolation: "isolate",
  };

  const placed = layers.map(({ slot, icon, wear }) => ({
    slot,
    icon,
    ...placeWearable(monster.stage as WearableStage, size, icon, wear),
  }));
  const renderLayer = (l: (typeof placed)[number]) => {
    // ベース（モンスター）の img は position を持たない通常フローの要素なので、
    // DOM 順で前に置いただけでは absolute のレイヤが上に描かれてしまう。
    // 背中のアイテムは z-index:-1 で確実にモンスターの後ろへ回す。
    const style: CSSProperties = {
      position: "absolute",
      left: l.left,
      top: l.top,
      pointerEvents: "none",
      zIndex: l.behind ? -1 : undefined,
    };
    return (
      <span key={l.slot} style={style} aria-hidden>
        <EmojiIcon emoji={l.icon} size={l.size} alt="" />
      </span>
    );
  };

  return (
    <span style={wrapStyle} className="monster-sprite-wrap">
      {placed.filter((l) => l.behind).map(renderLayer)}
      {base}
      {placed.filter((l) => !l.behind).map(renderLayer)}
    </span>
  );
}

/**
 * 装備中スロットを描画順（からだ → あたま → アクセサリ → てもち）に並べて
 * アイコンと着用指定を引く。背中に着けるものは placeWearable が behind にする。
 */
function cosmeticLayers(
  equipped: Monster["equipped"] | undefined
): { slot: EquipmentSlot; icon: string; wear: WearSpec }[] {
  if (!equipped) return [];
  const order: EquipmentSlot[] = ["body", "head", "accessory", "hand"];
  const out: { slot: EquipmentSlot; icon: string; wear: WearSpec }[] = [];
  for (const slot of order) {
    const id = equipped[slot];
    if (!id) continue;
    const item = findCosmetic(id);
    if (item) out.push({ slot, icon: item.icon, wear: item.wear });
  }
  return out;
}
