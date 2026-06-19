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
    maxHp: number;
    hp: number;            // 現在HP。0 になると lifeState が "dying" へ
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
  /** 生死と健康の段階。詳細は 4.4 「時間経過とお世話・寿命」 */
  lifeState: "healthy" | "weak" | "sick" | "dying" | "deceased";
  /** condition / hp などが最後に再計算された時刻。オフライン経過の起点 */
  lastTickAt: ISODateString;
  /** "dying" に入った時刻。ここから猶予期間が始まる。null なら未到達 */
  dyingSince: ISODateString | null;
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
- `condition` と `hp` は時間経過で変動する。詳細は [4.4](#44-時間経過とお世話寿命) 。
- `lifeState` は派生値ではなくエンティティ自体に持たせる。理由：演出・通知の
  発火条件で「今このフレームで `dying` に切り替わったか」を判定したいため、
  前回値との差分を取れる形にしておく。
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

### InteriorItem（へやのもよう）

ショップの「へや」タブで買える、ホーム画面のステージを飾るアイテム。
壁紙・床・家具の 3 カテゴリがある。装備と同じく非消費・所有はブール（0/1）。

```ts
interface InteriorItem {
  id: InteriorId;
  name: string;
  description: string;
  icon: IconSource;
  price: number;
  category: "wallpaper" | "floor" | "furniture";
  background?: string;  // 壁紙・床の見た目（CSS background 値）
}
```

- **壁紙 / 床**: それぞれ 1 つだけ選択。ステージ全体の背景・下部の床帯になる。
- **家具**: 同時に最大 4 個まで「飾る／しまう」をトグルできる。床の上に並ぶ。

### Inventory

```ts
interface InventoryEntry {
  itemId: FoodId | EquipmentId | InteriorId;
  kind: "food" | "equipment" | "interior";
  count: number;
}

interface Inventory {
  entries: InventoryEntry[];
}
```

装備・へやのもようは所有していれば自由に付け外し（同種を複数所有しても意味は
ないのでブール扱い）。餌は消費型。

### Room（へやのもようがえ状態）

選択中の壁紙・床・飾っている家具を持つ端末単位の状態。Monster とは独立して
おり、`settings` テーブルに singleton（id: `"room"`）で保存する。死亡からの
再スタートでも Wallet / Inventory と同様に持ち越す。

```ts
interface Room {
  wallpaperId: InteriorId | null;
  floorId: InteriorId | null;
  furnitureIds: InteriorId[];  // 最大 4 個、並び順 = 表示順
}
```

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

### 餌・装備・へやのもようの購入

- `wallet.coins >= item.price` を満たす場合のみ購入可能。
- 在庫無限。同じ装備を 2 個買えるかどうかは UX 判断 → MVP では「装備・へやの
  もようは所有数をブール（0/1）として扱う」（無駄な購入を子供がしないため）。
- 購入後は自動で身につける／飾る（装備はその場で着せ、もようはへやに反映）。

### お世話アクション

- **餌をあげる**: 所有している食料を 1 つ消費し、`effects` を Monster.condition と
  stats に適用する。
- **撫でる**: 1 日に 5 回まで mood が上がる。コストなし。
- **お風呂**: 専用アイテム or 撫でる10回で cleanliness +30。

## 4.4 時間経過とお世話・寿命

オフライン中の時間経過をどう扱うか。長期間世話をしないとモンスターが
弱り、最終的に「死亡」する。ただし**子供向けである以上、突然死は作らない**。
段階的に状態が悪化し、警告が出て、回復のチャンスを与えてから死亡に至る。

### tick: 時間経過の再計算

- アプリ起動時、および学習完了時に「前回 tick 時刻 = `lastTickAt`」と
  現在時刻の差分から `hunger` / `cleanliness` / `mood` / `hp` /
  `lifeState` を更新する。
- 計算式は冪等にする。「前回からの経過時間 Δt」を引数に取り、
  `lastTickAt = now` を最後に書く純粋関数として実装する。
  これによりオフライン経過とオンライン経過を同じコードで扱える。

### 状態遷移

```
                  良い世話                  悪化           回復         悪化
  healthy ──────────────────▶ weak ────▶ sick ────▶  ...  ────▶ dying ──▶ deceased
     ▲                          │           │                     │           ▲
     │       回復(餌+撫で)       │           │  回復(餌+お風呂)    │           │
     └──────────────────────────┴───────────┴─────────────────────┘           │
                                                                              │
                                       猶予期間(48h)内に世話しなければ ────────┘
```

| lifeState | 入る条件（目安） | 振る舞い |
|---|---|---|
| `healthy` | hunger < 60 かつ mood ≥ 40 かつ cleanliness ≥ 40 かつ hp == maxHp | 通常 |
| `weak`    | hunger ≥ 60 など、いずれかが悪化 | アニメが少し弱る。コイン報酬 -10% |
| `sick`    | hunger ≥ 85 が 12 時間継続、または cleanliness ≤ 20 が 24 時間継続 | hp が徐々に減る。学習効率 -25%。お風呂 + 給餌で回復 |
| `dying`   | hp = 0 になった瞬間。`dyingSince` を記録 | 大きな警告。学習を一旦止めて世話を促す |
| `deceased` | `dying` 状態のまま 48 時間（猶予期間）経過 | 図鑑にお墓として記録、後述の再スタート |

### 減衰パラメータ（初期値、調整余地あり）

- `hunger`: 24 時間で 0 → 100。
- `cleanliness`: 72 時間で 100 → 0。
- `mood`: 168 時間（1 週間）放置で 50 → 20。
- `hp`: `sick` 中のみ 24 時間で maxHp の 25% 減。`weak` では減らない。
- これらは「世話されない放置時間」を基準にしており、撫でる・給餌・お風呂で
  即座に回復する。

ざっくり、**完全に放置した場合のタイムライン**：

```
  0h   ─ healthy
 24h   ─ hunger MAX、weak
 36h   ─ sick へ移行 (hungry 状態が 12h 継続)
 36h ~ 132h ─ hp が徐々に減少 (約 4 日で maxHp → 0)
132h   ─ dying へ移行（≒ 5.5 日放置）
180h   ─ deceased （dying から 48h、合計約 7.5 日放置）
```

数字は調整前提。デザインの意図は「夏休みの旅行（1 週間）で帰ってきたら危篤、
そこから 2 日ある」程度の余裕。学校に行っている間は確実に間に合う。

### 警告と通知

- アプリ起動時に `lifeState` を判定し、`weak` 以下なら通常 UI ではなく
  「お世話が必要だよ」モーダルを最初に出す。
- `dying` 状態のときはホーム画面の演出を控えめにし、学習ボタンよりも
  「世話する」ボタンが目立つよう優先順位を入れ替える。
- ブラウザ通知（PWA の Web Push / Local Notification）は v1 で検討。MVP では
  起動時の検知のみ。

### 死亡からの再スタート

`deceased` になったら以下：

1. 大きく演出はせず、優しい「ありがとう」画面を見せる。
2. 当該 Monster は **図鑑（コレクション）にお墓として残す**。名前・誕生日・
   到達ステージ・累計学習セッション数を記録。
3. 新しいタマゴから次のモンスターを始められる。
4. **持ち越し**：
   - `Wallet` のコインは全額持ち越し（学習で稼いだ努力まで失うのは酷）。
   - `Inventory` の装備・餌も持ち越し。
   - 累計の `StudySession` 履歴も持ち越し（保護者画面で連続性を保つ）。
5. **持ち越さない**：
   - 個体のレベル・経験値・ステージ・好物・装備中のアイテム参照。
   - 名前。新しいモンスターには新しい名前を付ける。

### 設定で「死亡なし」モードに切替できる

- 保護者画面で **「やさしいモード（死亡なし）」** を ON/OFF できる。
  - ON: `dying` まで到達したら自動的に体力を 1 まで回復し、`deceased` にしない。
  - 既定値は **OFF**（死亡あり）。「ペットを大切にする」体験はコンセプトの
    一部であるため、デフォルトでは外さない。
- 小さい子（〜小学校低学年）向けや、初めて触る期間用のセーフティとして提供。

### 設計判断

- 死亡はあるが、**致死までに 1 週間以上の猶予** を設ける。短期間の旅行や
  風邪での休みで死なせない。
- 死亡時に学習履歴・コインを失わせない。学習の努力と、ペットの命は別軸で扱う。
  「世話を怠ると失う」のはあくまでモンスター個体への愛着であって、子供の
  学習成果ではない。
- 死亡演出は静かで短く。トラウマ演出にはしない。
- 「家出」「破壊」など他の喪失バリエーションは入れない。1 軸でシンプルに保つ。

## 4.5 IndexedDB スキーマ（Dexie）

```ts
class KakimonDB extends Dexie {
  monster!: Dexie.Table<MonsterRow, string>;
  wallet!: Dexie.Table<WalletRow, "singleton">;
  inventory!: Dexie.Table<InventoryEntry, [string, "food" | "equipment" | "interior"]>;
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
