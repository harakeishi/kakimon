// 「かきじゅんガイド」モードのオーバーレイ描画。
// 書き取り中の「いま書くべき 1 画」の始点・終点・方向を、kakitori
// (hanzi-writer) の SVG の上に重ねた別 SVG で視覚的にガイドする。
//
// 座標系について:
// hanzi-writer は文字データ (makemeahanzi 形式) をグリフ座標
// (x: 0..1024, y: -124..900、Y 軸は上向き) で持ち、mount 時に
//   translate(xOffset, height - yOffset) scale(scale, -scale)
// を <g> に適用して表示座標へ写像する。正方形セル (width = height = size)
// では
//   scale   = (size - 2 * padding) / 1024
//   xOffset = padding
//   yOffset = -HANZI_Y_MIN * scale + padding   (HANZI_Y_MIN = -124)
// となる。ここでは同じ式で medians (各画の中央線点列) を表示座標へ
// 変換してオーバーレイに描く。定数は kakitori が export しているものを使う。
import {
  DEFAULT_PADDING,
  HANZI_PRESCALED_SIZE,
  HANZI_Y_MIN,
} from "@k1low/kakitori";
import type { CharDataLoaderFn, ConfigLoaderFn } from "@k1low/kakitori";

/** charDataLoader が返す hanzi-writer-data 形式の文字データ。 */
export interface StrokeGuideCharData {
  strokes: string[];
  medians: number[][][];
}

export interface StrokeGuideOptions {
  /** kakitori mount() に渡す size と同じ値 (px)。 */
  size: number;
  /** kakitori mount() に渡す padding と同じ値。既定は kakitori と同じ 0。 */
  padding?: number;
}

export interface StrokeGuide {
  /** charDataLoader が取得した文字データを渡す (medians を使う)。 */
  setCharData(data: StrokeGuideCharData): void;
  /** configLoader が取得した strokeGroups を渡す (論理画 → データ画の対応)。 */
  setStrokeGroups(groups: number[][] | null): void;
  /** kakitori の mount() 後に呼ぶ。charHost 内の描画レイヤにオーバーレイを重ねる。 */
  attach(charHost: HTMLElement): void;
  /** ガイド対象の論理画インデックスを進める (onCorrectStroke の strokeNum + 1)。 */
  setStroke(index: number): void;
  /** ガイドを消す (onComplete 時)。 */
  hide(): void;
  /** オーバーレイを DOM から除去し、以降の描画を止める。 */
  destroy(): void;
}

const SVG_NS = "http://www.w3.org/2000/svg";

// ガイドの配色。drawingColor (#2563eb 青) / highlightColor (#fbbf24 黄) と
// 混同しないよう、緑系でまとめる。
const GUIDE_LINE_COLOR = "#34d399";
const GUIDE_LINE_OPACITY = "0.45";
const GUIDE_LINE_WIDTH = 10;
const START_DOT_COLOR = "#059669";
const ARROW_COLOR = "#059669";
const PARTICLE_GLOW_COLOR = "#6ee7b7";
const PARTICLE_CORE_COLOR = "#ffffff";

