// きせかえアイテムをモンスタースプライトのどこに・どの大きさで重ねるかを計算する
// 純粋ロジック（React 非依存）。MonsterSprite から使う。
//
// 考え方:
// 1. 絵文字画像は外周の余白量がアイテムごとにバラバラなので、名目サイズ（img の
//    箱）ではなく「実際に絵が描かれている範囲」（CONTENT_BBOX）を基準に合わせる。
// 2. モンスターは段階ごとに姿勢が全く違う（ひよこは正面、トカゲは横向き、
//    ドラゴンは頭が右上）ので、段階ごとに「頭の上」「目」「首」「手」などの
//    部位座標（STAGE_ANCHORS）を持ち、アイテム側は「どの部位に着けるか」
//    （WearZone）だけを宣言する。
// 3. 大きさは「頭の幅」「胴の幅」を基準にした倍率で決め、段階が変わっても
//    帽子が頭に収まるようにする。

import type { MonsterStage } from "../domain/monster";
import type { WearSpec, WearZone } from "../domain/catalog/cosmetics";

export interface ContentBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cx: number;
  cy: number;
}

// 各絵文字の「実際に絵が描かれている範囲」（OpenMoji 17.0.0 の正方形キャンバスを
// 0..1 に正規化）。scripts/measure-emoji-bbox.mjs で各 SVG をラスタライズし、
// 不透明ピクセルの範囲を測って算出している（アセット更新時は測り直す）。
export const CONTENT_BBOX: Record<string, ContentBox> = {
  // モンスター段階（ベース）
  "1F423": { left: 0.118, right: 0.872, top: 0.122, bottom: 0.903, cx: 0.495, cy: 0.512 }, // 🐣 baby
  "1F98E": { left: 0.035, right: 0.958, top: 0.42, bottom: 0.757, cx: 0.497, cy: 0.589 }, // 🦎 child
  "1F432": { left: 0.153, right: 0.847, top: 0.139, bottom: 0.847, cx: 0.5, cy: 0.493 }, // 🐲 teen
  "1F409": { left: 0.125, right: 0.889, top: 0.052, bottom: 0.913, cx: 0.507, cy: 0.483 }, // 🐉 adult
  // あたま
  "1F9E2": { left: 0.118, right: 0.833, top: 0.198, bottom: 0.75, cx: 0.476, cy: 0.474 }, // 🧢
  "1F452": { left: 0.118, right: 0.885, top: 0.274, bottom: 0.663, cx: 0.502, cy: 0.469 }, // 👒
  "1F3A9": { left: 0.049, right: 0.965, top: 0.083, bottom: 0.816, cx: 0.507, cy: 0.45 }, // 🎩
  "1F393": { left: 0.042, right: 0.958, top: 0.264, bottom: 0.653, cx: 0.5, cy: 0.458 }, // 🎓
  "1F451": { left: 0.042, right: 0.958, top: 0.139, bottom: 0.833, cx: 0.5, cy: 0.486 }, // 👑
  "26D1": { left: 0.097, right: 0.899, top: 0.09, bottom: 0.903, cx: 0.498, cy: 0.497 }, // ⛑
  "1FA96": { left: 0.128, right: 0.872, top: 0.083, bottom: 0.84, cx: 0.5, cy: 0.462 }, // 🪖
  "1F3A7": { left: 0.108, right: 0.892, top: 0.083, bottom: 0.885, cx: 0.5, cy: 0.484 }, // 🎧
  "1F344": { left: 0.139, right: 0.861, top: 0.135, bottom: 0.795, cx: 0.5, cy: 0.465 }, // 🍄
  "1F33B": { left: 0.201, right: 0.833, top: 0.104, bottom: 0.872, cx: 0.517, cy: 0.488 }, // 🌻
  "1F353": { left: 0.208, right: 0.795, top: 0.191, bottom: 0.837, cx: 0.502, cy: 0.514 }, // 🍓
  "1F383": { left: 0.08, right: 0.92, top: 0.028, bottom: 0.861, cx: 0.5, cy: 0.444 }, // 🎃
  "1F384": { left: 0.226, right: 0.774, top: 0.049, bottom: 0.948, cx: 0.5, cy: 0.498 }, // 🎄
  "1F366": { left: 0.222, right: 0.778, top: 0.052, bottom: 0.944, cx: 0.5, cy: 0.498 }, // 🍦
  "1F9C1": { left: 0.153, right: 0.851, top: 0.056, bottom: 0.944, cx: 0.502, cy: 0.5 }, // 🧁
  // アクセサリ
  "1F453": { left: 0.052, right: 0.99, top: 0.26, bottom: 0.67, cx: 0.521, cy: 0.465 }, // 👓
  "1F576": { left: 0.031, right: 0.972, top: 0.247, bottom: 0.656, cx: 0.502, cy: 0.451 }, // 🕶
  "1F97D": { left: 0.056, right: 0.941, top: 0.323, bottom: 0.698, cx: 0.498, cy: 0.51 }, // 🥽
  "1F380": { left: 0.076, right: 0.903, top: 0.201, bottom: 0.899, cx: 0.49, cy: 0.55 }, // 🎀
  "1F338": { left: 0.177, right: 0.795, top: 0.132, bottom: 0.913, cx: 0.486, cy: 0.523 }, // 🌸
  "1F340": { left: 0.288, right: 0.795, top: 0.108, bottom: 0.872, cx: 0.542, cy: 0.49 }, // 🍀
  "1F98B": { left: 0.049, right: 0.951, top: 0.146, bottom: 0.778, cx: 0.5, cy: 0.462 }, // 🦋
  "1F41D": { left: 0.066, right: 0.934, top: 0.212, bottom: 0.788, cx: 0.5, cy: 0.5 }, // 🐝
  "1F4FF": { left: 0.16, right: 0.861, top: 0.069, bottom: 0.931, cx: 0.51, cy: 0.5 }, // 📿
  "1F3C5": { left: 0.167, right: 0.833, top: 0.038, bottom: 0.958, cx: 0.5, cy: 0.498 }, // 🏅
  "1F947": { left: 0.167, right: 0.833, top: 0.038, bottom: 0.958, cx: 0.5, cy: 0.498 }, // 🥇
  "1F48E": { left: 0.038, right: 0.958, top: 0.149, bottom: 0.906, cx: 0.498, cy: 0.528 }, // 💎
  "2B50": { left: 0.115, right: 0.885, top: 0.132, bottom: 0.865, cx: 0.5, cy: 0.498 }, // ⭐
  "1F48D": { left: 0.229, right: 0.816, top: 0.149, bottom: 0.861, cx: 0.523, cy: 0.505 }, // 💍
  "1F392": { left: 0.208, right: 0.792, top: 0.042, bottom: 0.917, cx: 0.5, cy: 0.479 }, // 🎒
  "1FABD": { left: 0.219, right: 0.781, top: 0.149, bottom: 0.851, cx: 0.5, cy: 0.5 }, // 🪽
  // ふく
  "1F455": { left: 0.097, right: 0.903, top: 0.087, bottom: 0.792, cx: 0.5, cy: 0.439 }, // 👕
  "1F454": { left: 0.125, right: 0.851, top: 0.083, bottom: 0.899, cx: 0.488, cy: 0.491 }, // 👔
  "1F9E3": { left: 0.17, right: 0.83, top: 0.139, bottom: 0.865, cx: 0.5, cy: 0.502 }, // 🧣
  "1F457": { left: 0.208, right: 0.792, top: 0.042, bottom: 0.958, cx: 0.5, cy: 0.5 }, // 👗
  "1F97C": { left: 0.167, right: 0.83, top: 0.073, bottom: 0.927, cx: 0.498, cy: 0.5 }, // 🥼
  "1F9BA": { left: 0.208, right: 0.799, top: 0.042, bottom: 0.958, cx: 0.503, cy: 0.5 }, // 🦺
  "1F45A": { left: 0.104, right: 0.91, top: 0.222, bottom: 0.861, cx: 0.507, cy: 0.542 }, // 👚
  "1F9E5": { left: 0.222, right: 0.778, top: 0.097, bottom: 0.847, cx: 0.5, cy: 0.472 }, // 🧥
  "1F458": { left: 0.087, right: 0.91, top: 0.142, bottom: 0.851, cx: 0.498, cy: 0.497 }, // 👘
  "1FA71": { left: 0.264, right: 0.726, top: 0.045, bottom: 0.972, cx: 0.495, cy: 0.509 }, // 🩱
  "1F94B": { left: 0.118, right: 0.882, top: 0.083, bottom: 0.917, cx: 0.5, cy: 0.5 }, // 🥋
  "1F3BD": { left: 0.191, right: 0.778, top: 0.056, bottom: 0.944, cx: 0.484, cy: 0.5 }, // 🎽
  "1F97B": { left: 0.26, right: 0.74, top: 0.056, bottom: 0.944, cx: 0.5, cy: 0.5 }, // 🥻
  // てもち
  "270F": { left: 0.149, right: 0.858, top: 0.128, bottom: 0.84, cx: 0.503, cy: 0.484 }, // ✏
  "1F58D": { left: 0.153, right: 0.875, top: 0.122, bottom: 0.844, cx: 0.514, cy: 0.483 }, // 🖍
  "1FA84": { left: 0.208, right: 0.844, top: 0.087, bottom: 0.792, cx: 0.526, cy: 0.439 }, // 🪄
  "1F388": { left: 0.233, right: 0.958, top: 0.042, bottom: 0.92, cx: 0.595, cy: 0.481 }, // 🎈
  "2602": { left: 0.042, right: 0.944, top: 0.042, bottom: 0.958, cx: 0.493, cy: 0.5 }, // ☂
  "1F36D": { left: 0.149, right: 0.858, top: 0.153, bottom: 0.858, cx: 0.503, cy: 0.505 }, // 🍭
  "1F3B8": { left: 0.149, right: 0.851, top: 0.184, bottom: 0.837, cx: 0.5, cy: 0.51 }, // 🎸
  "1F3BB": { left: 0.139, right: 0.903, top: 0.115, bottom: 0.868, cx: 0.521, cy: 0.491 }, // 🎻
  "1F3A4": { left: 0.156, right: 0.788, top: 0.149, bottom: 0.837, cx: 0.472, cy: 0.493 }, // 🎤
  "1F52E": { left: 0.177, right: 0.823, top: 0.132, bottom: 0.868, cx: 0.5, cy: 0.5 }, // 🔮
  "1F4F7": { left: 0.153, right: 0.851, top: 0.222, bottom: 0.74, cx: 0.502, cy: 0.481 }, // 📷
  "1F3C0": { left: 0.083, right: 0.917, top: 0.083, bottom: 0.917, cx: 0.5, cy: 0.5 }, // 🏀
  "26BE": { left: 0.083, right: 0.917, top: 0.08, bottom: 0.917, cx: 0.5, cy: 0.498 }, // ⚾
  "26BD": { left: 0.083, right: 0.917, top: 0.083, bottom: 0.917, cx: 0.5, cy: 0.5 }, // ⚽
  "1F3BE": { left: 0.083, right: 0.917, top: 0.083, bottom: 0.917, cx: 0.5, cy: 0.5 }, // 🎾
  "1FA80": { left: 0.139, right: 0.885, top: 0.128, bottom: 0.833, cx: 0.512, cy: 0.481 }, // 🪀
  "1F9F8": { left: 0.139, right: 0.861, top: 0.056, bottom: 0.861, cx: 0.5, cy: 0.458 }, // 🧸
  "1F9E4": { left: 0.118, right: 0.882, top: 0.219, bottom: 0.781, cx: 0.5, cy: 0.5 }, // 🧤
  "1FAAD": { left: 0.069, right: 0.941, top: 0.264, bottom: 0.74, cx: 0.505, cy: 0.502 }, // 🪭
};

