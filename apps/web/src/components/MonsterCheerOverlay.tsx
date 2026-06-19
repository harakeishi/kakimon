import { useEffect, useRef, useState } from "react";
import type { Monster } from "../domain/monster";
import { MonsterSprite } from "./MonsterSprite";

// 書き取りが成功したときの「ほめ言葉」と、失敗したときの「はげまし」。
// 3 歳児が読めなくても、声に出して読んであげやすい短い言葉にする。
const PRAISE = [
  "すごい！",
  "じょうず！",
  "やったね！",
  "てんさい！",
  "はなまる！",
  "かんぺき！",
  "おみごと！",
];
const CHEER = [
  "つぎは がんばれ！",
  "もういちど！",
  "おしい！",
  "だいじょうぶ！",
  "いっしょに がんばろ！",
  "ファイト！",
];

export interface CheerReaction {
  correct: boolean;
  /** 同じ結果が連続しても演出を再生させるためのカウンタ */
  nonce: number;
}

export interface MonsterCheerOverlayProps {
  monster: Pick<Monster, "stage" | "lifeState" | "name">;
  reaction: CheerReaction | null;
}

interface Bubble {
  text: string;
  correct: boolean;
  nonce: number;
}

function pick(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * 学習画面の右下に、育てているモンスターをオーバーレイ表示する。
 * 1 問ごとの結果（reaction）に反応して、吹き出しで応援メッセージを出し、
 * 成功なら ぴょんと跳ね、失敗なら ぷるぷる 揺れる。
 */
export function MonsterCheerOverlay({
  monster,
  reaction,
}: MonsterCheerOverlayProps) {
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!reaction) return;
    const text = pick(reaction.correct ? PRAISE : CHEER);
    setBubble({ text, correct: reaction.correct, nonce: reaction.nonce });
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setBubble(null);
      hideTimer.current = null;
    }, 2400);
    // nonce が変わるたびに新しい応援を出す。reaction オブジェクト参照ではなく
    // nonce を依存にすることで、同じ correct 値が続いても再演出できる。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction?.nonce]);

  useEffect(
    () => () => {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    },
    []
  );

  // 死んでいるモンスターは応援しない（お墓の演出と矛盾するため非表示）。
  if (monster.lifeState === "deceased") return null;

  const artCls = bubble
    ? `cheer-overlay__art ${
        bubble.correct
          ? "cheer-overlay__art--happy"
          : "cheer-overlay__art--cheer"
      }`
    : "cheer-overlay__art";

  return (
    <div className="cheer-overlay" aria-live="polite">
      {bubble && (
        <div
          key={bubble.nonce}
          className={`cheer-bubble ${
            bubble.correct ? "" : "cheer-bubble--cheer"
          }`}
        >
          {bubble.text}
        </div>
      )}
      {/* key に nonce を使い、リアクションごとに要素を貼り替えて
          一発アニメーション（jump / wiggle）を確実に再生させる。 */}
      <div key={bubble?.nonce ?? "idle"} className={artCls}>
        <MonsterSprite monster={monster} size={84} />
      </div>
    </div>
  );
}
