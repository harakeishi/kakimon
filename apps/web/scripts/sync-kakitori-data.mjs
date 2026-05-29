#!/usr/bin/env node
// kakitori が必要とする 2 種類のデータを public/ に同期する。
// - hanzi-writer-data-jp: 文字の SVG ストロークデータ
// - kakitori-data: ストローク終端 (tome/hane/harai) と stroke groups の設定
//
// kakitori のデフォルトローダは unpkg から取りに行くため、オフライン (PWA)
// では動かない。これをローカル静的ファイルに置き換える。
//
// 現状はひらがな清音 + 数字 0-9 + 「ん」「を」を同期する。
// 漢字プラグインを足すときに対象セットを拡張する。

import { copyFile, mkdir, readdir, realpath, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const publicRoot = join(webRoot, "public", "kakitori");

const HIRAGANA = [
  "あ","い","う","え","お",
  "か","き","く","け","こ",
  "さ","し","す","せ","そ",
  "た","ち","つ","て","と",
  "な","に","ぬ","ね","の",
  "は","ひ","ふ","へ","ほ",
  "ま","み","む","め","も",
  "や","ゆ","よ",
  "ら","り","る","れ","ろ",
  "わ","を","ん",
];
const DIGITS = ["0","1","2","3","4","5","6","7","8","9"];
const CHARSET = [...new Set([...HIRAGANA, ...DIGITS])];

// データパッケージは `exports` を限定しているため Node の解決経由では辿れない。
// 代わりにシンボリックリンク `node_modules/<name>` を realpath で辿る。
async function resolvePackageRoot(name) {
  const link = join(webRoot, "node_modules", name);
  return await realpath(link);
}

const charDataDir = await resolvePackageRoot("@k1low/hanzi-writer-data-jp");
const configDir = join(
  await resolvePackageRoot("@k1low/kakitori-data"),
  "data"
);

await rm(publicRoot, { recursive: true, force: true });
await mkdir(join(publicRoot, "chars"), { recursive: true });
await mkdir(join(publicRoot, "config"), { recursive: true });

const charsAvailable = new Set(
  (await readdir(charDataDir)).filter((f) => f.endsWith(".json"))
);
const configsAvailable = new Set(
  (await readdir(configDir)).filter((f) => f.endsWith(".json"))
);

const stats = { chars: 0, configs: 0, missing: [] };

for (const ch of CHARSET) {
  const file = `${ch}.json`;
  if (charsAvailable.has(file)) {
    await copyFile(
      join(charDataDir, file),
      join(publicRoot, "chars", file)
    );
    stats.chars++;
  } else {
    stats.missing.push(`chars:${ch}`);
  }
  if (configsAvailable.has(file)) {
    await copyFile(
      join(configDir, file),
      join(publicRoot, "config", file)
    );
    stats.configs++;
  } else {
    stats.missing.push(`config:${ch}`);
  }
}

console.log(
  `[sync-kakitori-data] chars: ${stats.chars}, configs: ${stats.configs}, missing: ${stats.missing.length}`
);
if (stats.missing.length > 0) {
  console.warn(
    `  missing entries: ${stats.missing.slice(0, 10).join(", ")}${
      stats.missing.length > 10 ? "…" : ""
    }`
  );
}
console.log(`  output: ${relative(webRoot, publicRoot)}/`);
