// 3 歳児向けの学習プラグイン群。
// 共通のタップ式クイズエンジン（@kakimon/plugin-preschool-shared）の上に、
// 「なにを出題するか」だけを書いた小さなプラグインを並べている。
// 1 パッケージで複数プラグインを export する（registry 側で展開する）。

import type { ContentPlugin } from "@kakimon/plugin-api";
import { colorPlugin } from "./plugins/color";
import { shapePlugin } from "./plugins/shape";
import { countPlugin } from "./plugins/count";
import { animalPlugin, foodPlugin, vehiclePlugin } from "./plugins/things";
import { samePlugin } from "./plugins/same";
import { sizePlugin } from "./plugins/size";
import { hiraganaTouchPlugin } from "./plugins/hiragana";

export const preschoolPlugins: readonly ContentPlugin[] = [
  samePlugin,
  colorPlugin,
  shapePlugin,
  animalPlugin,
  foodPlugin,
  vehiclePlugin,
  countPlugin,
  sizePlugin,
  hiraganaTouchPlugin,
];

export {
  animalPlugin,
  colorPlugin,
  countPlugin,
  foodPlugin,
  hiraganaTouchPlugin,
  samePlugin,
  shapePlugin,
  sizePlugin,
  vehiclePlugin,
};