// グロー用 <filter> の id はページ内で一意にする (複数セル同時 mount 対策)。
let guideSeq = 0;

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function createStrokeGuide(options: StrokeGuideOptions): StrokeGuide {
  const size = options.size;
  const padding = options.padding ?? DEFAULT_PADDING;
  const scale = (size - 2 * padding) / HANZI_PRESCALED_SIZE;
  // hanzi-writer の translate Y 成分 (= height - yOffset)。
  const originY = size - padding + HANZI_Y_MIN * scale;

  let charData: StrokeGuideCharData | null = null;
  let strokeGroups: number[][] | null = null;
  let overlay: SVGSVGElement | null = null;
  let strokeIndex = 0;
  let hidden = false;
  let destroyed = false;
  const filterId = `ksg-glow-${++guideSeq}`;
  // OS の「視差効果を減らす」設定では光の粒アニメーションを出さない。
  // (CSS 側の .ksg-anim { display:none } も保険で効く)
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 現在の論理画の中央線を表示座標の点列にして返す。ガイド対象が無ければ null。
  function currentPoints(): Array<[number, number]> | null {
    if (!charData) return null;
    const medians = charData.medians;
    const logicalCount = strokeGroups?.length ?? medians.length;
    if (strokeIndex < 0 || strokeIndex >= logicalCount) return null;
    // strokeGroups がある文字 (例: あ の 3 画目 = データ画 [2,3]) は、
    // グループ内のデータ画の medians を連結して 1 本のガイドにする。
    const dataIndexes = strokeGroups?.[strokeIndex] ?? [strokeIndex];
    const pts: Array<[number, number]> = [];
    for (const di of dataIndexes) {
      const median = medians[di];
      if (!median) continue;
      for (const p of median) {
        const x = p[0];
        const y = p[1];
        if (x === undefined || y === undefined) continue;
        pts.push([
          round2(padding + x * scale),
          round2(originY - y * scale),
        ]);
      }
    }
    return pts.length > 0 ? pts : null;
  }

  function pathD(pts: Array<[number, number]>): string {
    return pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`)
      .join(" ");
  }

  function pathLength(pts: Array<[number, number]>): number {
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      len += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return len;
  }

  // 終点の進行方向 (deg)。終点直前のごく短いセグメントはノイズなので、
  // 終点から 4px 以上離れた点を遡って探す。
  function endAngleDeg(pts: Array<[number, number]>): number {
    const end = pts[pts.length - 1]!;
    for (let i = pts.length - 2; i >= 0; i--) {
      const p = pts[i]!;
      const dx = end[0] - p[0];
      const dy = end[1] - p[1];
      if (Math.hypot(dx, dy) >= 4) {
        return (Math.atan2(dy, dx) * 180) / Math.PI;
      }
    }
    return 0;
  }

  function render(): void {
    if (destroyed || !overlay) return;
    overlay.replaceChildren();
    if (hidden) return;
    const pts = currentPoints();
    if (!pts) return;
    const start = pts[0]!;
    const end = pts[pts.length - 1]!;
    const d = pathD(pts);

    if (pts.length >= 2) {
      // 中央線に沿った柔らかいガイド線
      overlay.appendChild(
        svgEl("path", {
          class: "ksg-line",
          d,
          fill: "none",
          stroke: GUIDE_LINE_COLOR,
          "stroke-opacity": GUIDE_LINE_OPACITY,
          "stroke-width": String(GUIDE_LINE_WIDTH),
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        })
      );
      // 終点側の矢印 (方向を明示)
      const angle = endAngleDeg(pts);
      overlay.appendChild(
        svgEl("path", {
          class: "ksg-arrow",
          d: "M11 0 L-5 7.5 L-1.5 0 L-5 -7.5 Z",
          fill: ARROW_COLOR,
          "fill-opacity": "0.9",
          transform: `translate(${end[0]} ${end[1]}) rotate(${round2(angle)})`,
        })
      );
    }

    // 始点マーカー (ここから書く)
    overlay.appendChild(
      svgEl("circle", {
        class: "ksg-start",
        cx: String(start[0]),
        cy: String(start[1]),
        r: "8",
        fill: START_DOT_COLOR,
        stroke: "#ffffff",
        "stroke-width": "2.5",
      })
    );

    // 始点→終点へ光の粒が流れるアニメーション (SMIL)
    if (!reduceMotion && pts.length >= 2) {
      const defs = svgEl("defs", {});
      const filter = svgEl("filter", {
        id: filterId,
        x: "-150%",
        y: "-150%",
        width: "400%",
        height: "400%",
      });
      filter.appendChild(
        svgEl("feGaussianBlur", { in: "SourceGraphic", stdDeviation: "3" })
      );
      defs.appendChild(filter);
      overlay.appendChild(defs);

      const particle = svgEl("g", { class: "ksg-anim" });
      particle.appendChild(
        svgEl("circle", {
          r: "8",
          fill: PARTICLE_GLOW_COLOR,
          "fill-opacity": "0.9",
          filter: `url(#${filterId})`,
        })
      );
      particle.appendChild(
        svgEl("circle", { r: "4", fill: PARTICLE_CORE_COLOR })
      );
      // 粒の速度が画の長さに依存しすぎないよう、所要時間をだいたい一定の
      // 範囲 (1.0〜2.6 秒) に収める。
      const dur = Math.min(2.6, Math.max(1.0, pathLength(pts) / 150));
      const motion = svgEl("animateMotion", {
        dur: `${round2(dur)}s`,
        repeatCount: "indefinite",
        path: d,
      });
      particle.appendChild(motion);
      overlay.appendChild(particle);
    }
  }

  return {
    setCharData(data) {
      if (destroyed) return;
      charData = data;
      render();
    },
    setStrokeGroups(groups) {
      if (destroyed) return;
      strokeGroups = groups;
      render();
    },
    attach(charHost) {
      if (destroyed) return;
      overlay?.remove();
      // kakitori の mount() は charHost 直下に position:relative の
      // レイヤ div を作り、その中に hanzi-writer SVG (z-index:1) と
      // グリッド SVG を重ねる。オーバーレイも同じレイヤに重ねる。
      // 万一レイヤが見つからない場合は charHost 自身に重ねる。
      let layer: HTMLElement = charHost;
      const child = charHost.firstElementChild;
      if (child instanceof HTMLElement) {
        layer = child;
      } else {
        charHost.style.position = "relative";
      }
      overlay = svgEl("svg", {
        class: "ksg-overlay",
        width: String(size),
        height: String(size),
        viewBox: `0 0 ${size} ${size}`,
        "aria-hidden": "true",
      });
      overlay.style.position = "absolute";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "2";
      layer.appendChild(overlay);
      render();
    },
    setStroke(index) {
      if (destroyed || index === strokeIndex) return;
      strokeIndex = index;
      render();
    },
    hide() {
      if (destroyed || hidden) return;
      hidden = true;
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      overlay?.remove();
      overlay = null;
      charData = null;
    },
  };
}

/** createStrokeGuide と組で使うローダのペア。 */
export interface GuideLoaderPair {
  charDataLoader: CharDataLoaderFn;
  configLoader: ConfigLoaderFn;
}

/**
 * 既存の charDataLoader / configLoader をラップし、取得したデータ
 * (medians / strokeGroups) をガイドにも横流しする。ガイドが null
 * (モード OFF) のときは元のローダをそのまま返し、挙動を一切変えない。
 */
export function wrapLoadersForGuide(
  guide: StrokeGuide | null,
  loaders: GuideLoaderPair
): GuideLoaderPair {
  if (!guide) return loaders;
  return {
    charDataLoader: (c, onLoad, onError) => {
      loaders.charDataLoader(
        c,
        (data) => {
          guide.setCharData(data);
          onLoad(data);
        },
        onError
      );
    },
    configLoader: async (c) => {
      const config = await loaders.configLoader(c);
      guide.setStrokeGroups(config?.strokeGroups ?? null);
      return config;
    },
  };
}
