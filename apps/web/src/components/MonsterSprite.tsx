import type { Monster, MonsterStage } from "../domain/monster";
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

export interface MonsterSpriteProps {
  monster: Pick<Monster, "stage" | "lifeState" | "name">;
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
  return (
    <EmojiIcon
      emoji={STAGE_EMOJI[monster.stage]}
      size={size}
      alt={monster.name || "タマゴ"}
      className={cls}
    />
  );
}
