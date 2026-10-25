import { EmojiIcon } from "./EmojiIcon";

/**
 * プラグインの manifest.icon を表示する。icon は絵文字（🎨 など）か短い文字
 * （"あ"・"1" など）。EmojiIcon は同期済みの絵文字だけ画像にし、それ以外は
 * 渡された文字をそのまま size px で出すので、どちらもこれ 1 つで扱える。
 */
export function PluginIcon({ icon, size }: { icon: string; size: number }) {
  return <EmojiIcon emoji={icon} size={size} alt="" />;
}
