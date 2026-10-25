# 07. 3 歳児向け UI/UX の先行事例調査

docs/05-ui-ux.md 5.9 の原則の根拠となった調査メモ。2026-10 時点の Web 調査。
実装に取り込んだものは「→ kakimon」で示す。

## 7.1 ガイドライン・研究から得た設計原則

| # | 原則 | 根拠 | → kakimon |
|---|---|---|---|
| 1 | 「読めない」前提。指示は音声＋視覚、テキストだけのボタンを置かない | [Sesame Workshop 2012 (PDF)](https://joanganzcooneycenter.org/wp-content/uploads/2020/02/SesameWorkshop-2012.pdf), [Google: Designing engaging apps for kids](https://developers.google.com/building-for-kids/designing-engaging-apps) | 問いかけを読み上げ、🔊 で聞き直し。選択肢は絵だけ |
| 2 | 3 歳はアプリ内の音声指示をまだ安定して理解できない（3 歳で約 3 割）。「ボタンが光る」だけの誘導は全年齢で無効 | [Hiniker et al. 2015 (IDC)](http://faculty.washington.edu/alexisr/TouchscreenPrompts.pdf), [PMC: 2〜3 歳のタップ成功率 27%](https://pmc.ncbi.nlm.nih.gov/articles/PMC7303424/) | 「触れば分かる」構造（見本と同じものを押す等）。指示は声＋絵＋光るを重ねる |
| 3 | ジェスチャーはタップ中心。ドラッグは途中で指が離れても部分完了を認める。ピンチ・ダブルタップ・長押し・スワイプは使わない | Sesame, Google | 全プラグインがタップ。せんなぞりは部分完了 OK |
| 4 | 触れた瞬間（touch）に反応させる。子どもは反応が見えるまで強く長く押す | Sesame p.13 | `pointerdown` で押下表示 |
| 5 | ヒットエリアは大きく・離す。画面下端にボタンを置かない | Sesame p.8,10, [UMD: Preschool Fitts' law](https://drum.lib.umd.edu/items/f3e5dc45-7acc-40c6-8dfd-a258b9c0bc9b) | 選択肢 112〜128px、やめる／音は上部 |
| 6 | 無操作時の促しはゲームで 6〜8 秒後 | Sesame p.3,12 | 7 秒で言い直し、14 秒で正解が光る |
| 7 | 不正解は失敗ではなく学びの瞬間。①励まし→②言い直し＋ヒント→③正解をハイライト | Sesame p.3, Google | タップ式エンジンの 3 段階スキャフォールド |
| 8 | 正解のご褒美は内容と選択を反映（「りんご！ せいかい！」） | Sesame p.4 | `answerSpeech` で復唱 |
| 9 | 音・動きは課題に関係するものだけ。装飾音は成績を下げる | [Khan Academy: Pre-K Assessments](https://blog.khanacademy.org/prototyping-playful-and-nimble-pre-k-assessments/), [Hirsh-Pasek 2015](https://www.psychologicalscience.org/publications/educational-apps.html) | 固定 2 音（ピン／ボン）のみ。BGM なし |
| 10 | タイマー・スコア・制限時間・失敗状態を置かない | [Sago Mini World](https://world.sagomini.com/), [Endless Alphabet](https://kidscreen.com/?p=51666) | % を廃止し ⭐1〜3。制限時間なし |
| 11 | ナビは常時見える「ホーム／戻る」だけ。現実世界のメタファーが有効 | [NN/g Children's UX](https://www.nngroup.com/articles/childrens-websites-usability-issues/) | もどる／やめる／ホームのみ |
| 12 | 終わり方を設計する。autoplay で流さず、区切りで「おしまい／もう 1 回」を自分で選ばせる | [UW study (Futurity)](https://www.futurity.org/apps-for-preschoolers-1752232-2/) | 3/5/8 問の区切り、結果画面で同じ大きさの 2 択 |
| 13 | ペアレンタルゲートは大人向けの課題。設定・購入・外部リンクはゲートの後ろ | [Apple Kids](https://developer.apple.com/kids/), Google | 既存の保護者モード（AdminMode） |
| 14 | 保護者向け情報（使い方・進捗・声かけ）を別セクションに | Sesame p.4,14 | 今後: 保護者画面に正答傾向（未実装） |
| 15 | 操作的デザインを避ける（泣くキャラ、カウントダウン、ストリーク煽り、小さい閉じるボタン） | [Radesky 2022 (JAMA Netw Open) 要約](https://deceptive.design/articles/prevalence-and-characteristics-of-manipulative-design-in-mobile-applications-used-by-children) | やめる確認の文言を「また いつでも あそべるよ」に変更 |

## 7.2 先行アプリから取り入れた仕組み

| アプリ | 仕組み | → kakimon |
|---|---|---|
| Khan Academy Kids | ガイド役 Kodi が正解で跳ね、誤答で「もう一回」。言語非依存の「ピン／ボン」音。全テキストはタップで読み上げ | モンスターが応援（既存）＋固定 2 音＋🔊 |
| Sesame Workshop | 3 段階スキャフォールド、6〜8 秒の無操作ヒント、touch で登録 | タップ式エンジンに実装 |
| Lingokids | 活動 1 つ＝星 1 つ、上限付きの小さなループ | 結果の ⭐1〜3、短い区切り |
| トドさんすう | 「きょうのぼうけん」= 1 日 1 本の短い道筋 | ホームの「きょうの あそび」（日替わり・1 タップ開始） |
| Endless Alphabet | 操作中ずっと音が鳴り、正位置で吸着。スコア・失敗なし | せんなぞり: ひよこが指に追随、ゴールで食べる |
| Sago Mini | ルール・制限時間・ポイントなし。世話とマッチングを一体化 | 今後: 「正しい色の餌をあげる」型の学習（未実装） |
| しまじろうクラブ | 使いすぎ防止タイマー、こどもモード | 今後: 保護者設定に 1 日の上限（未実装） |
| ごっこランド | 2 歳から遊べるシンプル操作、1 画面 1 アクション | 選択肢は同時に 3〜4 個まで |
| ワオっち！ | 触ると必ず鳴って動く | 正解の復唱、押下の即時反応 |

## 7.3 3 歳児に向く学習内容

- 色の識別（3〜4 色 → 6 色）: [Kids & Company](https://kidsandcompany.com/wp-content/uploads/Colour-Sort-1.pdf)
- 形（まず「円かどうか」、△□は 4 歳寄り）: 同上
- 1〜5 の数え（1 対 1 対応）: [KLA Schools](https://www.klaschools.com/insights/math-for-3-year-olds)
- 同じ／違う、仲間分け: [SC Ready Set Kindergarten](https://cfec.sc.gov/sites/cfec/files/Documents/Ready%20Set%20Kindergarten/2020-10-22%20Exploring%20Shapes%20Patterns%20Numbers%20Comparisons_compressed.pdf)
- 大きい／小さい（2〜3 者比較）: [東海学院大](https://tokaigakuin-u.repo.nii.ac.jp/record/3703/files/20190511.pdf)
- 動物の鳴き声・絵と音の対応
- 運筆（直線・曲線・ジグザグ）: [HugKum](https://hugkum.sho.jp/216714)
- ひらがなの「読み」（名前の文字など）。書きは読みの後: [HugKum](https://hugkum.sho.jp/144559), [長野県教委](https://www.edu-ctr.pref.nagano.lg.jp/kjouhou/seitoku/ts_ken/ts_k05_01_moji_sa.pdf)
- 難しすぎ: ひらがなの書き・書き順、6 以上の数え、3 段階以上の順序づけ

## 7.4 未実装の候補（次の一手）

- 保護者画面に「得意・不得意」（プラグイン別の 1 回目正解率）を出す。
- 1 日の上限時間（区切りで穏やかに終える）。
- 学習そのものを「お世話」にする（正しい色の餌をあげる＝色の学習）。
- 読み上げの音声品質は端末依存。将来は録音音声に差し替えられるよう
  `speak()` を 1 箇所に集約してある（`packages/plugin-preschool-shared/src/speech.ts`）。
