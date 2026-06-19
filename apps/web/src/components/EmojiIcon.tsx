import { useState } from "react";

// scripts/sync-emoji.mjs と同期しているコードポイント一覧。
// これ以外を渡された場合は <img> ロード失敗 → テキストフォールバック。
const AVAILABLE = new Set<string>([
  "1F95A", "1F423", "1F98E", "1F432", "1F409", "1F338",
  "1F34E", "1F359", "1F370",
  "1F4DA", "1F6CD", "1F917", "1F389", "2B50", "1F31F", "1F4B0",
  // きせかえ（装備）
  "1F9E2", "1F452", "1F3A9", "1F393", "1F451", // あたま
  "1F453", "1F576", "1F380", "1F48D", "1F484", // アクセサリ
  "1F455", "1F454", "1F9E3", "1F457", "1F97C", "1F9F8", // ふく
  // へやのもようがえ（もよう・かべがみ・ゆか・かぐ）
  "1F6CB", // へやタブ
  "1F7E8", "1F7E6", "1F30C", // かべがみ
  "1F7EB", "1F331", "1F7E9", "1F7E5", // ゆか
  "1FAB4", "1FA91", "1F570", "1FA94", "1F388", "1F335", // かぐ
]);

function emojiToCodepoint(emoji: string): string | null {
  const cp = emoji.codePointAt(0);
  if (cp === undefined) return null;
  const hex = cp.toString(16).toUpperCase();
  // OpenMoji ファイル名は最低 4 桁の Unicode hex (例: 2B50, 1F95A)。
  // パディングを揃える必要はないがリポジトリのファイル名と合致させる。
  return hex;
}

export interface EmojiIconProps {
  /** 表示する絵文字 (実際の絵文字文字をそのまま渡す。例: "🥚") */
  emoji: string;
  /** 表示サイズ (number は px、文字列はそのまま CSS) */
  size?: number | string;
  /** スクリーンリーダー用テキスト。装飾用途なら空文字のままで OK */
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * OpenMoji の SVG を img として表示する小さなアイコン。
 * - SVG ファイルが同期されていない絵文字は、ネイティブ絵文字テキストへフォールバック。
 * - インライン表示できるよう display: inline-block + vertical-align: middle。
 */
export function EmojiIcon({
  emoji,
  size = "1.2em",
  alt = "",
  className,
  style,
}: EmojiIconProps) {
  const [failed, setFailed] = useState(false);
  const cp = emojiToCodepoint(emoji);
  const sizeStyle =
    typeof size === "number" ? `${size}px` : size;
  const commonStyle: React.CSSProperties = {
    display: "inline-block",
    verticalAlign: "middle",
    width: sizeStyle,
    height: sizeStyle,
    lineHeight: 1,
    fontSize: sizeStyle,
    ...style,
  };

  if (!cp || failed || !AVAILABLE.has(cp)) {
    return (
      <span
        className={className}
        style={commonStyle}
        role={alt ? undefined : "presentation"}
        aria-label={alt || undefined}
      >
        {emoji}
      </span>
    );
  }

  const src = `${import.meta.env.BASE_URL}emoji/${cp}.svg`;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={commonStyle}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
