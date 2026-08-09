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

  // きせかえ（装備）
  // あたま
  "1F9E2", // 🧢 billed cap
  "1F452", // 👒 woman's hat (麦わら帽子)
  "1F3A9", // 🎩 top hat
  "1F393", // 🎓 graduation cap
  "1F451", // 👑 crown
  // アクセサリ
  "1F453", // 👓 glasses
  "1F576", // 🕶 sunglasses
  "1F380", // 🎀 ribbon
  "1F48D", // 💍 ring
  "1F484", // 💄 lipstick
  // ふく
  "1F455", // 👕 t-shirt
  "1F454", // 👔 necktie
  "1F9E3", // 🧣 scarf
  "1F457", // 👗 dress
  "1F97C", // 🥼 lab coat
  "1F9F8", // 🧸 teddy bear

  // へやのもようがえ
  "1F6CB", // 🛋 couch and lamp (へやタブ)
  // かべがみ
  "1F7E8", // 🟨 yellow square
  "1F7E6", // 🟦 blue square
  "1F30C", // 🌌 milky way (よぞら)
  // ゆか
  "1F7EB", // 🟫 brown square (きの ゆか)
  "1F331", // 🌱 seedling (くさ)
  "1F7E9", // 🟩 green square (たたみ)
  "1F7E5", // 🟥 red square (カーペット)
  // かぐ
  "1FAB4", // 🪴 potted plant
  "1FA91", // 🪑 chair
  "1F570", // 🕰 mantelpiece clock
  "1FA94", // 🪔 diya lamp
  "1F388", // 🎈 balloon
  "1F335", // 🌵 cactus

  // こっきクイズ（@kakimon/plugin-quiz-flag）の「ひよこが たのしんでいる もの」。
  // packages/plugin-quiz-flag/src/countries.ts の items / wear と対応する。
  // 追加・変更したらここも更新すること（漏れた場合はネイティブ絵文字へ
  // フォールバックするだけで壊れはしない）。
  "1F363", // 🍣 sushi (JP)
  "1F5FB", // 🗻 mount fuji (JP)
  "1F372", // 🍲 pot of food (KR)
  "1F3A4", // 🎤 microphone (KR)
  "1F43C", // 🐼 panda (CN)
  "1F95F", // 🥟 dumpling (CN)
  "1F35B", // 🍛 curry rice (IN)
  "1F405", // 🐅 tiger (IN)
  "1F418", // 🐘 elephant (TH)
  "1F364", // 🍤 fried shrimp (TH)
  "1F35C", // 🍜 steaming bowl (VN)
  "1F30B", // 🌋 volcano (ID)
  "1F9A7", // 🦧 orangutan (ID)
  "1F959", // 🥙 stuffed flatbread (TR)
  "1F355", // 🍕 pizza (IT)
  "1F35D", // 🍝 spaghetti (IT)
  "1F950", // 🥐 croissant (FR)
  "1F956", // 🥖 baguette bread (FR)
  "1F968", // 🥨 pretzel (DE)
  "1F697", // 🚗 automobile (DE)
  "1FAD6", // 🫖 teapot (GB)
  "1F958", // 🥘 shallow pan of food (ES)
  "1F483", // 💃 woman dancing (ES)
  "1F9C0", // 🧀 cheese wedge (CH)
  "1F3D4", // 🏔 snow-capped mountain (CH)
  "1F337", // 🌷 tulip (NL)
  "1F6B2", // 🚲 bicycle (NL)
  "1F3DB", // 🏛 classical building (GR)
  "1FAD2", // 🫒 olive (GR)
  "1F98C", // 🦌 deer (SE)
  "1F332", // 🌲 evergreen tree (SE)
  "1F41F", // 🐟 fish (NO)
  "2744",  // ❄️ snowflake (NO)
  "1FA86", // 🪆 nesting dolls (RU)
  "1F43B", // 🐻 bear (RU)
  "1F354", // 🍔 hamburger (US)
  "1F5FD", // 🗽 statue of liberty (US)
  "1F341", // 🍁 maple leaf (CA)
  "1F3D2", // 🏒 ice hockey (CA)
  "1F32E", // 🌮 taco (MX)
  "26BD",  // ⚽ soccer ball (BR / NG)
  "1F99C", // 🦜 parrot (BR)
  "1F969", // 🥩 cut of meat (AR)
  "1F57A", // 🕺 man dancing (AR)
  "1F999", // 🦙 llama (PE)
  "1F954", // 🥔 potato (PE)
  "1F5FF", // 🗿 moai (CL)
  "1F347", // 🍇 grapes (CL)
  "1F42B", // 🐫 two-hump camel (EG)
  "1F408", // 🐈 cat (EG)
  "1F981", // 🦁 lion (KE)
  "1F992", // 🦒 giraffe (KE)
  "1F993", // 🦓 zebra (ZA)
  "1F48E", // 💎 gem stone (ZA)
  "1F941", // 🥁 drum (NG)
  "1F54C", // 🕌 mosque (MA)
  "1F42A", // 🐪 camel (MA)
  "2615",  // ☕ hot beverage (ET)
  "1F3C3", // 🏃 person running (ET)
  "1F412", // 🐒 monkey (MG)
  "1F334", // 🌴 palm tree (MG)
  "1F998", // 🦘 kangaroo (AU)
  "1F428", // 🐨 koala (AU)
  "1F411", // 🐑 ewe (NZ)
  "1F95D", // 🥝 kiwi fruit (NZ)
];

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
