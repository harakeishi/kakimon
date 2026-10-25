#!/usr/bin/env node
// 絵文字 SVG の「実際に絵が描かれている範囲」を測り、
// src/components/spriteLayout.ts の CONTENT_BBOX 用の行を出力する。
//
//   node scripts/measure-emoji-bbox.mjs 1F9E2 1F452 ...
//   node scripts/measure-emoji-bbox.mjs --all   # cosmetics.ts の全アイコン + モンスター
//
// ラスタライズに playwright（同梱 Chromium）を使う。devDependencies には含めて
// いないので、手元に無ければ `npx -p playwright node scripts/measure-emoji-bbox.mjs`
// のように一時的に入れて実行する。

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const svgDir = join(webRoot, "public", "emoji");

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "playwright が見つかりません。`npx -p playwright node scripts/measure-emoji-bbox.mjs ...` で実行してください。"
  );
  process.exit(1);
}

const args = process.argv.slice(2);
let codes = args.filter((a) => !a.startsWith("--"));
if (args.includes("--all")) {
  const src = await readFile(
    join(webRoot, "src", "domain", "catalog", "cosmetics.ts"),
    "utf8"
  );
  const icons = [...src.matchAll(/icon:\s*"([^"]+)"/g)].map((m) => m[1]);
  const stages = ["🐣", "🦎", "🐲", "🐉"];
  codes = [...new Set([...stages, ...icons])].map((e) =>
    e.codePointAt(0).toString(16).toUpperCase()
  );
}
if (codes.length === 0) {
  console.error("計測するコードポイントを指定してください（または --all）。");
  process.exit(1);
}

const N = 288; // 72px の 4 倍で描いて測る
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(`<canvas id="c" width="${N}" height="${N}"></canvas>`);
for (const code of codes) {
  const svg = await readFile(join(svgDir, `${code}.svg`), "utf8");
  const url =
    "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
  const box = await page.evaluate(
    async ([url, N]) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      const ctx = document.getElementById("c").getContext("2d");
      ctx.clearRect(0, 0, N, N);
      ctx.drawImage(img, 0, 0, N, N);
      const d = ctx.getImageData(0, 0, N, N).data;
      let minX = N, minY = N, maxX = -1, maxY = -1;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          if (d[(y * N + x) * 4 + 3] > 40) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const n = (v) => Math.round((v / N) * 1000) / 1000;
      return {
        left: n(minX), right: n(maxX + 1), top: n(minY), bottom: n(maxY + 1),
        cx: n((minX + maxX + 1) / 2), cy: n((minY + maxY + 1) / 2),
      };
    },
    [url, N]
  );
  const emoji = String.fromCodePoint(parseInt(code, 16));
  console.log(
    `  "${code}": { left: ${box.left}, right: ${box.right}, top: ${box.top}, bottom: ${box.bottom}, cx: ${box.cx}, cy: ${box.cy} }, // ${emoji}`
  );
}
await browser.close();
