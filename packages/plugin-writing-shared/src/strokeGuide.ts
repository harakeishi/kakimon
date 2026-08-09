// 「かきじゅんガイド」モードのオーバーレイ描画。
// 書き取り中の「いま書くべき 1 画」の始点・終点・方向を、kakitori
// (hanzi-writer) の SVG の上に重ねた別 SVG で視覚的にガイドする。
//
// 演出:
// - 書き始めの位置に「くるま」を置く。指を下ろしている間、くるまは中央線の
//   上を指に追随して走る (指の位置をいちばん近い線上の点へ射影する)。
//   指を離すと始点に戻って次のスタートを待つ。
// - 進む向きの矢印を中央線に沿って複数並べ、始点側から終点側へ順に点滅させる。
//   「どっちへ向かって書くか」を、線をなぞる前に目で追えるようにする。
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
// 混同しないよう、緑系でまとめる。くるまだけは「指で動かすもの」として
// 目立たせたいので赤系にする。
const GUIDE_LINE_COLOR = "#34d399";
const GUIDE_LINE_OPACITY = "0.45";
const GUIDE_LINE_WIDTH = 10;
const START_RING_COLOR = "#059669";
const ARROW_COLOR = "#059669";
const CAR_BODY_COLOR = "#ef4444";
const CAR_CABIN_COLOR = "#fca5a5";
const CAR_WHEEL_COLOR = "#1f2937";
const CAR_LIGHT_COLOR = "#fde68a";

// 矢印を並べる間隔 (px) と本数の上限。画が短いときは終点の 1 本だけになる。
const ARROW_SPACING = 62;
const ARROW_MAX = 5;
// 点滅 1 コマ分の間隔 (秒)。矢印は始点側から順にこの間隔でずれて光る。
const ARROW_BLINK_STEP = 0.34;
// 1 本が光り始めてから暗くなりきるまで (秒)。
const ARROW_BLINK_RISE = 0.12;
const ARROW_BLINK_FALL = 0.34;
// 全部光り終わってから次の周回までの間 (秒)。
const ARROW_BLINK_GAP = 0.6;
const ARROW_DIM_OPACITY = 0.2;
// くるまの向きをならすときの、前後のサンプル距離 (px)。
const CAR_HEADING_SAMPLE = 10;

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

/** 表示座標の点列を、弧長で引ける形に前処理したもの。 */
interface PathMetrics {
  pts: Array<[number, number]>;
  /** cum[i] = pts[0] から pts[i] までの長さ。 */
  cum: number[];
  total: number;
}

function measure(pts: Array<[number, number]>): PathMetrics {
  const cum: number[] = [0];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    cum.push(total);
  }
  return { pts, cum, total };
}

function segAngleDeg(
  a: [number, number],
  b: [number, number]
): number {
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
}

/** 弧長 len の位置の座標と進行方向 (deg)。len は [0, total] にクランプする。 */
function pointAtLength(
  m: PathMetrics,
  len: number
): { x: number; y: number; angle: number } {
  const first = m.pts[0]!;
  if (m.pts.length < 2) return { x: first[0], y: first[1], angle: 0 };
  const clamped = Math.min(Math.max(len, 0), m.total);
  for (let i = 1; i < m.pts.length; i++) {
    const segEnd = m.cum[i]!;
    if (clamped <= segEnd || i === m.pts.length - 1) {
      const a = m.pts[i - 1]!;
      const b = m.pts[i]!;
      const segLen = segEnd - m.cum[i - 1]!;
      const t = segLen > 0 ? (clamped - m.cum[i - 1]!) / segLen : 0;
      return {
        x: a[0] + (b[0] - a[0]) * t,
        y: a[1] + (b[1] - a[1]) * t,
        angle: segAngleDeg(a, b),
      };
    }
  }
  const last = m.pts[m.pts.length - 1]!;
  return { x: last[0], y: last[1], angle: 0 };
}

/** 点 (px, py) にいちばん近い、線上の位置 (弧長)。 */
function nearestLength(m: PathMetrics, px: number, py: number): number {
  if (m.pts.length < 2) return 0;
  let bestDist = Infinity;
  let bestLen = 0;
  for (let i = 1; i < m.pts.length; i++) {
    const a = m.pts[i - 1]!;
    const b = m.pts[i]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const segLen2 = dx * dx + dy * dy;
    // 同一座標が続く median もあるので 0 除算を避ける。
    const t =
      segLen2 > 0
        ? Math.min(
            1,
            Math.max(0, ((px - a[0]) * dx + (py - a[1]) * dy) / segLen2)
          )
        : 0;
    const cx = a[0] + dx * t;
    const cy = a[1] + dy * t;
    const dist = Math.hypot(px - cx, py - cy);
    if (dist < bestDist) {
      bestDist = dist;
      bestLen = m.cum[i - 1]! + Math.sqrt(segLen2) * t;
    }
  }
  return bestLen;
}

