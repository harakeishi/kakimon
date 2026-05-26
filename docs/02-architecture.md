# 02. アーキテクチャと技術スタック

## 2.1 全体像

kakimon は単一ページの PWA。ユーザの端末ローカルで完結し、サーバを必要としない。

```
┌─────────────────────────────────────────────────────────┐
│                       Browser (PWA)                      │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐  ┌─────────────┐   │
│  │   UI Layer    │   │ Plugin Host  │  │ Game Engine │   │
│  │   (React)     │◀─▶│  (Registry)  │◀▶│  (Domain)   │   │
│  └──────────────┘   └──────────────┘  └─────────────┘   │
│         ▲                  ▲                  ▲          │
│         │                  │                  │          │
│  ┌──────┴───────┐  ┌───────┴──────┐  ┌────────┴─────┐   │
│  │  App State    │  │   Plugins    │  │ Persistence  │   │
│  │  (Zustand)    │  │ (Bundled or  │  │  (Dexie /    │   │
│  │               │  │  Dynamically │  │   IndexedDB) │   │
│  │               │  │  Imported)   │  │              │   │
│  └──────────────┘  └──────────────┘  └─────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │   Service Worker (Workbox) — オフライン・PWA      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## 2.2 レイヤとモジュール

責務を以下の 5 レイヤに分ける。下位レイヤは上位レイヤに依存しない。

| レイヤ | 責務 | 主な型・モジュール |
|---|---|---|
| **UI** | React コンポーネント、画面遷移 | `app/`, `features/*/ui` |
| **Application** | ユースケース、画面とドメインの橋渡し | `features/*/use-cases` |
| **Domain** | エンティティ・ルール（ピュアな TS） | `domain/monster`, `domain/wallet`, `domain/inventory` |
| **Plugin** | 学習コンテンツの契約と登録 | `plugin-api/`, `plugin-host/` |
| **Infrastructure** | IndexedDB アクセス、Service Worker | `infra/db`, `infra/pwa` |

依存方向: `UI → Application → Domain ← Infrastructure`。Plugin は Domain にだけ
依存し、UI からは Plugin Host を介して呼ぶ。

### モジュール分割の理由

- **Domain をピュアに保つ** → ロジックの単体テストがしやすい。モンスターの
  レベル計算や経験値の式が React にもブラウザ API にも依存しないように。
- **Plugin Host を独立**させる → プラグインの追加・削除・差し替えで Domain や UI を
  触らずに済む。
- **Infrastructure を端に置く** → IndexedDB から例えば SQLite WASM への移行も
  Domain を触らずに済む。

## 2.3 技術スタック

実装時の最終決定は別途行うが、現時点の第一候補を記す。

| カテゴリ | 採用候補 | 理由 / 代替 |
|---|---|---|
| ビルド | **Vite** | PWA プラグインが揃い、開発体験が速い |
| 言語 | **TypeScript (strict)** | プラグインの契約を型で表現する |
| UI | **React 18+** | エコシステムが厚い。Preact も代替候補 |
| ルーティング | **React Router** | 画面数が少ないので軽量で十分 |
| 状態管理 | **Zustand** | Redux より軽量。子供向けの単純な状態に合う |
| スタイル | **Tailwind CSS** + 子供向けのカスタムコンポーネント | 大きなボタン・大きな文字を作りやすい |
| アニメーション | **Framer Motion** | モンスターの息遣い・喜びの演出 |
| データ層 | **Dexie.js** (IndexedDB) | スキーマと型が綺麗に書ける |
| PWA | **vite-plugin-pwa** (Workbox) | オフライン・インストール対応の定番 |
| 書き取り判定 | **@k1low/kakitori** | ストローク単位判定、MIT。`writing-*` プラグインで使用 |
| テスト | **Vitest** (単体) / **Playwright** (E2E) | Vite と相性が良い |
| Lint / Format | **ESLint** + **Prettier** | 標準的構成 |
| パッケージ管理 | **pnpm workspaces** | プラグインをモノレポで管理する |

### 採用しないもの（現時点）

- **Next.js / SSR**: サーバを持たないため不要。SPA + Service Worker で十分。
- **GraphQL / REST**: 通信先がない。
- **Redux Toolkit**: Zustand で足りる規模。
- **State Machine ライブラリ（XState 等）**: ゲームエンジン側が必要になった
  段階で再検討。

## 2.4 ディレクトリ構成（暫定）

pnpm workspaces を使い、プラグインは `packages/` 配下のサブパッケージにする。

```
kakimon/
├─ apps/
│  └─ web/                      # PWA 本体
│     ├─ src/
│     │  ├─ app/                # ルーティング・レイアウト
│     │  ├─ features/           # 画面単位の機能 (home, study, shop, ...)
│     │  ├─ domain/             # ピュアな TS のドメインモデル
│     │  ├─ plugin-host/        # プラグインの登録・ロード
│     │  ├─ infra/
│     │  │  ├─ db/              # Dexie スキーマと repository
│     │  │  └─ pwa/             # Service Worker 関連
│     │  └─ main.tsx
│     ├─ public/
│     │  └─ icons/              # PWA アイコン
│     ├─ index.html
│     ├─ vite.config.ts
│     └─ package.json
│
├─ packages/
│  ├─ plugin-api/               # プラグイン契約 (型 + ヘルパー)
│  ├─ plugin-writing-numbers/   # 数字書き取りプラグイン
│  ├─ plugin-writing-hiragana/  # ひらがな書き取りプラグイン
│  └─ plugin-writing-kanji/     # 漢字書き取りプラグイン
│
├─ docs/                        # 本設計ドキュメント
├─ pnpm-workspace.yaml
├─ package.json
├─ tsconfig.base.json
└─ README.md
```

### なぜモノレポか

- プラグインの契約 (`plugin-api`) を共有しつつ、各プラグインを独立したパッケージに
  できる。
- 「サードパーティが別リポジトリでプラグインを作る」未来へ移行しやすい
  （`packages/plugin-*` をそのまま別 repo へ切り出せる）。
- 一方で、初期は本体と同じリポジトリにあったほうがリファクタしやすい。

## 2.5 ビルドと配信

- 静的ファイルとしてビルドし、任意の静的ホスティング（GitHub Pages、Cloudflare
  Pages、Netlify など）に置く。サーバランタイムは不要。
- バージョン管理は Service Worker の更新通知で行う。プラグインのバージョン更新も
  本体のリリースに含める（プラグインは現状ビルド時にバンドル）。
- 動的プラグインロード（実行時にネットからプラグインを取得）は v1 ではやらない。
  ただし、後でやれるよう Plugin Host は「実体は import 結果のオブジェクト」を
  受け取る形にしておく。

## 2.6 セキュリティと安全性

- **個人情報を扱わない**。氏名や生年月日も任意。モンスター名はローカル保存のみ。
- **CSP** を設定し、外部スクリプトの読み込みを基本禁止にする。
- **子供向けの誤操作対策**: 課金や外部リンクをそもそも置かない。アプリの
  「外」に出る経路を最小化する。
- 学習データは LocalStorage / IndexedDB に平文保存。複数の子供で端末を共有する
  ことを想定する場合は「プロファイル切り替え」を v1 で検討するが、MVP には
  含めない。
