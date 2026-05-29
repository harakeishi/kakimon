#!/usr/bin/env node
// OpenMoji の SVG から、アプリで使う絵文字だけを public/emoji/ に同期する。
// OpenMoji (https://openmoji.org/) は CC BY-SA 4.0。クレジットは README に記載。
//
// 同期対象を増やすときは EMOJI_CODEPOINTS を更新する。

import { copyFile, mkdir, realpath, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const outDir = join(webRoot, "public", "emoji");

// アプリで実際に表示する絵文字のコードポイント (大文字16進)
const EMOJI_CODEPOINTS = [
  // モンスター進化段階
  "1F95A", // 🥚 egg (stage: egg)
  "1F423", // 🐣 hatching chick (stage: baby)
  "1F98E", // 🦎 lizard (stage: child)
  "1F432", // 🐲 dragon face (stage: teen)
  "1F409", // 🐉 dragon (stage: adult)
  "1F338", // 🌸 cherry blossom (deceased)

  // ごはん
  "1F34E", // 🍎 red apple
  "1F359", // 🍙 rice ball / onigiri
  "1F370", // 🍰 shortcake

  // UI アクション
  "1F4DA", // 📚 books (study)
  "1F6CD", // 🛍 shopping bags (shop)
  "1F917", // 🤗 hugging face (pet)
  "1F389", // 🎉 party popper (result)
  "2B50",  // ⭐ star (level up)
  "1F31F", // 🌟 glowing star
  "1F4B0", // 💰 money bag (coin)

  // 装備 (Phase 2 で使う仮置きアセット)
  "1F451", // 👑 crown
  "1F484", // 💄 lipstick
  "1F9F8", // 🧸 teddy bear
];

const pkgRoot = await realpath(
  join(webRoot, "node_modules", "openmoji")
);
const svgDir = join(pkgRoot, "color", "svg");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const missing = [];
for (const code of EMOJI_CODEPOINTS) {
  const file = `${code}.svg`;
  try {
    await copyFile(join(svgDir, file), join(outDir, file));
  } catch (e) {
    if (e.code === "ENOENT") {
      missing.push(code);
    } else {
      throw e;
    }
  }
}

console.log(
  `[sync-emoji] copied ${EMOJI_CODEPOINTS.length - missing.length} svgs to ${relative(webRoot, outDir)}/`
);
if (missing.length > 0) {
  console.warn(`  missing: ${missing.join(", ")}`);
  process.exitCode = 1;
}
