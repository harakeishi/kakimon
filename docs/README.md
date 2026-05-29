# kakimon 設計ドキュメント

このディレクトリには kakimon の設計ドキュメントを置く。実装着手前の合意形成と、
将来コードを読む人が「なぜそうなっているか」を理解するためのもの。

## 索引

| # | ドキュメント | 内容 |
|---|---|---|
| 01 | [overview.md](01-overview.md) | コンセプト、対象ユーザー、機能/非機能要件、スコープ |
| 02 | [architecture.md](02-architecture.md) | レイヤ構成、モジュール分割、技術スタック、ディレクトリ構成 |
| 03 | [plugin-architecture.md](03-plugin-architecture.md) | 学習コンテンツプラグインの契約、登録、ライフサイクル、スコアリング |
| 04 | [domain-model.md](04-domain-model.md) | モンスター・通貨・餌・装備のドメインモデル、IndexedDB スキーマ |
| 05 | [ui-ux.md](05-ui-ux.md) | 画面一覧、画面遷移、子供向け配慮、アクセシビリティ |
| 06 | [roadmap.md](06-roadmap.md) | フェーズ分けされたマイルストーン |

## 読み方

- 最初に [01-overview.md](01-overview.md) を読んで、何を作ろうとしているかを把握する。
- 次に [02-architecture.md](02-architecture.md) で全体像を掴む。
- プラグインを書く / 拡張する場合は [03-plugin-architecture.md](03-plugin-architecture.md)。
- データ構造を扱う場合は [04-domain-model.md](04-domain-model.md)。

## 更新ルール

- 設計が変わったら該当ドキュメントを更新する。コードと矛盾するドキュメントは害悪。
- 「決めた理由」が含まれていない決定事項は、後から触る人が剥がしてしまいやすい。
  迷ったら理由を一行添える。
- 大きな決定は ADR（Architecture Decision Record）として `docs/adr/` 配下に
  足す方針。`docs/adr/` は実装フェーズで必要に応じて作る。
