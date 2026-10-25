// プラグイン共通の小さな DOM ヘルパー。

export function baseUrl(): string {
  const base =
    (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return base.endsWith("/") ? base : `${base}/`;
}

/**
 * 絵文字を OpenMoji のファイル名（コードポイントを - でつないだもの）へ変換する。
 * 異体字セレクタ (FE0F) はファイル名に含まれないので落とす。
 */
export function emojiCode(emoji: string): string {
  const parts: string[] = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0);
    if (cp === undefined || cp === 0xfe0f) continue;
    parts.push(cp.toString(16).toUpperCase().padStart(4, "0"));
  }
  return parts.join("-");
}

/**
 * OpenMoji の SVG を img で表示する。SVG が同期されていない場合は
 * ネイティブ絵文字のテキストへフォールバックする（apps/web の EmojiIcon と同じ方針）。
 */
export function emojiEl(emoji: string, px: number, alt = ""): HTMLElement {
  const img = document.createElement("img");
  img.src = `${baseUrl()}emoji/${emojiCode(emoji)}.svg`;
  img.alt = alt;
  img.width = px;
  img.height = px;
  img.draggable = false;
  img.style.width = `${px}px`;
  img.style.height = `${px}px`;
  img.addEventListener(
    "error",
    () => {
      const span = document.createElement("span");
      span.textContent = emoji;
      span.style.fontSize = `${px}px`;
      span.style.lineHeight = "1";
      if (alt) span.setAttribute("aria-label", alt);
      else span.setAttribute("aria-hidden", "true");
      img.replaceWith(span);
    },
    { once: true }
  );
  return img;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function shuffled<T>(source: readonly T[]): T[] {
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export function pickOne<T>(source: readonly T[]): T {
  return source[Math.floor(Math.random() * source.length)]!;
}

/**
 * pool から count 個を取り出す。pool が足りないときはシャッフルし直して
 * 使い回し、同じものが連続しないようにだけ気をつける（こっきクイズと同じ方針）。
 */
export function pickCycle<T>(
  pool: readonly T[],
  count: number,
  same: (a: T, b: T) => boolean = (a, b) => a === b
): T[] {
  const out: T[] = [];
  if (pool.length === 0) return out;
  while (out.length < count) {
    const batch = shuffled(pool);
    const prev = out[out.length - 1];
    if (prev && batch.length > 1 && same(batch[0]!, prev)) {
      const tmp = batch[0]!;
      batch[0] = batch[1]!;
      batch[1] = tmp;
    }
    for (const item of batch) {
      if (out.length >= count) break;
      out.push(item);
    }
  }
  return out;
}

/** 正解 1 つ + ダミー (n-1) 個を混ぜて返す。 */
export function withDistractors<T>(
  answer: T,
  pool: readonly T[],
  n: number,
  same: (a: T, b: T) => boolean = (a, b) => a === b
): T[] {
  const others = shuffled(pool.filter((x) => !same(x, answer)));
  return shuffled([answer, ...others.slice(0, Math.max(0, n - 1))]);
}
