// 書き取り問題（0〜100）に使う、数字の読みの純粋関数。
// TTS に直接数字を渡すと英語や異なる読みになる端末があるため、かなに変換する。
const ONES = [
  "ぜろ", "いち", "に", "さん", "よん",
  "ご", "ろく", "なな", "はち", "きゅう",
] as const;

export function numberToJapaneseReading(value: string): string {
  if (!/^(0|[1-9]\d{0,2})$/.test(value)) return value;
  const n = Number(value);
  if (n > 100) return value;
  if (n === 100) return "ひゃく";
  if (n < 10) return ONES[n]!;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const prefix = tens === 1 ? "" : ONES[tens]!;
  return `${prefix}じゅう${ones === 0 ? "" : ONES[ones]!}`;
}