// 未計測の絵文字用。OpenMoji は概ね外周 1 割が余白。
const DEFAULT_BBOX: ContentBox = {
  left: 0.1,
  right: 0.9,
  top: 0.1,
  bottom: 0.9,
  cx: 0.5,
  cy: 0.5,
};

export function contentBoxOf(emoji: string): ContentBox {
  const cp = emoji.codePointAt(0)?.toString(16).toUpperCase();
  return (cp && CONTENT_BBOX[cp]) || DEFAULT_BBOX;
}

export interface Point {
  /** スプライト幅に対する比率 (0..1)。右が正。 */
  x: number;
  /** スプライト高さに対する比率 (0..1)。下が正。 */
  y: number;
}

/**
 * 段階ごとのモンスターの部位座標。すべてスプライト（正方形）の辺長を 1 とした比率。
 * - headTop: 帽子の「下端」を置く点（額のあたり。ここより上に帽子が乗る）
 * - eyes:    めがねの中心
 * - headSide: リボン・花かざりの中心（頭の右上）
 * - neck:    首元。ネクタイ・ネックレスの「上端」
 * - body:    胴。シャツなどの「上端」
 * - hand:    手に持つものの中心
 * - back:    背中（はね・リュックの中心。モンスターの後ろに描く）
 * - headW / bodyW: 頭・胴の幅。アイテムの大きさの基準。
 */
