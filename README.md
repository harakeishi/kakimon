# kakimon（カキモン）

> 君と育つモンスター — 勉強で育てる学習アプリ

子供向けの学習PWA。学習コンテンツ（数字・ひらがな・漢字の書き取りなど）に取り組むと
ゲーム内通貨が貯まり、モンスターの餌や装備品を購入して一緒に育てていく。
学習コンテンツはプラグインとして追加できるよう設計されている。

## ステータス

設計フェーズ。実装はまだ着手していない。設計ドキュメントは `docs/` を参照。

## ドキュメント

- [docs/README.md](docs/README.md) — ドキュメント索引
- [docs/01-overview.md](docs/01-overview.md) — コンセプトと要件
- [docs/02-architecture.md](docs/02-architecture.md) — アーキテクチャと技術スタック
- [docs/03-plugin-architecture.md](docs/03-plugin-architecture.md) — プラグインアーキテクチャ
- [docs/04-domain-model.md](docs/04-domain-model.md) — ドメインモデルとデータ永続化
- [docs/05-ui-ux.md](docs/05-ui-ux.md) — UI/UX 設計
- [docs/06-roadmap.md](docs/06-roadmap.md) — マイルストーン

## クレジット

- **書き取りエンジン**: [@k1low/kakitori](https://github.com/k1LoW/kakitori) (MIT)
  と関連データパッケージ。
- **モンスター・食べ物・UI アイコン**: [OpenMoji](https://openmoji.org/) (CC BY-SA 4.0)。
  ひらがな書き取りで利用する文字データは [@k1low/hanzi-writer-data-jp](https://www.npmjs.com/package/@k1low/hanzi-writer-data-jp)
  および [@k1low/kakitori-data](https://www.npmjs.com/package/@k1low/kakitori-data)
  をビルド時にローカルへ同期して利用する (`scripts/sync-kakitori-data.mjs` /
  `scripts/sync-emoji.mjs`)。

## ライセンス

未定（実装着手時に決定）。
