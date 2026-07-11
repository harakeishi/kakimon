// 書き取り系プラグイン (hiragana / number) の共通コード。
// docs/03-plugin-architecture.md の「共通コードは plugin-writing-shared に
// 切り出す」構想に対応する source-only パッケージ (plugin-api と同方式)。

export {
  createStrokeGuide,
  wrapLoadersForGuide,
  type GuideLoaderPair,
  type StrokeGuide,
  type StrokeGuideCharData,
  type StrokeGuideOptions,
} from "./strokeGuide";