export interface StageAnchors {
  headTop: Point;
  eyes: Point;
  headSide: Point;
  neck: Point;
  body: Point;
  hand: Point;
  back: Point;
  headW: number;
  bodyW: number;
}

export type WearableStage = Exclude<MonsterStage, "egg">;

export const STAGE_ANCHORS: Record<WearableStage, StageAnchors> = {
  // 🐣 からをかぶった ひよこ。正面向き。頭は上半分、からが下半分。
  baby: {
    headTop: { x: 0.505, y: 0.29 },
    eyes: { x: 0.505, y: 0.375 },
    headSide: { x: 0.66, y: 0.29 },
    neck: { x: 0.505, y: 0.5 },
    body: { x: 0.505, y: 0.53 },
    hand: { x: 0.8, y: 0.6 },
    back: { x: 0.42, y: 0.46 },
    headW: 0.38,
    bodyW: 0.5,
  },
  // 🦎 横向きのトカゲ。頭は左端、胴は中央、しっぽは右。
  child: {
    headTop: { x: 0.15, y: 0.455 },
    eyes: { x: 0.165, y: 0.49 },
    headSide: { x: 0.22, y: 0.44 },
    neck: { x: 0.28, y: 0.52 },
    body: { x: 0.5, y: 0.53 },
    hand: { x: 0.27, y: 0.68 },
    back: { x: 0.45, y: 0.47 },
    headW: 0.2,
    bodyW: 0.38,
  },
  // 🐲 ドラゴンの顔だけ。正面向き。胴が無いので「ふく」は顎の下にのぞかせる。
  teen: {
    headTop: { x: 0.5, y: 0.3 },
    eyes: { x: 0.5, y: 0.415 },
    headSide: { x: 0.73, y: 0.3 },
    neck: { x: 0.5, y: 0.78 },
    body: { x: 0.5, y: 0.8 },
    hand: { x: 0.87, y: 0.62 },
    back: { x: 0.35, y: 0.45 },
    headW: 0.5,
    bodyW: 0.42,
  },
  // 🐉 全身のドラゴン。頭は右上、胴は中央、しっぽは左下。
  adult: {
    headTop: { x: 0.74, y: 0.28 },
    eyes: { x: 0.77, y: 0.34 },
    headSide: { x: 0.68, y: 0.28 },
    neck: { x: 0.64, y: 0.45 },
    body: { x: 0.52, y: 0.48 },
    hand: { x: 0.46, y: 0.68 },
    back: { x: 0.4, y: 0.4 },
    headW: 0.26,
    bodyW: 0.42,
  },
};

