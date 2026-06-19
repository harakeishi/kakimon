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

// 各絵文字の「実際に絵が描かれている範囲」（OpenMoji 17.0.0 の 72x72 内を 0..1 に
// 正規化）。emoji 画像は外周の余白量がアイテムごとにバラバラなので、名目サイズ
// （img の箱）ではなく中身のバウンディングボックスを基準に重ねないと、帽子が浮い
// たり顔を覆ったりして位置がズレる。値は各 SVG をラスタライズして不透明ピクセルの
// 範囲を測って算出している（アセット更新時は scripts で測り直す）。
const CONTENT_BBOX: Record<
  string,
  { top: number; bottom: number; cy: number }
> = {
  // モンスター段階（ベース）
  "1F423": { top: 0.12, bottom: 0.898, cy: 0.509 }, // 🐣 baby
  "1F98E": { top: 0.417, bottom: 0.75, cy: 0.583 }, // 🦎 child
  "1F432": { top: 0.139, bottom: 0.843, cy: 0.491 }, // 🐲 teen
  "1F409": { top: 0.056, bottom: 0.912, cy: 0.484 }, // 🐉 adult
  // あたま
  "1F9E2": { top: 0.194, bottom: 0.745, cy: 0.47 }, // 🧢
  "1F452": { top: 0.273, bottom: 0.657, cy: 0.465 }, // 👒
  "1F3A9": { top: 0.083, bottom: 0.81, cy: 0.447 }, // 🎩
  "1F393": { top: 0.264, bottom: 0.648, cy: 0.456 }, // 🎓
  "1F451": { top: 0.139, bottom: 0.829, cy: 0.484 }, // 👑
  // アクセサリ
  "1F453": { top: 0.259, bottom: 0.667, cy: 0.463 }, // 👓
  "1F576": { top: 0.245, bottom: 0.653, cy: 0.449 }, // 🕶
  "1F380": { top: 0.199, bottom: 0.894, cy: 0.546 }, // 🎀
  "1F48D": { top: 0.148, bottom: 0.856, cy: 0.502 }, // 💍
  // ふく
  "1F455": { top: 0.088, bottom: 0.787, cy: 0.438 }, // 👕
  "1F454": { top: 0.083, bottom: 0.898, cy: 0.491 }, // 👔
  "1F9E3": { top: 0.139, bottom: 0.861, cy: 0.5 }, // 🧣
  "1F457": { top: 0.042, bottom: 0.954, cy: 0.498 }, // 👗
  "1F97C": { top: 0.069, bottom: 0.921, cy: 0.495 }, // 🥼
};

const DEFAULT_BBOX = { top: 0, bottom: 1, cy: 0.5 };

function bboxOf(emoji: string): { top: number; bottom: number; cy: number } {
  const cp = emoji.codePointAt(0)?.toString(16).toUpperCase();
  return (cp && CONTENT_BBOX[cp]) || DEFAULT_BBOX;
}

// きせかえアイテムを基準スプライトのどこに重ねるか。
// - scale: sprite サイズに対するアイテム画像の比率。
// - anchor: ベース（モンスター）の「中身」の高さに対する基準位置（0=中身の上端,
//   1=下端）。ここにアイテムの align 点を合わせる。
// - align: アイテムの中身のどこを anchor に合わせるか
//   （帽子は下端を頭頂に、めがねは中心を目に、服は上端を首元に）。
const SLOT_LAYOUT: Record<
  EquipmentSlot,
  { scale: number; anchor: number; align: "top" | "center" | "bottom" }
> = {
  head: { scale: 0.46, anchor: 0.231, align: "bottom" }, // 頭の上に乗せる
  accessory: { scale: 0.4, anchor: 0.36, align: "center" }, // 目のあたり
  body: { scale: 0.46, anchor: 0.643, align: "top" }, // 首元〜からだ
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

  // ベース（モンスター）の中身の範囲。これを基準にアイテムを合わせる。
  const baseBox = bboxOf(STAGE_EMOJI[monster.stage]);
  const baseHeight = baseBox.bottom - baseBox.top;

  return (
    <span style={wrapStyle} className="monster-sprite-wrap">
      {base}
      {layers.map(({ slot, icon }) => {
        const layout = SLOT_LAYOUT[slot];
        const layerSize = Math.round(size * layout.scale);
        const box = bboxOf(icon);
        // anchor 点（sprite 上の px）に、アイテムの align 点を合わせる。
        const anchorY = (baseBox.top + layout.anchor * baseHeight) * size;
        const alignFrac =
          layout.align === "top"
            ? box.top
            : layout.align === "bottom"
            ? box.bottom
            : box.cy;
        const top = anchorY - alignFrac * layerSize;
        const style: CSSProperties = {
          position: "absolute",
          left: "50%",
          top,
          transform: "translateX(-50%)",
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
