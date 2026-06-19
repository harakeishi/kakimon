# 03. プラグインアーキテクチャ

## 3.1 目的

学習コンテンツを「あとから増やせる」状態を保つ。本体（モンスター育成・通貨・
ショップ）と、学習コンテンツ（書き取り・計算・読み上げ…）を疎結合にし、
コンテンツ追加で本体コードに手を入れなくて済むようにする。

非目標：

- 任意の第三者が実行時に未審査のコードを読み込む仕組みは作らない（子供向けの
  ため安全性を優先）。プラグインは本体ビルドに同梱する前提で設計する。
- プラグインは UI を持ち込んで構わない。サンドボックス化（iframe や Worker 隔離）は
  v1 ではやらない。

## 3.2 プラグインの契約

プラグインは以下のオブジェクトをエクスポートする。`plugin-api` パッケージで型を
共有する。

```ts
// packages/plugin-api/src/index.ts

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface PluginManifest {
  /** 一意な識別子。逆DNS推奨。例: "io.kakimon.writing.hiragana" */
  id: string;
  /** 表示名（日本語） */
  name: string;
  /** 一行説明 */
  description: string;
  /** バージョン (semver) */
  version: string;
  /** 対象年齢の目安 (任意) */
  ageHint?: { min: number; max: number };
  /** 難易度の段階。プラグイン内部での difficulty key と対応 */
  difficulties: { key: string; label: string; level: DifficultyLevel }[];
  /** 一覧表示で使うアイコン (SVG コンポーネントまたは URL) */
  icon: IconSource;
  /** カテゴリ。UIのグルーピングに使う */
  category: "writing" | "reading" | "math" | "other";
}

export interface SessionConfig {
  /** 選択された難易度キー */
  difficulty: string;
  /** 1セッションの問題数。プラグインが独自に決めてもよい */
  questionCount?: number;
  /** プラグイン固有の任意設定 */
  options?: Record<string, unknown>;
}

export interface SessionContext {
  /** セッションが完了したことを Plugin Host に通知する */
  complete(result: SessionResult): void;
  /** セッションを途中で中断する */
  abort(reason: "user" | "error", detail?: string): void;
  /** 進捗を報告する（UIのプログレス用、任意） */
  reportProgress(progress: Progress): void;
  /**
   * 1 問ごとの結果が確定した瞬間に通知する（任意・UI演出専用）。
   * Host はこれを使って、育てているモンスターに「すごい！」「もういちど！」
   * のような応援リアクションを出す。報酬計算には使わない。
   */
  reportOutcome?(outcome: QuestionOutcome): void;
  /** ロケール */
  locale: "ja";
}

export interface Progress {
  /** 0 から 1 */
  ratio: number;
  /** 任意のラベル "3 / 10" など */
  label?: string;
}

export interface QuestionOutcome {
  /** プラグイン内で一意な問題ID */
  questionId: string;
  correct: boolean;
  /** 0..1 の習熟度スコア。kakitori のストローク完成度などをここに入れる */
  score: number;
  /** 解答にかかった秒数（任意） */
  elapsedMs?: number;
  /** プラグイン固有の追加情報 (型付けは plugin 側で) */
  meta?: Record<string, unknown>;
}

export interface SessionResult {
  /** セッション完了の全体スコア (0..1)。Plugin Host が通貨換算する */
  overallScore: number;
  /** 出題ごとの結果 */
  outcomes: QuestionOutcome[];
  /** セッション時間 (ms) */
  durationMs: number;
}

export interface ContentPlugin {
  manifest: PluginManifest;

  /**
   * セッションを開始する。プラグインは渡された DOM 要素にレンダリングし、
   * 完了時に ctx.complete() を呼ぶ。
   *
   * 戻り値の dispose() でセッションを破棄する。UI 側がアンマウントするときに呼ぶ。
   */
  startSession(
    target: HTMLElement,
    config: SessionConfig,
    ctx: SessionContext,
  ): { dispose(): void };
}
```

### 設計上のポイント

- **UI は target 要素に任せる**。React/Vanilla どちらでもよい。プラグインが
  Lit Element でも、kakitori のような DOM API でも問題なく載る。
- **報酬計算は Plugin Host が行う**。プラグインは `overallScore` (0..1) と
  個別の `outcomes` を返すだけ。通貨換算や経験値換算はゲーム側で集約管理する。
  これにより「全プラグインを通したバランス調整」が一箇所で完結する。
- **`SessionContext.complete` を必ず呼ぶ**契約にする。呼ばれない場合のタイム
  アウトは Host 側で扱う。
- **プラグインは自分の状態を持たない**。難易度別の達成度などは Host 側に
  保存し、必要なら次回の `SessionConfig.options` で渡す。

## 3.3 プラグインの登録