/**
 * くるまの見た目 (右向き、原点は車体の中心)。中央線の上に乗って走る。
 * 外側 <g> に位置と向きの transform、内側 <g> に CSS のゆれアニメーション、
 * という二段構えにする (CSS transform は transform 属性を上書きするため)。
 */
function createCar(): SVGGElement {
  const outer = svgEl("g", { class: "ksg-car" });
  const inner = svgEl("g", { class: "ksg-car__body" });
  // 車体
  inner.appendChild(
    svgEl("rect", {
      x: "-13",
      y: "-6",
      width: "26",
      height: "11",
      rx: "4",
      fill: CAR_BODY_COLOR,
      stroke: "#ffffff",
      "stroke-width": "1.6",
    })
  );
  // 屋根
  inner.appendChild(
    svgEl("path", {
      d: "M-7 -6 L-4 -12 L4 -12 L7 -6 Z",
      fill: CAR_CABIN_COLOR,
      stroke: "#ffffff",
      "stroke-width": "1.6",
      "stroke-linejoin": "round",
    })
  );
  // タイヤ
  for (const cx of [-7, 7]) {
    inner.appendChild(
      svgEl("circle", {
        cx: String(cx),
        cy: "5",
        r: "3.6",
        fill: CAR_WHEEL_COLOR,
        stroke: "#ffffff",
        "stroke-width": "1.2",
      })
    );
  }
  // ヘッドライト (進行方向がひと目で分かるように前だけ)
  inner.appendChild(
    svgEl("circle", { cx: "10.5", cy: "-1.5", r: "1.9", fill: CAR_LIGHT_COLOR })
  );
  outer.appendChild(inner);
  return outer;
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
  // 現在ガイド中の 1 画の弧長データと、その上を走るくるま。
  let metrics: PathMetrics | null = null;
  let carEl: SVGGElement | null = null;
  // pointer を拾う要素 (attach 時の描画レイヤ) と、追随中の pointerId。
  let pointerHost: HTMLElement | null = null;
  let activePointerId: number | null = null;
  // OS の「視差効果を減らす」設定では、矢印の点滅アニメーションを作らない
  // (矢印自体は静止したまま残す)。くるまのゆれは CSS 側で止める。
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 現在の論理画の中央線を表示座標の点列にして返す。ガイド対象が無ければ null。
  function currentPoints(): Array<[number, number]> | null {
    if (!charData) return null;
    const medians = charData.medians;
    const logicalCount = strokeGroups?.length ?? medians.length;
    if (strokeIndex < 0 || strokeIndex >= logicalCount) return null;
    // strokeGroups がある文字 (例: あ の 3 画目 = データ画 [2,3]) では、
    // グループ「先頭」のデータ画の median だけを使う。
    //
    // hanzi-writer-data-jp のデータ仕様 (ひらがな・数字の複数画グループ
    // 全 20 件で確認):
    // - 先頭データ画の median が、論理画 (見た目の 1 画) 全体の中央線を
    //   単独でカバーする (例: あ medians[2] はループ全体、お medians[1] は
    //   縦線+ループ全体)。
    // - 2 番目以降の median は「画の後半だけを書いた場合も受理する」ための
    //   判定用補助データで、キャンバス外のセンチネル点 (例: あ medians[3]
    //   の始点 [-170,458]) や別ルートの変種を含む。
    // そのため連結するとガイド線がキャンバス外へ飛ぶジグザグになる。
    // ガイドには先頭 median のみが正しい。
    const dataIndex = strokeGroups?.[strokeIndex]?.[0] ?? strokeIndex;
    const median = medians[dataIndex];
    if (!median) return null;
    const pts: Array<[number, number]> = [];
    for (const p of median) {
      const x = p[0];
      const y = p[1];
      if (x === undefined || y === undefined) continue;
      pts.push([
        round2(padding + x * scale),
        round2(originY - y * scale),
      ]);
    }
    return pts.length > 0 ? pts : null;
  }

  function pathD(pts: Array<[number, number]>): string {
    return pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`)
      .join(" ");
  }

  // 終点の進行方向 (deg)。終点直前のごく短いセグメントはノイズなので、
  // 終点から 4px 以上離れた点を遡って探す。全点が 4px 未満に収まる短い画
  // (漢字の「丶」のような点画) では始点→終点ベクトルの向きにフォールバック
  // する。始点と終点まで一致して向きが定まらない場合は null を返し、
  // 呼び出し側は矢印を描かない。
  function endAngleDeg(pts: Array<[number, number]>): number | null {
    const end = pts[pts.length - 1]!;
    for (let i = pts.length - 2; i >= 0; i--) {
      const p = pts[i]!;
      const dx = end[0] - p[0];
      const dy = end[1] - p[1];
      if (Math.hypot(dx, dy) >= 4) {
        return (Math.atan2(dy, dx) * 180) / Math.PI;
      }
    }
    const start = pts[0]!;
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    if (dx === 0 && dy === 0) return null;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }

  /**
   * 弧長 len におけるくるまの向き (deg)。median は点が細かく折れているため、
   * その場のセグメント角をそのまま使うとくるまがガタガタ揺れる。前後
   * CAR_HEADING_SAMPLE px の 2 点を結んだ向きにならして使う。
   */
  function headingAt(m: PathMetrics, len: number): number {
    if (m.total <= 0) return 0;
    const from = Math.max(0, len - CAR_HEADING_SAMPLE);
    const to = Math.min(m.total, from + 2 * CAR_HEADING_SAMPLE);
    const a = pointAtLength(m, from);
    const b = pointAtLength(m, to);
    if (a.x === b.x && a.y === b.y) return pointAtLength(m, len).angle;
    return segAngleDeg([a.x, a.y], [b.x, b.y]);
  }

  /**
   * くるまを表示座標 (x, y) に、進行方向 angle (deg) を向けて置く。
   * 左向き (|angle| > 90) のときは上下を反転させ、タイヤが下・屋根が上の
   * ままになるようにする。
   */
  function placeCar(x: number, y: number, angle: number): void {
    if (!carEl) return;
    const flip = Math.abs(angle) > 90 ? " scale(1 -1)" : "";
    carEl.setAttribute(
      "transform",
      `translate(${round2(x)} ${round2(y)}) rotate(${round2(angle)})${flip}`
    );
  }

  /** くるまを画の始点へ戻す (指を離したとき・次の画へ進んだとき)。 */
  function resetCar(): void {
    if (!carEl || !metrics) return;
    const head = pointAtLength(metrics, 0);
    placeCar(head.x, head.y, headingAt(metrics, 0));
  }

  /**
   * 指の位置にいちばん近い中央線上の点へくるまを動かす。
   * 指をそのまま追いかけるのではなく線の上に乗せることで、
   * 「線からずれている」ことも同時に分かるようにする。
   */
  function driveCarTo(px: number, py: number): void {
    if (!carEl || !metrics) return;
    if (metrics.pts.length < 2) return;
    const len = nearestLength(metrics, px, py);
    const at = pointAtLength(metrics, len);
    placeCar(at.x, at.y, headingAt(metrics, len));
  }

  /** 中央線に沿って、始点側から順に点滅する矢印を作る。 */
  function renderArrows(m: PathMetrics): SVGGElement | null {
    const pts = m.pts;
    const endAngle = endAngleDeg(pts);
    // 向きがまったく定まらない画 (始点 = 終点) では矢印を描かない。
    if (endAngle === null) return null;
    const count = Math.min(
      ARROW_MAX,
      Math.max(1, Math.round(m.total / ARROW_SPACING))
    );
    const cycle =
      (count - 1) * ARROW_BLINK_STEP +
      ARROW_BLINK_RISE +
      ARROW_BLINK_FALL +
      ARROW_BLINK_GAP;
    const group = svgEl("g", { class: "ksg-arrows" });
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const at = pointAtLength(m, (m.total * (i + 1)) / count);
      // 終点の矢印だけは、終端のノイズに強い endAngleDeg の向きを使う。
      const angle = isLast ? endAngle : at.angle;
      const arrow = svgEl("path", {
        class: "ksg-arrow",
        d: "M11 0 L-5 7.5 L-1.5 0 L-5 -7.5 Z",
        fill: ARROW_COLOR,
        "fill-opacity": reduceMotion ? "0.9" : String(ARROW_DIM_OPACITY),
        transform: `translate(${round2(at.x)} ${round2(at.y)}) rotate(${round2(angle)})`,
      });
      if (!reduceMotion) {
        // 暗い → ぱっと明るく → 消える、を i * STEP ずつ遅らせて繰り返す。
        const rise = ARROW_BLINK_RISE / cycle;
        const fall = (ARROW_BLINK_RISE + ARROW_BLINK_FALL) / cycle;
        arrow.appendChild(
          svgEl("animate", {
            attributeName: "fill-opacity",
            values: `${ARROW_DIM_OPACITY};1;${ARROW_DIM_OPACITY};${ARROW_DIM_OPACITY}`,
            keyTimes: `0;${round2(rise)};${round2(fall)};1`,
            dur: `${round2(cycle)}s`,
            begin: `${round2(i * ARROW_BLINK_STEP)}s`,
            repeatCount: "indefinite",
          })
        );
      }
      group.appendChild(arrow);
    }
    return group;
  }

  function render(): void {
    if (destroyed || !overlay) return;
    overlay.replaceChildren();
    carEl = null;
    metrics = null;
    activePointerId = null;
    if (hidden) return;
    const pts = currentPoints();
    if (!pts) return;
    const m = measure(pts);
    metrics = m;
    const start = pts[0]!;

    if (pts.length >= 2) {
      // 中央線に沿った柔らかいガイド線
      overlay.appendChild(
        svgEl("path", {
          class: "ksg-line",
          d: pathD(pts),
          fill: "none",
          stroke: GUIDE_LINE_COLOR,
          "stroke-opacity": GUIDE_LINE_OPACITY,
          "stroke-width": String(GUIDE_LINE_WIDTH),
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        })
      );
      // 進む向きを示す矢印。始点側から終点側へ順に点滅する。
      const arrows = renderArrows(m);
      if (arrows) overlay.appendChild(arrows);
    }

    // 始点マーカー (ここから書く)。くるまが走り出した後も「どこから始まるか」
    // が残るよう、塗りつぶしではなくリングにする。
    overlay.appendChild(
      svgEl("circle", {
        class: "ksg-start",
        cx: String(start[0]),
        cy: String(start[1]),
        r: "7",
        fill: "none",
        stroke: START_RING_COLOR,
        "stroke-width": "3",
        "stroke-opacity": "0.85",
      })
    );

    // 始点に置くくるま。指を下ろしている間だけ、指に追随して線の上を走る。
    carEl = createCar();
    overlay.appendChild(carEl);
    resetCar();
  }

  // --- 指の追随 -----------------------------------------------------------
  // オーバーレイ自体は pointer-events:none なので、kakitori の描画レイヤで
  // pointer イベントを「見るだけ」(preventDefault しない) で拾う。
  // kakitori 側のなぞり判定には一切干渉しない。

  function toLocal(e: PointerEvent): [number, number] | null {
    if (!overlay) return null;
    const rect = overlay.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return [
      ((e.clientX - rect.left) * size) / rect.width,
      ((e.clientY - rect.top) * size) / rect.height,
    ];
  }

  function onPointerDown(e: PointerEvent): void {
    if (destroyed || hidden) return;
    activePointerId = e.pointerId;
    const p = toLocal(e);
    if (p) driveCarTo(p[0], p[1]);
  }

  function onPointerMove(e: PointerEvent): void {
    if (destroyed || hidden) return;
    if (activePointerId !== e.pointerId) return;
    const p = toLocal(e);
    if (p) driveCarTo(p[0], p[1]);
  }

  function onPointerEnd(e: PointerEvent): void {
    if (activePointerId !== e.pointerId) return;
    activePointerId = null;
    if (destroyed || hidden) return;
    // 指を離したら、次に書き始める位置 (始点) で待たせる。
    resetCar();
  }

  function bindPointer(host: HTMLElement): void {
    unbindPointer();
    pointerHost = host;
    host.addEventListener("pointerdown", onPointerDown, { passive: true });
    host.addEventListener("pointermove", onPointerMove, { passive: true });
    host.addEventListener("pointerup", onPointerEnd, { passive: true });
    host.addEventListener("pointercancel", onPointerEnd, { passive: true });
    host.addEventListener("pointerleave", onPointerEnd, { passive: true });
  }

  function unbindPointer(): void {
    if (!pointerHost) return;
    pointerHost.removeEventListener("pointerdown", onPointerDown);
    pointerHost.removeEventListener("pointermove", onPointerMove);
    pointerHost.removeEventListener("pointerup", onPointerEnd);
    pointerHost.removeEventListener("pointercancel", onPointerEnd);
    pointerHost.removeEventListener("pointerleave", onPointerEnd);
    pointerHost = null;
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
      // くるまを指に追随させるため、同じレイヤで pointer イベントを観測する。
      bindPointer(layer);
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
      unbindPointer();
      overlay?.remove();
      overlay = null;
      carEl = null;
      metrics = null;
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
