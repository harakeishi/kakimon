# 04. ドメインモデルとデータ永続化

## 4.1 エンティティ概観

```
Player ─── owns ───▶ Monster ─── equips ───▶ Equipment
   │                    │
   │                    └── eats ───▶ Food
   │
   ├── has ──▶ Wallet (coins)
   ├── has ──▶ Inventory (food / equipment)
   └── logs ─▶ StudySession (履歴)
```

Player は端末ローカルにひとり。MVP では複数プロファイル / 複数モンスター飼育を
やらない。

## 4.2 主要エンティティ

### Monster

```ts
interface Monster {
  id: string;              // uuid
  name: string;            // ユーザがつけた名前
  species: SpeciesId;      // タマゴから孵る種族の識別子
  bornAt: ISODateString;
  stage: "egg" | "baby" | "child" | "teen" | "adult";
  level: number;           // 1〜
  exp: number;             // 現在経験値
  expToNext: number;       // 次のステージへの必要経験値
  stats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    smart: number;         // 学習プレイで上がる固有スタッツ
  };
  condition: {
    hunger: number;        // 0..100, 高いほど空腹
    mood: number;          // 0..100, 高いほど機嫌よい
    cleanliness: number;   // 0..100
  };
  equippedIds: {
    head?: string;
    body?: string;
    accessory?: string;
  };
  favoriteFoodIds: FoodId[];  // 好物。給餌で機嫌ボーナス
}
```

