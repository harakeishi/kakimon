#!/usr/bin/env node
// OpenMoji の SVG から、アプリで使う絵文字だけを public/emoji/ に同期する。
// OpenMoji (https://openmoji.org/) は CC BY-SA 4.0。クレジットは README に記載。
//
// 同期対象を増やすときは src/assets/emoji-codepoints.json を更新する。

import { copyFile, mkdir, realpath, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import codepointManifest from "../src/assets/emoji-codepoints.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const outDir = join(webRoot, "public", "emoji");

// アプリで実際に表示する絵文字のコードポイント (大文字16進)。
// 一覧は src/assets/emoji-codepoints.json に集約している（EmojiIcon と共有）。
const EMOJI_CODEPOINTS = Object.keys(codepointManifest).filter(
  (k) => !k.startsWith("_")
);

// こっきクイズで出題する国。国旗の絵文字は地域表示記号 2 文字の組み合わせなので、
// ISO 3166-1 alpha-2 から機械的に導出する。
// packages/plugin-quiz-flag/src/countries.ts の COUNTRIES と対応させること。
const FLAG_ISO_CODES = [
  "JP", "KR", "CN", "IN", "TH", "VN", "ID", "TR",
  "IT", "FR", "DE", "GB", "ES", "CH", "NL", "GR", "SE", "NO", "RU",
  "US", "CA", "MX", "BR", "AR", "PE", "CL",
  "EG", "KE", "ZA", "NG", "MA", "ET", "MG",
  "AU", "NZ",
];

const REGIONAL_INDICATOR_A = 0x1f1e6;

for (const iso of FLAG_ISO_CODES) {
  const name = [...iso]
    .map((c) =>
      (REGIONAL_INDICATOR_A + c.charCodeAt(0) - "A".charCodeAt(0))
        .toString(16)
        .toUpperCase()
    )
    .join("-");
  EMOJI_CODEPOINTS.push(name);
}

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
