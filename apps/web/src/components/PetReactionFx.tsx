import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { PetReaction } from "../domain/petReactions";
import { EmojiIcon } from "./EmojiIcon";

// ふわっと舞い上がる絵文字の数。多すぎると画面がうるさいので控えめに。
const PARTICLE_COUNT = 7;

interface Particle {
  emoji: string;
  x: number; // 左右の散らばり (px)
  rot: number; // 終端の回転 (deg)
  size: number; // px
  delay: number; // s
  key: number;
}

export interface PetReactionFxProps {
  reaction: PetReaction;
  /** リアクションごとに変わる値。これが変わると粒子配置を作り直す */
  fxKey: number;
}

/**
 * モンスターを「なでた」ときの演出。
 * - 上部に吹き出しコメント
 * - 中心から ハート / 星 / 音符 などの絵文字が ふわっと 舞い上がる
 *
 * `.monster-stage`（position: relative）の中に重ねて使う。
 */
export function PetReactionFx({ reaction, fxKey }: PetReactionFxProps) {
  // fxKey ごとに粒子の散らばり・サイズ・遅延をランダム生成する。
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      emoji: reaction.emojis[i % reaction.emojis.length]!,
      x: (Math.random() * 2 - 1) * 78,
      rot: (Math.random() * 2 - 1) * 36,
      size: 24 + Math.round(Math.random() * 18),
      delay: Math.random() * 0.22,
      key: i,
    }));
    // reaction.emojis は fxKey と一緒に変わるので fxKey だけ依存にする。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fxKey]);

  return (
    <div className="pet-fx" aria-hidden>
      <div className={`pet-bubble pet-bubble--${reaction.variant}`}>
        {reaction.comment}
      </div>
      <div className="pet-particles">
        {particles.map((p) => {
          const style = {
            "--pet-x": `${p.x}px`,
            "--pet-rot": `${p.rot}deg`,
            animationDelay: `${p.delay}s`,
          } as CSSProperties;
          return (
            <span className="pet-particle" style={style} key={p.key}>
              <EmojiIcon emoji={p.emoji} size={p.size} alt="" />
            </span>
          );
        })}
      </div>
    </div>
  );
}