プラグインは静的にビルドへ取り込む。`apps/web/src/plugin-host/registry.ts`
で集約する。

```ts
// apps/web/src/plugin-host/registry.ts
import type { ContentPlugin } from "@kakimon/plugin-api";
import { plugin as writingNumbers } from "@kakimon/plugin-writing-numbers";
import { plugin as writingHiragana } from "@kakimon/plugin-writing-hiragana";
import { plugin as writingKanji } from "@kakimon/plugin-writing-kanji";

export const builtinPlugins: ContentPlugin[] = [
  writingNumbers,
  writingHiragana,
  writingKanji,
];
```

登録時にマニフェストを検証する（id の重複、semver パース、必須フィールド）。
重複や検証エラーは起動時に明示的に失敗させる（黙ってスキップしない）。

### 動的ロードに備える

将来「ユーザが追加でプラグインをインストール」できるようにするときは、
`builtinPlugins` に動的 import の結果を足すだけで成立する設計にしておく。
（実行時の検証ロジックは流用できる。）

## 3.4 ライフサイクル

```
ユーザがコンテンツを選択
    │
    ▼
SessionConfig を組み立てる (難易度・問題数 etc.)
    │
    ▼
plugin.startSession(targetEl, config, ctx) を呼ぶ
    │  ── プラグインが target にレンダリング ──
    │
    ▼  (ユーザが学習している間)
ctx.reportProgress() を任意で呼ぶ
    │
    ▼  (完了 or 中断)
ctx.complete(result) または ctx.abort()
    │
    ▼
Plugin Host が dispose() を呼んで後片付け
    │
    ▼
Plugin Host が SessionResult を Domain に渡し、
コインや経験値を計算して付与
```

## 3.5 スコアリングと報酬

報酬計算は Host 側に集約する。プラグインから受け取った `SessionResult` を以下に
変換する：

```
coins  = floor( baseCoins(difficulty) × overallScore × bonus(streak, mood, ...) )
exp    = floor( baseExp(difficulty)   × overallScore )
```

- `baseCoins`, `baseExp` は難易度ごとの基本値（テーブルで定数化）。
- `bonus` は連続学習日数、モンスターの機嫌、初回完了かどうかなど。
- 全プラグインで同じ式を使うため、バランス調整が一箇所で済む。

不正対策（子供が自分でストレージを書き換えて遊ぶ等）は MVP では考慮しない。
これは子供本人にとっては大した問題ではなく、保護者対策としても深追いしない。

## 3.6 初期プラグインの設計概要

### `@kakimon/plugin-writing-numbers`

- マニフェスト: `id="io.kakimon.writing.numbers"`, category `"writing"`,
  対象年齢 4〜8 歳。
- 難易度: `easy`(0,1,2,3,5,7), `normal`(0-9 全部), `hard`(なぞり書きなし)。
- 内部実装: `@k1low/kakitori` の `char.create` でストローク判定。
- 出題: 1 セッション 5〜10 文字。順序はシャッフル。
- スコア: kakitori が返す `CharResult` のストローク正誤数から `score`(0..1) を
  算出。

### `@kakimon/plugin-writing-hiragana`

- マニフェスト: `id="io.kakimon.writing.hiragana"`, category `"writing"`,
  対象年齢 5〜8 歳。
- 難易度: 清音→濁音→拗音の段階。
- 出題: 同上。語句単位の出題は v1 で検討（最初は単文字）。

### `@kakimon/plugin-writing-kanji`

- マニフェスト: `id="io.kakimon.writing.kanji"`, category `"writing"`,
  対象年齢 6〜12 歳。
- 難易度: 学年別配当漢字（1〜6 年）。
- 出題: 学年 → 単元 → 漢字。読みも一緒に表示する。

3 つのプラグインは共通の「kakitori ラッパー」を共有する形にし、
`packages/plugin-writing-shared/` に切り出すのが妥当（実装時に判断）。

## 3.7 プラグインのテスト

- **契約テスト**: `plugin-api` 側に「プラグインが満たすべき性質」を確かめる
  テストハーネスを置く。マニフェスト検証、`startSession` の呼び出しサイクル、
  `complete` が一度しか呼ばれないこと、など。
- **個別プラグインのテスト**: 各プラグインのリポジトリで Vitest。kakitori
  ラッパー部分は手書きストロークをモック入力できるようにする。

## 3.8 やらない/やれないこと（明示）

- **任意コード実行のサンドボックス**: 提供しない。プラグインは信頼されている
  前提（ビルドに含まれている）。
- **多言語プラグイン**: 当面 ja のみ。`SessionContext.locale` の口だけ開けて
  おく。
- **オンライン同期**: プラグインの設定や進捗をクラウドに送る仕組みは持たない。