設計メモ：
- ステータスは整数で扱う（小数の経験値は累計の解釈で揉める）。
- `condition` は時間経過で変動する。詳細は [4.5](#45-時間経過とお世話) 。
- `expToNext` は計算式で出せるが、UI のたびに再計算するのを避けてキャッシュする。

### Wallet

```ts
interface Wallet {
  coins: number;
  lifetimeEarned: number;  // 累計獲得（実績用）
  lifetimeSpent: number;
}
```

通貨はコインのみ。プレミアム通貨は作らない。

### Food / Equipment（カタログ）

カタログは静的データ。`apps/web/src/domain/catalog/` に定数として置く。
ユーザは「所有数」を Inventory で持つ。

```ts
interface FoodItem {
  id: FoodId;
  name: string;
  description: string;
  icon: IconSource;
  price: number;
  // 給餌時の効果
  effects: {
    hungerDelta: number;    // 通常負の値
    moodDelta: number;
    hpDelta?: number;
    smartDelta?: number;
  };
  // 好物として設定可能か
  canBeFavorite: boolean;
}

interface EquipmentItem {
  id: EquipmentId;
  name: string;
  description: string;
  icon: IconSource;
  price: number;
  slot: "head" | "body" | "accessory";
  statBonus: Partial<Monster["stats"]>;
  appearance: AppearanceLayer;  // 描画用
}
```

### Inventory

```ts
interface InventoryEntry {
  itemId: FoodId | EquipmentId;
  kind: "food" | "equipment";
  count: number;
}

interface Inventory {
  entries: InventoryEntry[];
}
```

装備は所有していれば付け外し自由（同種を複数所有しても効果は重ねない）。
餌は消費型。

### StudySession（履歴）

```ts
interface StudySession {
  id: string;
  pluginId: string;
  startedAt: ISODateString;
  completedAt: ISODateString;
  durationMs: number;
  difficulty: string;
  overallScore: number;       // 0..1
  outcomes: QuestionOutcome[]; // プラグイン返却そのまま
  rewards: {
    coins: number;
    exp: number;
  };
}
```

履歴は無制限に貯めず、上限（例：直近 1000 件）で古いものから削除する。
詳細データを残しすぎると IndexedDB が肥大化し、初回読み込みが重くなる。

## 4.3 ドメインルール（抜粋）

### 経験値とステージ進行

```
expToNext(stage) = baseExp[stage] × level
stage 進化条件: level が stage 最大に達し、かつ smart が閾値を超えた
```

- 「賢さ閾値」を入れることで、なんとなくコインを稼いで装備で殴っているだけでは
  進化しない。学習をしないと先へ進めない設計にする。

### コイン報酬（再掲）

`docs/03-plugin-architecture.md` 3.5 節と一致。Domain 側の `RewardCalculator`
として実装する。

### 餌・装備の購入

- `wallet.coins >= item.price` を満たす場合のみ購入可能。
- 在庫無限。同じ装備を 2 個買えるかどうかは UX 判断 → MVP では「装備は所有数を
  ブール（0/1）として扱う」（無駄な購入を子供がしないため）。

### お世話アクション

- **餌をあげる**: 所有している食料を 1 つ消費し、`effects` を Monster.condition と
  stats に適用する。
- **撫でる**: 1 日に 5 回まで mood が上がる。コストなし。
- **お風呂**: 専用アイテム or 撫でる10回で cleanliness +30。

## 4.4 時間経過とお世話

オフライン中の時間経過をどう扱うか。

- アプリ起動時に「前回更新時刻」と現在時刻の差分から、`hunger` / `cleanliness` /
  `mood` を減衰／上昇させる。
- 上限・下限でクリップする。死なせない（子供向けのため、ペットが死ぬ仕様は
  入れない）。
- 計算式は単純に：「24 時間で hunger が 0→100」「1 週間放置で mood が 50 → 20
  まで下がる」あたりから調整。

### 設計判断

ペット系アプリでよくある「死亡」「家出」「リセット」は kakimon では採用しない。
子供が学校で 1 週間遊ばなくてもモンスターが消えないこと、これは要件。

## 4.5 IndexedDB スキーマ（Dexie）

```ts
class KakimonDB extends Dexie {
  monster!: Dexie.Table<MonsterRow, string>;
  wallet!: Dexie.Table<WalletRow, "singleton">;
  inventory!: Dexie.Table<InventoryEntry, [string, "food" | "equipment"]>;
  studySession!: Dexie.Table<StudySession, string>;
  settings!: Dexie.Table<SettingsRow, string>;
  meta!: Dexie.Table<MetaRow, "meta">;

  constructor() {
    super("kakimon");
    this.version(1).stores({
      monster: "id, name, stage",
      wallet: "&id",                       // 'singleton' のみ
      inventory: "[itemId+kind], kind",
      studySession: "id, pluginId, completedAt",
      settings: "&id",
      meta: "&id",                          // 'meta' のみ。バージョン、最終更新時刻など
    });
  }
}
```

- Wallet と Settings は単一行を `id = 'singleton'` で扱う。
- マイグレーションは `version(2).stores(...)` で追加する。バージョン更新時には
  必ず `upgrade()` でマイグレーションを書く。
- スキーマ変更は ADR（`docs/adr/`）に記録する方針。

## 4.6 リポジトリ層

Dexie へのアクセスは `infra/db/repositories/*.ts` で隠す。Domain はリポジトリの
インターフェース（`apps/web/src/domain/ports/`）にだけ依存する。

```ts
// 例: apps/web/src/domain/ports/MonsterRepository.ts
export interface MonsterRepository {
  load(): Promise<Monster | null>;
  save(monster: Monster): Promise<void>;
  reset(): Promise<void>;
}
```

ユースケース層は `MonsterRepository`, `WalletRepository`, `InventoryRepository`,
`StudySessionRepository` を受け取って動く。テスト時はインメモリ実装に差し替える。

## 4.7 バックアップ・エクスポート

- 全テーブルを JSON にダンプし、ファイルとしてダウンロード/インポートできる
  ようにする（v1）。MVP では未実装でよいが、データ構造はバージョン番号を
  含めた JSON にしておけば後から足しやすい。

```jsonc
{
  "$schema": "kakimon-export@1",
  "exportedAt": "2026-05-26T00:00:00.000Z",
  "data": {
    "monster": [...],
    "wallet": {...},
    "inventory": [...],
    "studySession": [...],
    "settings": {...}
  }
}
```

## 4.8 イベントログ

将来「学習履歴を可視化」したいので、StudySession を append-only で残す。
モンスターの状態変化（餌をあげた、装備を変えた）は MVP ではログしない（過剰）。
必要が出たら後から追加する。