type Align = "top" | "center" | "bottom";

// ゾーンごとの既定値。
// - align: アイテムの中身のどこをアンカーに合わせるか
// - ref:   大きさの基準（頭幅 or 胴幅）
// - scale: 基準幅に対するアイテムの中身の幅
const ZONE_DEFAULTS: Record<
  WearZone,
  { align: Align; ref: "head" | "body"; scale: number }
> = {
  headTop: { align: "bottom", ref: "head", scale: 1.15 },
  eyes: { align: "center", ref: "head", scale: 0.95 },
  headSide: { align: "center", ref: "head", scale: 0.45 },
  neck: { align: "top", ref: "head", scale: 0.6 },
  body: { align: "top", ref: "body", scale: 1.0 },
  hand: { align: "center", ref: "head", scale: 0.6 },
  back: { align: "center", ref: "body", scale: 1.2 },
};

export interface LayerPlacement {
  /** スプライト左上からの px */
  left: number;
  top: number;
  /** アイテム画像（img の箱）の辺長 px */
  size: number;
  /** モンスターの後ろに描くか */
  behind: boolean;
}

/**
 * アイテム 1 つ分の配置を計算する。
 * @param stage  モンスターの段階（卵以外）
 * @param size   スプライトの辺長 px
 * @param icon   アイテムの絵文字
 * @param wear   アイテムの着用指定
 */
export function placeWearable(
  stage: WearableStage,
  size: number,
  icon: string,
  wear: WearSpec
): LayerPlacement {
  const anchors = STAGE_ANCHORS[stage];
  const zone = ZONE_DEFAULTS[wear.zone];
  const box = contentBoxOf(icon);

  const refW = zone.ref === "head" ? anchors.headW : anchors.bodyW;
  const contentW = zone.scale * (wear.scale ?? 1) * refW * size;
  const layerSize = contentW / Math.max(0.05, box.right - box.left);

  const anchor = anchors[wear.zone];
  const ax = (anchor.x + (wear.dx ?? 0) * anchors.headW) * size;
  const ay = (anchor.y + (wear.dy ?? 0) * anchors.headW) * size;

  const align = wear.align ?? zone.align;
  const alignFrac =
    align === "top" ? box.top : align === "bottom" ? box.bottom : box.cy;

  return {
    left: Math.round(ax - box.cx * layerSize),
    top: Math.round(ay - alignFrac * layerSize),
    size: Math.round(layerSize),
    behind: wear.zone === "back",
  };
}
