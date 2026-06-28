# findings 台帳（指摘の引き継ぎ）

監修・専門家の指摘（特に非ブロッキングの🟡）と「人間提案（要承認）」を**イテレーション間で持ち越す**ための
台帳。指揮者が各レビュー後に追記し、showrunner が次の一手の最優先候補として読む。

## 運用
- レビュー直後、指揮者が新規指摘を追記する。
- 🔴 はそのイテレーション内で解決（loop-until-dry）。解決したら `resolved` に。
- 🟡 はスコープ外なら `open` で残す（理由付き）。次回 showrunner が拾う。
- 「人間提案（要承認）」は破壊的/正本改変の候補。人間が判断するまで `proposal` のまま。
- 解決済みは消さず `resolved`（日付）で版を残す（剪定は人間が定期的に）。

## 形式
```
- [status] (severity) source / file:eventID — 指摘の要旨。（round / 日付）
  status   = open | resolved | proposal
  severity = 🔴 | 🟡 | 提案
  source   = story-reviewer | learning-designer | code-reviewer | ai-dx-expert | … | showrunner
```

## 持ち越しバックログ（次の一手・優先候補）

下の日付別エントリに散在する `[open]` 🟡 を、showrunner が次イテレーションで拾いやすいよう優先度順に集約した一覧（2026-06-22 / R5 時点）。詳細・根拠は各日付エントリ参照。**着手したら該当行を resolved にし、ここからも消す。**

### 対応候補（actionable）
1. ~~選択UIの `SelectableItem` 共通化~~ → **[resolved] PR #22**（SelectableCheckItem＋useGlyphSelection 抽出、cpd 7.27%→3.07%）。2026-06-22
2. ~~BacklogPanel.tsx 1307行の分割~~ → **[resolved] loop/backlogpanel-split-20260622**（backlog/PlanningView.tsx・KanbanView.tsx・BacklogShared.tsx へ分割、振る舞い不変・公開API不変・circular無・knip clean）。2026-06-22
3. ~~(物語/学習) S3デイリー requiresFlag回収の過密~~ → **[resolved/部分] loop/s3-recovery-declutter**（D-3: location分散で「1場所1代表」衝突を緩和＝serverroomの山4→2・fraudClue3件を別location維持・rework→warehouse/joushi-deprioritized→client。data のみ・engine無改修・313緑）。2026-06-22
   - [resolved] **根治（engine改修）** → loop/s3-recovery-rotation: drawCandidates に rotate(=beatIndex) を追加し回収の候補化を日替わり巡回。(a)場所の並びをずらし回収場所4件以上でも全場所に出番／(b)同一場所に回収複数でも代表を日替わりに選び直し（agile-expert 指摘の第二の死蔵も解消）。固定順↔日替わりの対比テスト2件＋rotateStart単体テストで実証。pinned 先頭固定・mustForcePinned バイパスは不変。「見せる(候補化)は平等／やる(選択)は1/日」でスクラム的に妥当（agile🟢）。capacity(15=場所×5日)超の極端解放のみ当日内に回り切らない自然な飽和が残る（ソフトロックではない）。全ゲート緑(316)。2026-06-22
   - [記録] D-1（review/retro 移送）は engine 制約で不可（s2-retro 必須で全員 topDown/genbaTrust→単発ビート占有）。上記ローテーションでデイリー上の死蔵を根治したため D-1 不要。
4. ~~(学習・要承認) s2-daily-debt の取り立て連鎖~~ → **[resolved] loop/debt-collection**（総監督承認のもと新フラグ `borrowedDebt`＝types/threads/store登録、s2-daily-debt choice a に setsFlag＋repo debt+2、新イベント s2-daily-debt-collection を**S2に配置＝#3を悪化させず**、undone-debt とは「約束履行」軸で機構差別化（b: trust据え置き）。story🟢/learning🟢/全ゲート緑）。2026-06-22
   - [open] (🟡低) learning/story — 取り立てイベントの surface は requiresFlag共通の確率依存（#3 と同根）／先送りの「利息逓増（複利感）」は任意の磨き込み余地。いずれも誤学習はせず・致命でない。
5. ~~(UX/a11y) ミニゲームの SR/音まわり~~ → **[resolved]**: ①グリフ再マウントは `aria-hidden` で SR 通知対象外・状態は `aria-pressed` が伝え安全（変更不要）／②aria-live 3秒は27字の可読性に必要で短縮せず（変更不要）／③**初回 tick 無音を根本対処** → loop/audio-unlock: sfx.ts に `primeAudio()`（AudioContext を生成＋resume して温める）を追加し、App の最初の pointerdown/keydown で一度だけ呼ぶ。resume 完了前スケジュールの競合を論理的に解消（mobile Safari の初回無音をコードで根治・実機確認に依存しない）。sfx.test.ts 新規4件・全ゲート緑(320)。2026-06-22
   - [open] (任意・実機で観察できれば) VoiceOver で選択ON/OFF が aria-pressed 切替のみで二重読み上げにならないこと（コード上は保証済み・確認は任意）。primeAudio 導入後の iOS 初回 tick が鳴ること（論理的に解消済み・確認は任意）。
6. ~~(物語) s3-daily-stuck-base choice b のリカバリ感~~ → **[resolved] loop/carryover-6-7**（s3側resultTextを先回り↔痛んでから追いついた の非対称に、2文へ圧縮）。2026-06-22
7. ~~(設計・小) Board.tsx bumpCoach→useReducer/useMemo化、Travel.tsx renderRoom/renderMapPin→Room/MapPinコンポーネント化、MiniGameReview revealed分離~~ → **[resolved] loop/carryover-6-7**（振る舞い不変・型統一・dead key除去）。2026-06-22
8. ~~(設計・小／既存) PlanningView draft再同期 / KanbanView retroImprovements二重ルート~~ → **[resolved] loop/kanban-retro-unify**:
   - PlanningView draft: 精査の結果**実害なし**＝プランニング中に officialActive が変わるのは resolveProposal 経由のみ（そこで明示再同期）／toggleForecast・refinePbi は backlogOrder/backlogDone を変えず／セッション跨ぎはモーダル再マウントで再初期化。useState初期値は「作業中の並べ替え保持」の意図で正しく、useEffect再同期を足すと逆に作業破棄の退行になるため**変更せず**。
   - KanbanView retroImprovements: 独立prop を削除し **core.retroImprovements に一本化**（maxReview/wipMax/capacity 全て core 経由）。capacity は maxReview から派生にして二重算出・将来乖離を解消。振る舞い不変・全ゲート緑(320)。2026-06-22

### 歴史的エントリの照合（下の日付別セクションの [open] のうち、上の持ち越しバックログで解消済みのもの）
2026-06-22 時点で、以下の旧 [open] は持ち越しバックログ #1〜#8 で**解消済み**（旧行の線引きは未更新だが現状は resolved）:
- 「選択UI重複/SelectableItem 抽出」→ #1（PR #22）。「BacklogPanel 分割・Board/Travel/MiniGameReview リファクタ」→ #2/#7（PR #24/#25）。
- 「グリフ再マウントSR」「AudioContext 初回無音」「aria-live 短縮」→ #5（精査＋PR #30。SRは aria-hidden で安全・aria-live は可読性維持・音は primeAudio で根治）。
- 「s3-daily-stuck-base リカバリ感」→ #6（PR #25）。「s2-daily-debt 取り立て連鎖」→ #4（PR #26）。「S3回収の死蔵」→ #3（PR #27/#29、engine 根治）。
- 残す open（非対応 or 任意）: shake が disabled 確定ボタンに当たる（reduced-motion 緩和済み・任意）／FINALE ドーマント（意図的・下記）／s3-review-topdown b 支配選択（許容・下記）／実機観察（VoiceOver二重読み上げ・iOS初回tick＝コード保証済み）。

### 対応不要（意図的・記録のみ）
- chapter-01.ts FINALE/exposed系 — 第1章では到達不能なドーマント（「次章へ繰延」明示済み・意図的）。第2章実装時に活性化。
- s3-review-topdown choice b の支配選択化 — 逃げ道復活（R5仕様バグ修正）の必然的帰結。「過ちの精算ビート」局面で許容、resultTextの抑制表現で過剰報酬の誤学習も回避済み（learning-designer判定：致命傷なし）。
- 用語「フォーキャスト」→「スプリント予測」（公式日本語訳準拠）= **[resolved] PR #23**（2026-06-22・バックログ外の総監督依頼）。

<!-- ここに指揮者が追記する。 -->

### 2026-06-28 / playtest-triage（D ティック / S2デイリー診断 / #270〜#272）

#### 起票
- [resolved] (🔴) playtest-critic / events-sprint2.ts:全般 — S2デイリー c択が30件中3件のみ、中盤から b押し作業化。issued: #270 → PR #273（pair+security に c択追加・2ラウンドで dry）
- [open] (🔴) playtest-critic / events-sprint2.ts:s2-daily-return — c択と a択が同着地（信頼−）でエージェンシー消失。issued: #271
- [open] (🔴) playtest-critic / events-sprint2.ts:advocacy全般 — PO/SM/dev 3役が毎回同方向で役割固定・読み飛ばし常態化。issued: #272

#### 未起票（次回候補）
- 未起票 (🟡) s2-daily-debt が MVP 直後で早すぎる減速感（配置問題・影響評価要）
- 未起票 (🟡) persuade系 hearingOptions が死にデータ化（横断対応・設計相談要）

#### 🟢 強み（記録のみ）
- s1-retro クリフハンガー・s2-retro 3択化・s1-daily c択充実度は検収 OK

### 2026-06-26 / playtest-triage Tick 70（S3 planning / S3 最終 review / S2 daily ナレーション）

#### 起票
- [open] (🔴) playtest-critic / events-sprint3.ts:s3-plan-handoff — 完全2択、最終スプリント幕開けの重みがない。issued: #257
- [open] (🔴) playtest-critic / events-sprint3.ts:s3-review(既定)/s3-retro — S1と「正直vs取り繕う」同軸、tier/deduction 未実装。issued: #258
- [open] (🟡) playtest-critic / events-sprint2.ts:s2-daily-promise-gap/grounded-core — ナレーションが過去選択を先回り要約、能動感喪失。issued: #259

#### 未起票（上限外・次回候補）
- 未起票 (🟡) playtest-critic / events-sprint3.ts:fraud アーク — 選択単調（蓋をする/記録に残すの2択固定・#241 intensity とは別角度「踏み込み度の第三択」）。次 triage 候補。
- 未起票 (🟡) playtest-critic / 横断 — hearing good/bad パターン予測可能（good=上2択・bad=下3択の固定配置を学習される）。横断改修なので人間と要相談。

#### 🟢 強み（記録のみ）
- S3 daily c択のベクトル設計（別ベクトルの c が手応えを生んでいる）
- S1 review persuade tier が秀逸（S3 最終 review への移植が処方箋）
- fraud アークのクリフハンガー（引きは満点・選択が追いついていない）

### 2026-06-26 / playtest-triage Tick 66（直近改善の検収 + S2中盤〜S3後半）

#### 検収（直近3件）
- ✅ [resolved] #245（S1 hearing bad 型固定）→ PR #248 で罠択追加。脊髄反射選択が崩れている。
- ✅ [resolved] #246（S1後半 deduction ゼロ）→ PR #249 で s1-daily-5s に推理追加。ジュース空白帯解消。
- ✅ [resolved] #247（S1 retro 3連飽和）→ PR #250 で b/c 差し替え + S2 冒頭受け。スプリント跨ぎの引き確立。

#### 新規指摘
- [open] (🔴) playtest-critic / events-sprint3.ts:S3デイリー全般 — ほぼ全回が「a=取り繕う/b=正直」の2択、第三択/deduction/tier演出がゼロ → こなし作業化。issued: #251。
- [open] (🔴) playtest-critic / events-sprint3.ts:s3-review系 — 3バリアントの読み味が同一（topDown版に挽回分岐を足すと周回差分が立つ）。issued: #252。
- [open] (🟡) playtest-critic / events-sprint2.ts:s2-retro — retroレバーのクリフハンガー締め文が b/c 完全同一。2周目に「選択が物語を変えた」実感がない。issued: #253。
- 未起票 (🟡) playtest-critic / events-sprint2.ts:s2-daily-promise-gap / s2-daily-grounded-core — 回収の「答え合わせ感」でナラティブが長く説明的・能動感が低い。上限外（今回3件のみ起票）→ 次 triage 候補。

#### 🟢 強み（記録のみ）
- S2 fraudアーク（ghost-stock→circular）が断トツで没入感が高い。「教育ゲームを忘れる」唯一の縦糸。
- `s2-daily-showcase-visit`（視察団 vs 田淵さんの手書き台帳）の対比演出が秀逸。
- `s2-daily-return` の3択（観察/ヒアリングシート/計測仕込み）が手本的な密度を持つ。

### 2026-06-26 / playtest-triage Tick 62（S1 全体 + Prologue + S2 序盤）

- [open] (🔴) playtest-critic / events-sprint1.ts:S1中盤 hearing bad — 「流す/決めつける/横着」3連型固定で4イベント目以降は文面読まずに機械選択。issued: #245。
- [open] (🔴) playtest-critic / events-sprint1.ts:S1後半 deduction ゼロ — deduction が前半4件に集中・S1後半はジュース空白帯。issued: #246。
- [open] (🟡) playtest-critic / events-sprint1/2.ts:s1-retro→s2-plan — 買収フック3連飽和・S2冒頭で受けない。issued: #247。
- 🟢 強み: 機会コスト設計（s1-daily-warehouse c・trust依存分岐・状態依存の周回性フック）は一流。s1-daily-rough の罠設計を中盤へ横展開すると解毒剤になる。
- 未起票: Prologue onCast 物量離脱 🟡 → #212（プロローグ開幕ラッシュ）#229（二重任務折りたたみ）は Done 済みでまだ残存する問題。さらなる情報密度軽量化は将来候補。

### 2026-06-28 / playtest-triage（全スプリント通し・D ティック）

#### 起票
- [open] (🔴) playtest-critic / events-sprint*.ts:resultText 全般 — 全択・全スプリントで「採点コメント」化（機会コスト注釈が毎回付き余韻が冷める、c択5〜6行）。issued: #263。
- [open] (🔴) playtest-critic / events-sprint3.ts:s3-daily-circular/soumu-paper/keiri-closing — fraud アーク裏取り3種が「a=蓋/b=記録」完全同型2択で3連。クライマックスが安くなる。issued: #264（pending「踏み込み度の第三択」の本命起票）。
- [resolved] (🔴→false positive) playtest-critic / 横断:hearingOptions — MiniGameHearing.tsx が既に shuffle(hearingOptions, seed) 実装済み・配置均等（各位置18-25%）。#265 をクローズ。2026-06-28。

#### 未起票（上限外・次回候補）
- issued: #270 (🔴) playtest-critic / events-sprint2.ts:S2デイリー全般 — 3択拡張の外側で a=warn/b=正論 骨格が5連以上続く帯がある（s2-daily-exception/anxiety/return 等）。🔴①。
- [resolved] (🔴) playtest-critic / events-sprint2.ts:s2-daily-return — c択とa択が同着地（信頼−）でエージェンシー消失。issued: #271 → PR #276 で insight+2 に引き上げ・b支配解消。2026-06-28。
- issued: #272 (🟡→🔴) playtest-critic / 朝会 advocacy/hints — 3役（PO=価値/SM=プロセス/dev=技術）の役割分担が毎回固定・予定調和で読み飛ばす。🟡⑤。

#### 🟢 強み（記録のみ）
- `s1-physical-ai-showcase`：映像コントラスト（ロボット vs 手書き台帳）＋謎の引きが抜群。横展開価値大。
- `s3-review-topdown` c択（崩れたデモを止めて田淵の手順を見せる）：選んだ甲斐が最大。周回性の核。
- `s2-retro-cap/wip`：前スプリントレバーの callback で「覚えていてくれる」感覚が機能。

### 2026-06-26 / playtest-triage Tick 59（S3 fraudCase アーク・escalation）

- [open] (🔴) playtest-critic / events-sprint3.ts:fraudCase系 — 章中に fraudCase 着地ビートが無く3段階の引きが徒労感で終わる。issued: #240。
- [open] (🟡) playtest-critic / events-sprint3.ts:s3-daily-circular 等 — fraudCase 3段の intensity 均一、3段目に緊張感の格差なし。issued: #241。
- 🟢 強み: s2-daily-ghost-stock 入口（棚卸で機材消失）は一級のつかみ。s3-daily-circular の「書類の上だけグルグル回る」ディテールも秀逸。
- 未起票: S3 最終レトロ「プツッと切れる感」→ #163/#208（closed）と重複リスク高、今回見送り。
- 未起票: S2 c択（debt/demo/ai-eval）体験質 → PR #237 inReview で対応中につき見送り。

### 2026-06-24 / playtest-triage Tick 20（推理演出・章末余韻・S1物量）

- [open] (🔴) playtest-critic / events-sprint*.ts:全推理イベント — 的中演出ゼロ・miss文同トーンで推理ドリル化。issued: #162。
- [open] (🔴) playtest-critic / events-sprint3.ts:s3-retro 系 — 最終レトロが普通のデイリーと同フォーマットで3スプリント達成感が着地しない。issued: #163。
- [open] (🔴) playtest-critic / events-sprint1.ts — S1デイリー中盤「a=warn・b=正解」固定で早期パターン学習→S1作業化。issued: #164。
- 🟢 強み: s1-physical-ai-showcase「線の上を走るロボット/5m横は田淵さんの手書き台帳」の落差演出を横展開すべき。未起票（強み記録）。
- [resolved → issued] (🟡 Tick13持ち越し) playtest-critic / events-sprint*.ts:deduction — 推理パートのミス選択肢全件同トーン → #162 に吸収（miss文多様化を受け入れ条件に含めた）。

### 2026-06-24 / playtest-triage Tick 16（S1〜S3 再評価）

- [open] (🔴) playtest-critic / events-sprint2.ts〜sprint3.ts — S2後半〜S3で「warn=罠・b=正解」メタ法則が固定化し本文を読まずに正解できる。issued: #155。
- [open] (🔴) playtest-critic / events-sprint3.ts — S3デイリーで「移譲・属人化」モチーフが7回反復し中盤に達観離脱が起きる。issued: #156。
- [open] (🔴) playtest-critic / events-sprint2.ts〜sprint3.ts:fraudClue系 — 不正暴露アーク各回の結末が「おあずけ一本調子」で3回目に熱が冷める。issued: #157。
- 🟢 強み再確認: つかみ（Prologue→s1-plan-goal→倉庫）一級品／s1-physical-ai-showcase が基準点／c択・文脈依存設計が退屈の特効薬（この方向に章後半を拡張すべき）。

### 2026-06-24 / playtest-triage Tick 13（S1〜S3 通しプレイ）

- [open] (🔴) playtest-critic / events-sprint2.ts — S2前半 s2-daily-idea/pressure/pair の2択+warn 3連打でパターン学習される。#149後も残存。issued: #151。
- [open] (🔴) playtest-critic / events-sprint2.ts:s2-daily-ghost-stock — fraudClue を逃した場合にS3最大の縦糸（循環取引アーク）が無音欠落し、プレイヤーが気づけない。issued: #152。
- [open] (🟡) playtest-critic / events-sprint3.ts — S3デイリーが requiresFlag 回収イベントの渋滞で「精算一色」になり前向き達成回が少ない。未起票（Tick13上限外）。→ Tick16 #156 で吸収。
- [open] (🟡) playtest-critic / events-sprint*.ts:deduction — 推理パートのミス選択肢が全件「惜しいけど違う」同トーン。未起票（Tick13上限外）。→ Tick16 🔴155-157 優先で引き続き持ち越し。
- [open] (🟡) playtest-critic / events-sprint1.ts — S1デイリー30回超の物量で中盤横並び。未起票（Tick13上限外）。→ 同上持ち越し。
- 🟢 強み記録: s1-physical-ai-showcase の「田淵さん vs ロボット」コントラスト・fraudClue→fraudCase 縦糸・S2レトロ topDown/genbaTrust→S3レビュー直結 はそのまま伸ばすべき。

### 2026-06-22 / loop/review-capacity-per-day（レビュー容量の「1日あたり化」再設計＋AI/人レビュー配分フレーミング）

総監督要望: (a)「1日で全部投入できる」不自然さの解消＝日次ペーシング／(b) AI駆動のスピード感（2日目に手詰まりにせず工夫で多く消化）／(c) 全完遂不可はOKだが現状2〜3itemは少なすぎ／(d) 表現は「価値はレビュー」でなく「AIにどこまでレビューさせ、人がどれぐらい確かめるか」の配分。agile-expert 2回考証で per-day 値を 2→3→**4** に収束。

- engine: `REVIEW_CAPACITY=6`(プール/sprint)→`REVIEW_CAPACITY_PER_DAY=4`。advanceCore で **daily ビート進入時に reviewCapacityFor(retroImprovements) へリセット・繰り越しなし**（旧スプリント境界リセットを置換）。resolveSprintBacklog の容量リセット除去（日次資源化）。capacityレバー=+1/日・WIP=2据え置き・TIER(great1.5)経路維持＝スキルで高スループット。`DELIVERY_TARGET` 6→9（スループット増で delivery 項の早期飽和を回避）。
- 表現: 「価値はレビュー」断定を全削除→配分フレーミング（KanbanView/HowToPlay/glossary{{制約理論}}{{レビュー}}/STORY§3,§4.4,§5/s1・s2-retro capacityレバー）。深さ=浅い「AIに任せて速く通す」/深い「人が確かめる」。容量0時「明日のデイリーで回復・使い切り」明示。
- レビュー: code-reviewer（🔴は crossedSprintBoundary 変数名の可読性指摘＝バグでない・コメント追記で defuse）／agile🟢（仕様一致）／story🟢（配分フレーミング完遂・§3.5→§3 修正）。全ゲート緑(321/build/size161.69<164/e2e/lighthouse)。
- [open] (要プレイテスト/監修) 日次化でスループット約3倍。**LEGACY_SHIP_THRESHOLD=2 / deprioritizedJoushi・Genba フラグ / DELIVERY_TARGET(item基準)** が「容量に余裕がある世界」で死に機構化/緩みすぎないかを実機プレイで実測し、必要なら閾値再調整（forecast上限・PBI総量・閾値）。今回コード値は DELIVERY_TARGET のみ調整、他は据え置き。
- [参考] 憲章は「4スプリント」だが実装/STORYは3スプリントで一貫（既存の doc 乖離・本件範囲外）。

### 2026-06-22 / loop/all-agents-review-r6（全エージェント総出レビュー R6＝#20〜#32 反映後の再点検）

専門家5＋監修3を現状 main 全体に並列適用。R5以降の大量マージ（用語リネーム・BacklogPanel分割・負債連鎖・S3ローテーション・音unlock 等）の再点検。

- [評価] code-reviewer 🔴2 はいずれも**誤検知**: PlanningView doneSet stale（commitBacklogOrder は backlogOrder のみ変更・backlogDone 不変）／MiniGameReview useEffect focus（confirmRef は revealed 時のみ描画＝useEffect が正しい）。learning の「カルゴ物流が画面に出る」も誤解（EVENTS=localizeDeep で表示時に翠流物流へ置換）。→ R6 実🔴ゼロ。
- [resolved] (🟡) fde / events-sprint2.ts s2-daily-debt-collection b — 「利息がつかず」が冒頭「利息はもう数え始めている」と矛盾 → 「利息が積み上がる前に止めたぶん累積は小さく済み」に是正。
- [resolved] (🟡) logistics / events-sprint3.ts s3-review-topdown/trust — 「自動化したピッキング/自動仕分けの本番稼働」が第1章「自動化はまだ夢・土台のIT化が先」と乖離 → 「写真入力の叩き台から育てた“ピッキング照合の自動チェック”（現品データと棚番マスタを突合しずれを弾く・派手なロボットではない）」にリスコープ。topdown=崩れ/trust=現場の勘で弾く の対比は温存。logistics🟢/learning🟢で確認。
- [resolved] (🟡) learning / precepts.ts — debt-collection と undone-debt が同一タグ[97,13] → debt-collection を[97,78]（78「口頭合意を信じるな、形にしろ」＝口頭の約束をバックログ期日へ形にして履行）に差別化。
- [resolved] (🟡) story / events-sprint3.ts s3-daily-stuck-base b — 機会コスト明記の揺れ → b に「その場しのぎで見せる側の信頼+は取り逃す＝根治に賭けた機会コスト」を追記（a の trust+1 と対応）。
- [resolved] (🟡) code-reviewer / KanbanView — flat prop と core の二重管理（sprintForecast/inProgress/reviewCapacity/aiTokens＋inProgSet）を core 経由に一本化（retroImprovements 一本化の延長）。
- [open] (🟡/設計) code-reviewer / KanbanView doneSet — core.backlogDone と二重だが ProductBacklogReadOnly への受け渡しで設計判断が要るため据え置き。
- 監査サマリ: 専門家 fde🟢/agile🟢/ai-dx🟢/logistics🟢/robotics🟢・監修 story🟢/learning🟢/code🟢。Round3→4 で dry（実🔴ゼロ・対応すべき🟡ゼロ）。全ゲート緑（vitest320/circular/knip/type-coverage99.72%/cpd<2%/build/size161.7kB<164/e2e3-3 axe/lighthouse）。

### 2026-06-20 / loop/ux-select-feedback-20260620（選択フィードバック: tick音+check-pop）

- [resolved] (🔴) code-reviewer / MiniGameHearing.tsx — 上限2ガードが stale クロージャの `picked.length` 依存で、連打（同一レンダー内の複数 toggle）で3件選択され得た。→ `setPicked` updater 内に `p.length >= 2` の二重ガードを追加し状態を権威化、`sfxTick` は updater 外維持で StrictMode 音重複も回避。（round1→2 / 2026-06-20 / PR #3）
- [resolved] (🟡) ux-engineer+reviewer / minigame/*.tsx — ring 薄い(/40→/60)・OFFグリフ暗い(slate-500→400)・Review上限なしのコメント欠如・Review内 `tone` 変数名被り(→cellStyle)。in-scope の4件を修正。（round1→2 / 2026-06-20 / PR #3）
- [open] (🟡) code-reviewer / minigame/*.tsx — `<span key={on?'on':'off'}>` のグリフ再マウントでアニメをリセットする手法は、SR（NVDA/VoiceOver）が button 内 DOM 変化をコンテンツ変更として通知する可能性。実機VoiceOver確認が必要。代替: `@starting-style`/`animation-play-state` で DOM 再マウントを避ける。（round1 / 静的判断の範囲、要実機）
- [resolved] (🟡) ux-engineer / minigame/*.tsx — check-pop は ON 時のみ。OFF時に色変化のみ。→ Issue #5 で `check-unpop`（控えめな縮みフェード）を追加。初回ロードの全OFFでは出さない（touchedRef でガード）・reduced-motion 無効。（2026-06-20 / Issue #5）
- [resolved] (🟡) ux-engineer / MiniGameHearing.tsx — 上限2到達後の3つ目タップが完全無反応で誤認され得る。→ Issue #5 で確定ボタンの shake ＋ `role=status aria-live=polite` 補足「すでに2つ選択中…」を追加（3秒で自動解除・再タップで延長、reduced-motion 無効、権威ガード不変）。（2026-06-20 / Issue #5）
- [open] (🟡) ux-engineer / engine/sfx.ts — AudioContext suspended（mobile Safari 等）で初回 tick が無音になり得る。tick は毎クリック鳴るため気づかれやすい。ただし sfxDecide/sfxSpin と共通の既存課題で新規ではない。（round1）
- [resolved] (提案) showrunner / data/seeds.ts:25 — `legacy-bridge` シードが懲罰分岐(`missedUpgrade`)でしか拾えず他5種と非対称。→ Issue #4 で中立イベント `s1-daily-legacy` choice b に seedId バインド追加し対称化（missedFlag の排他構造で二重発見は起きず冪等）。（2026-06-20 / Issue #4）
- [proposal] (提案) showrunner / components/Board.tsx:44 — localStorage boolean の try/catch 定型が4箇所重複。コード品質レーンの小リファクタ候補。
- [open] (🟡) quality-gatekeeper / minigame/MiniGame{Hearing,Review}.tsx — 選択UI(`<button>`+チェックグリフ)が両ファイルで重複（cpdクローン、今回22→26行に微増）。既存クローンの延長で新規ではないが、`SelectableItem` 共通コンポーネント抽出のリファクタ候補。設計判断のため別イテレーション。

### 2026-06-20 / Issue #4 / loop/legacy-bridge-seed-20260620（legacy-bridge 発見導線の対称化）

- [resolved] (🟡) story-reviewer / events-sprint1.ts:397,406 — s1-daily-legacy の choice a と b で「20年分の業務知識が埋まった」を逐語重複し読み味が単調。→ b の resultText を「承認フローを設計条件に組み込むと、20年ものの基幹を捨てず安全に橋渡しする道筋が立った」へ言い換えて解消（a は不変）。（round1→2 / 2026-06-20 / Issue #4）
- [resolved] (🟡) logistics-expert / events-sprint1.ts:406 — 「橋渡し」の対象が抽象／「読み解くと…見えた」の即時性が現場感覚より軽い。→ 上記 b 改稿で対象を「20年ものの基幹」に明示し「道筋が立った」へ。（round1→2 / 2026-06-20 / Issue #4）
- [open] (🟡) learning-designer+fde / events-sprint3.ts s3-daily-stuck-base choice b — 同一 seed legacy-bridge を s1（先回りの発見）と s3（リカバリ）の両方が出すため、s3 側 resultText の語り口を「種を見つけ損ねたが橋渡しの価値に追いついた」等リカバリ感に寄せると学びが明確化。**今回スコープ外（s3 は触れない指示）** のため次イテレーション候補。（round1 / 2026-06-20 / Issue #4）
- 考証/監修サマリ: fde🟢・logistics🟢・story-reviewer🟢・learning-designer🟢。round2 で 🔴ゼロ・対応すべき🟡ゼロ → dry。

### 2026-06-20 / Issue #5 / loop/select-feedback-allstates-20260620（選択の手応えを全状態で揃える）

- [resolved] (🔴) code-reviewer / index.css:63, MiniGameReview.tsx:12 — スコープ外の引用符の意図しない変更（diff 汚染）。→ U+201C/U+201D にバイト単位で復帰。（round1→2 / 2026-06-20 / Issue #5）
- [resolved] (🟡) code-reviewer / MiniGameHearing.tsx — limitHit タイマーが再タップで延長されない（useEffect 依存の state 変化頼み）。→ toggle 内で clearTimeout→setTimeout し延長、useEffect は cleanup 専用に。（round1→2 / 2026-06-20 / Issue #5）
- [resolved] (🟡) code-reviewer / MiniGameHearing.test.tsx — 新規 limitHit 演出のテスト不足。→ aria-live 表示／3秒後解除／再タップ延長の3テストを追加（vi.useFakeTimers）。239件緑。（round1→2 / 2026-06-20 / Issue #5）
- [open] (🟡) code-reviewer / MiniGameReview.tsx — revealed フェーズと選択フェーズが同一 map 内に同居し、revealed 分岐では glyphKey 等の計算が未使用になる。将来の混入リスク。コンポーネント/関数分離のリファクタ候補（設計判断・スコープ外）。（round1 / 2026-06-20 / Issue #5）
- [open] (🟡) code-reviewer / MiniGameHearing.tsx — 上限 aria-live は3秒残る。VoiceOver/NVDA は空化を無音で行うため、2s 程度への短縮余地（任意・微調整）。（round1 / 2026-06-20 / Issue #5）
- [open] (🟡) code-reviewer / MiniGameHearing.tsx — disabled の確定ボタンに shake が当たる組み合わせ（reduced-motion で緩和済み・許容範囲）。shake 対象を別要素にする案は任意。（round1 / 2026-06-20 / Issue #5）
- 監修サマリ: code-reviewer（設計＋a11y）round2 で dry（🔴ゼロ・対応すべき🟡ゼロ）。a11y は ux-engineer 実機自己点検＋e2e axe でも担保。

### 2026-06-22 / 総監督直接GO / loop/all-agents-review-20260622（全エージェント総出レビュー R5＋仕様バグ監査）

専門家5＋監修3を現状main全体に並列適用→makerが修正→再考証をdryまで反復。総監督指示「仕様バグ（後でゲームが成立しなくなる矛盾含む）は絶対に直す」を受け、ゲーム整合性の敵対的監査を追加実施。

- [resolved] (🔴相当) code-reviewer / minigame/MiniGameDev.tsx:57 — `window.setTimeout(onResolve)` がアンマウント未クリア（420ms以内のアンマウントで unmounted 後 onResolve 発火の latent バグ）。→ timerRef 化＋useEffect cleanup で clearTimeout。さらに onResolveRef で stale closure も塞ぎ Roulette の escapeRef パターンに統一。（round1-3 / 2026-06-22）
- [resolved] (🔴/仕様バグ) engine監査 / events-sprint3.ts:702-733 s3-review-topdown — 単発レビューの強制イベントが2択とも trust− で、trust=1到達時に回避不能の強制失敗（兄弟3イベントは安全選択あり＝不変条件違反）。総監督承認の上、choice b を `{insight:1,trust:-1}`→`{insight:1}` にし逃げ道を復活、resultTextを整合書換。story🟢/learning🟢（観点1-2強化）。（2026-06-22）
- [resolved] (🟡) 複数 / cast.ts — canonical「カルゴ物流」表記とSTORY.md表示名「翠流物流」の乖離→読み替え注記を追記。（round1）
- [resolved] (🟡) agile / events-sprint1.ts:773 s1-review・:807 s1-retro・events-sprint3.ts:731 s3-review-topdown・:855 s3-retro-trust — forecast/commitment語法の混線・レビュー/レトロ役割境界・DoD未達の完成扱い明示。fortcast語法をキャンペーン全体で統一。（round1-3）
- [resolved] (🟡) story / events-sprint3.ts:673 s3-daily-craft — 久遠同席前提のhearingを自己内省/田淵向けに再ターゲット（場面二重化解消）。（round1）
- [resolved] (🟡) learning / events-sprint3.ts:531/564/595 boundary/lastman/drive — 「責任引受＝無条件に得」の支配選択化を、メーター値不変のままb resultTextに機会コスト一文をadditive追記し緩和。（round1）
- [resolved] (🟡) ai-dx / glossary.ts:162 RAG・logistics / locations.ts:40 serverroom — 説明補強（ハルシネーション抑制の狙い／出荷停止の主語を基幹WMSへ）。（round1）
- [resolved] (🟡) code-reviewer / Roulette/Travel/MiniGameDev — prefers-reduced-motion スナップショット重複→ usePrefersReducedMotion フックに共通化。MiniGameDevPuzzle のフォーカスを confirmRef+useEffect 方式へ統一・data-initial-focus 表記統一・full二重フォーカスをhasFocusedRefで1回化。（round1-3）
- [open] (🟡) engine監査 / events-sprint3.ts S3デイリー群 — requiresFlag回収イベントがS3デイリー5枠に対し過密で、1周回で解放された回収の一部が死蔵しうる（進行は止まらない＝体験ムラ）。「1周回で確実に拾える上限」の設計課題。次イテレーション候補。
- [open] (🟡) engine監査 / chapter-01.ts FINALE/exposed系 — 第1章では finalEndingFor が常に finalePending:false で到達不能なドーマント（コメントで「次章へ繰延」明示済み・意図的）。第2章実装時に活性化。
- [open] (🟡) learning / events-sprint3.ts:726 s3-review-topdown b — 逃げ道復活の必然的帰結でbがメーター上の支配選択（aは二重罰）。「過ちの精算ビート」局面では許容範囲・resultTextの抑制表現で過剰報酬の誤学習は回避済み（learning-designer判定：致命傷なし・再修正不要）。
- [open] (🟡) learning / s2-daily-debt — 技術的負債を借りる選択に取り立て連鎖が無く「借りた者勝ち」誤読余地。setsFlag/新イベント接続=mechanics改変につきスコープ外。
- [open] (🟡/設計) code-reviewer / BacklogPanel.tsx 1307行・state machine union化、Board.tsx命名/IIFE、Travel.tsx renderRoom/Pinコンポーネント化 — リファクタ規模大・設計判断。別イテレーション。
- 監査サマリ: 専門家fde🟢logistics🟢robotics🟢ai-dx🟢agile🟢／監修story🟢learning🟢code🟢。**ゲーム整合性: ソフトロック/クラッシュ/到達不能/結末不定の🔴ゼロ**（エンディングは`match:()=>true`＋`?? endings[last]`で二重網羅・フラグ配線はthreads.test/term-coverage/game.testで構造担保・discoversPbi手動検証OK）。全ゲート緑（vitest313/build/size160.47kB<164/CSS9.15<10/e2e3-3 axe/lighthouse）。round3＋仕様バグ修正再考証で dry。

### 2026-06-22 / loop/review-minigame-pbi-cases（レビューミニゲームのバリエーション拡充＋PBI内容連動）

総監督要望: レビューミニゲームのバリエーション増・タスク内容に一致。AIが各タスク用に生成した成果物を人がレビューする14作問（PBI 1対1）に作り替え。dealReview(seed, pbiId) で一致作問を優先。size 増は MiniGame の lazy 化＋hearingTheme.ts 抽出で吸収（JS 156kB）。

- 考証: ai-dx🔴2（return-flow状態値/monitoring restore不可逆）＋misship「常に真」誤り→修正済。logistics🟢（現場リアル・棚番中央桁/夜勤日跨ぎ等が秀逸）。learning🟢（過信罠が全14件一貫）。code🔴（orphanテスト欠如→reviewCasePbiIds export＋逆方向テスト追加）。全ゲート緑(325)。
- [open] (🟡低・磨き込み) logistics: return-flow の良品/不良品分別、stock-reconcile の引当を差異計算に載せる設計、night-shift の保留品所在共有 等、現場リアリティ深掘り余地（issue:false 空振り枠で一部活用済）。
- [open] (🟡低) learning: コード系作問(===/時刻文字列比較/SELECT等)の専門語が glossary 未登録で初心者負荷・難易度カーブがコード系に偏る。設計コメントの slopsquatting 記述が実装と不一致。
- [open] (🟡設計) KanbanView の depthFor＋pending 2state を単一 state machine 化／minigames の allGood/allBad が persuade を型でなく実装で除外。

### 2026-06-22 / loop/pbi-sbi-split（PBI→作業項目(SBI)分割のフル機構）

総監督要望「PBIはSBIになる時に分割されるものもある、それも表現したい」→「フル機構（本格分割）」を採用。プランニングで予測内の split 定義持ち PBI を作業項目(SBI)へ分解（splitIntoSbi）。SBI id=`${pbiId}#${n}`。各 SBI を独立に着手・レビューでき、全 SBI 完了で親 PBI を納品（deliveredPbiIds）。velocity は SBI 配分pt合計、顧客価値/legacy/deprioritized は親射影で従来挙動と恒等（SBI不在では identity＝安全弁）。split 定義は3PBI（veteran-hearing/misship-mvp/dashboard-selfserve、各スプリント1つ・全5pt）。glossary に「作業項目」追加。

- 考証: agile🟢（Topic Three として正確・割らない裁量＝Developers discretion・納品はPBI単位）／learning🔴1（作業項目がglossary未登録→登録済）＋🟡（割らない機会コストを文言化→title補強済）／code🔴1（PlanningView selected.findIndex O(n²)→Map化済）＋🔴1（draft/officialActive乖離・理論的=defer）／story🟢（文体整合・UI=作業項目/内部=SBI分離徹底）。全ゲート緑（vitest334/build/size156.8kB<164/CSS9.2<10/e2e3-3 axe/lighthouse）。
- 修正済: canStart の PBI_BY_ID.has→isKnownPbi（SBI着手不能バグ是正）、glossary「作業項目」登録、O(n²)解消、機会コスト＆「一片Done≠納品」文言、PBIスペース表記統一。
- [open] (🟡低・defer) code-reviewer: PlanningView の draft state と外部 backlogOrder の乖離は構造的には可能だが本ゲームでは backlogOrder がプランニング中に変わらず実害なし。LegacySummary の deliveredPbiIds 毎レンダー走査（backlog固定サイズ）、canAddToForecast/canStart の backlogDone.includes が O(n)、KanbanView unrefinedPbis の Set化不一致——いずれも微小perf・別イテレーション。
- [open] (🟡低) agile/learning: glossary desc 内の生「PBI」（既存慣習どおり・desc単体では未定義略語）。split を持つのが5pt大物3件のみで「なぜこの3つだけ分割可能か」は暗黙（split定義の有無）。

### 2026-06-22 / loop/event-pbi（イベントでPBIが追加される／スプリントに割り込みで頼まれる機構）

総監督要望「イベントでPBIが追加されたり、スプリントに加えてくれと頼まれる」→既存の3イベント（s1-daily-scope/s2-daily-goalcreep/s3-daily-scope-creep）に Choice.addsPbi を配線（“すでにそれっぽいイベントがある、それを使って”の指示どおり既存を活用）。新フィールド addsPbi:{id,toSprint?}＝toSprint:true は今スプリント予測へ割り込み（容量超過→キャリーオーバーで代償）、false はプロダクトバックログへ暫定見積りで積む（revealPbi へ委譲）。EVENT_BACKLOG（origin:'event'、3要望PBI）。同じ要望で「断れず今やる」vs「次のため形に残す」を対比。

- 考証: agile🟡（s2割り込み＝ゴール危うくする変更の論点／PO所有・即Readyの簡略化／s3-bプロダクトゴール語義）／learning🟡（“割り込み＝常に悪”の単一価値化リスク・ResultModal無条件文言）／story🟡（s3-b label語義・s3-a trustトーン差）／code🔴（origin'hearing'×discoverable重複・EVENT_BACKLOGがdiscoverable:trueでisDiscoverablePbi破綻）＋🟡数件。
- 反映済: origin型を'event'のみに簡素化＋EVENT_BACKLOGからdiscoverable除去（発見可と排他・isDiscoverablePbi正常化）、acceptRequestedPbi false-pathをrevealPbi委譲＋toSprintにsprintForecast二重追加ガード、restore補完コメント明示。narrative-designerがs2/s3-aに“PO再交渉した差し替えは正道”の幅を追記（単一価値化回避）・s2-aにゴール危うくする変更の論点・s1-a“積む＝悪”を“リファインメントせず放置が悪”へ・s3-b label→プロダクトバックログ最上位。ResultModal toSprint文言を条件付き（容量を超えれば…PO再交渉）へ。
- [open] (🟡低・defer) code: addsPbi.toSprint を optional のままにした（??false、ergonomics優先）。PBI_BY_ID 3配列合流＋出所再判定は将来 origin 必須化で簡素化余地。KanbanView/progression のCPDクローン（閾値内）。
- [open] (🟢設計判断) s3-a の trust 不付与は narrative-designer 判断で意図的維持（成功機運下で焦点だけ溶ける最も苦い型）。
- 全11ゲート緑（typecheck/lint/test344/circular/knip/typecov99.73%/cpd/build/size157.73kB<164/CSS9.2<10/lighthouse/e2e3-3 axe）。

### 2026-06-22 / loop/all-agent-review-r7（R7/R8全エージェント＋ミニゲーム多様化＋レビュー容量の絞り込み）

総監督の連続フィードバック2件を反映（同一ブランチ）。
1. 「連続レビューで同じミニゲームは面白くない」→ dealReview に variety を追加。初回は題材一致、再レビュー/同じ親PBIの別SBIは題材一致を避けて別作問へ巡回（KanbanView が項目×進捗×SBI位置でシード/variety算出）。
2. 「レビュー余力を簡単に使い果たし後半が空デイリー。1日のレビューを絞るのが先決」→ REVIEW_CAPACITY_PER_DAY 4→2（深いレビュー=1日1件）。予測の目安を「1日容量」から「スプリント全体容量＝1日×デイリー日数(=5)」へ付け替え（reviewBudgetForSprint/dailyBeatsInSprint）。日次上限で作業がスプリント全体に散り、後半の空デイリーが解消。

- 考証: agile🔴(progression.ts DELIVERY_TARGET コメントの旧値=4)＋🟡(STORY.md/テストコメントの=4残存・forecast10pt vs実効7-8pt の慢性キャリーオーバー懸念=要プレイテスト)／ux🔴(KanbanView が日数を capacity/maxReview で逆算→PlanningView と計算路非対称)＋🟡(lgツールバー予測のスコープ無表示・over文の式非対称・「コスト2=1日1件」圧縮)。
- 反映済: DELIVERY_TARGET コメントを2基準へ更新、STORY.md §4.4 を =2＋reviewBudgetForSprint へ同期、テストコメントの旧値是正、KanbanView を dailyBeatsInSprint 直接参照に、lg「予測(全体)」スコープ表示＋over文に式追加、Planning文言の平易化。
- [open] (🟡・要プレイテスト) 容量 4→2 半減後、DELIVERY_TARGET=9 が妥当か／forecast満タンで慢性キャリーオーバーにならないか実測（agile指摘）。great1.5倍・quick広消化・スコープ再交渉が緩和弁。
- 全11ゲート緑（test348/build/size157.89kB/circular/knip/typecov/cpd/lighthouse/e2e3-3/axe）。R7は全8エージェント🔴ゼロ、R8クリーン。

### 2026-06-22 / loop/all-agent-review-r9（R9全エージェント＋波括弧バグ＋難読漢字一掃）

全8エージェント R9 レビュー＝**ゲーム破綻🔴ゼロ**。総監督の連続フィードバック2件＋code指摘を反映。
1. 【総監督】「波括弧が選択肢に残っている」→ レビューミニゲーム(MiniGameReview)が option/task/aiNote/takeaway を生表示し {{用語}} の波括弧がリーク。RichText 化で修正（ヒアリングは元々RichText・dev/persuadeは無問題＝レビューのみの漏れ）。
2. 【総監督】「『瑣末』が難読」→ narrative-designer が瑣末/些末→ささい、軋む→きしむ、綻び→ほころび、訊く→聞く、苛立つ→いら立つ、辻褄→つじつま をプレイヤー表示全データで一掃（events/minigames/threads/cast）。
3. 【code🔴】KanbanView pullable を filter→find に（上位優先＝次の1件のみ該当、nextAddableId と一貫）。
4. 【learning🟡】レビュー深さ二択ラベルを機会コスト型に（浅い=広く速く通す/負債、深い=一点を深く固める/品質）＝quick の単一劣位化を解消。
- R10 再レビュー：story/learning「クリーン」。全11ゲート緑（test348/build/size157.85kB/lighthouse/e2e/axe）。
- [open] (🟡・defer) code: deliveredPbiIds の PBI_BY_ID 全件走査（呼出増時の設計リスク）、MiniGameReview の DiffView key に l.text 混在（静的diffで実害なし・index keyはlint抵触で据置）、useState lazy init は MiniGame の位置再利用に依存（key 明示は将来の保険）。
- [open] (🟡・narrative判断/未対応) fde: s1-retro capacityレバー語りとレバー実体の微ズレ／s1-daily-showcase-order b の正直上申に政治コスト(trust)が乗らない／s1-daily-incident に hearingOptions 無し。ai-dx: slopsquatting題材の14ケース未収録（実在脅威・追加余地）。learning: great で消化が伸びる旨の文言化・レビュー作問への顧客KPI軸。agile: velocity と「部分点なし(インクリメント)」のプレイヤー向け差別化文言。DELIVERY_TARGET=9 は容量半減後の妥当性をプレイテストで要観察（継続open）。

### 2026-06-23 / loop/all-agent-review-r11（R11/R12全エージェント adversarial）

全8エージェント R11（adversarial）＝**ゲーム破綻🔴ゼロ**。出た 🟡 のうち実害/価値のあるものを反映。
- code: Board の backlogDone.includes→doneSet メモ化、LegacySummary の deliveredPbiIds を useMemo 化、ミニゲーム選択肢 key を `${i}-${text}` で衝突回避、レビュー MiniGame に key={seed}（lazy init 取り違え防止）。
- agile: ResultModal「巻込−1（WIP違反）」→「フロー停滞＝未完の積み残し」に是正（WIP上限違反は canStart で常に防がれ発生しない＝誤読防止）。
- fde: s1-daily-showcase-order b（正直な上申）に trust−1 を追加＝「正直は無料・迎合は得」の逆メッセージ解消（pinnedの弧入口・他S1正論選択と同じ trust− の払い方）。STORY.md §6.6 を実装に同期。
- ai-dx: slopsquatting 題材をレビュー作問 case15 として追加（pbi-evt-exec-feature=荷主向けダッシュボードにAIが実在しない描画npmを import 提案）。glossary に「スロップスクワッティング」登録。コア PBI の1:1カバレッジは温存（EVENT_BACKLOG 側に追加）。
- story: s3-daily-ai-regression タイトル「モデル更新、突然のバカ」→「ある朝、AIが昨日を忘れた」（情景寄りに統一）。
- R12 再レビュー：ai-dx「クリーン」、story「クリーン」（STORY.md同期で解消）、全11ゲート緑（test348/build/size158.13kB/lighthouse/e2e/axe）。logistics/robotics は R11「クリーン」。
- [open] (🟡・defer) code: canAddToForecast の per-call Set再構築（N×M・backlog~20で実害軽微・署名変更要）。ai-dx: トークン経済の単位（着手80 vs 丸投げ500=実コストか贅沢税か）の文言明示。learning(R11出力欠落)・great消化伸び文言・レビュー作問への顧客KPI軸は継続。
- [note] 画像パイプラインの未コミット差分（scripts/import-image.mjs / src/data/images.ts / public/img/*.jpg）はレビュー作業と無関係につき本コミットに含めず別管理。

## Issue #73 ヒアリング/選択の金型単調さを崩す（2026-06-23 / 完全自走ループ初実装）
playtest-triage 発見（飽きの震源）→ narrative-designer が Sprint1 の4デイリーに4類型の型崩しを導入（engine/正本不変・既存機構 restraint/deduction/3択を活用）。
- 実装: s1-daily-excel=3択化（状況依存・単一正解なし）／s1-daily-rough=ヒアリング悪問を「品質責任・礼儀・手戻り削減」のもっともらしい正論=罠に書換／s1-daily-cando=restraint(持ち帰り)追加／s1-daily-incident=hearing無し即断回として温存・narrative微修正。
- R1: story🟡＋learning🟡が**収束指摘**＝excel-c(restraint)がノーコスト最適手（effects insight+1のみ）で§3「単一最適解なし」担保が弱い／excel-b結果文の引用符表記揺れ。
- R2修正: excel-c に `trust:-1`（機会コスト＝即答待ちの相手に進捗を見せられず即時信頼を取り逃す・理由を結果文に明記）を付与しcando-cと「言葉とメーター一致」に統一／引用符を鉤括弧に統一。R2再レビューで story🟢/learning🟢（trust軸が a:culture−/b:trust+/c:trust− の3方向に割れトレードオフ強化）。dry。
- ゲート: check:all/build/size(JS161.96kB)/e2e(3 pass)/lighthouse 全緑。381 unit tests。
- [open] (🟡・次イテレーション) learning: s1-daily-rough の decision 側が a/b 同型2択のまま（ヒアリングのみ型崩し・第3の道=礼儀と検証の折衷の検討余地）／s1-daily-incident b「記録しながら復旧」に時間コスト（出荷に間に合わないリスク）未提示で「記録は常に正解」へ半歩寄り（incidentは元2択・#73スコープ外）。
- [open] (🟡・次イテレーション) playtest発見の横展開: Sprint2/3 の同型イベント群（~90件）への型崩し展開／progression.ts でのセグメント別「出し分け」は今回スコープ外。

## Issue #74 ResultModal の情報過多を整理し主役を立てる（2026-06-23 / 完全自走ループ2件目）
playtest-triage 発見（毎ターンの手応えが情報過多で鈍る）→ ux-engineer が ResultModal を階層化。pickHeadline 純関数で「主役」を1つだけ前面化（致命圏>会心>心得>顧客価値>通常・既存 flash/sfx 優先度と整合）、副次情報（seed/PBI/token/coverage 等）を開閉パネルに格納。データ層/メーター/結果文/型は不変。
- code-reviewer と 4ラウンド: R1🔴3（greatExit二重表示ガード等）→R2🔴1（valueGain optional chain）→R3 size失敗(CSS10.11>10kB)で details→div/button アコーディオン化→R4🔴2（aria-controls が閉時無効id＝axe失敗の恐れ→hidden属性で常時マウント／focus-visible:outline-none削除の二重表示回帰→focus再付与）。
- ゲート: check:all(type-cov success)/build/size(JS162.27/CSS10.00kB)/e2e(axe3pass)/lighthouse 全緑・395 tests。
- [open] (🟡・polish) 開閉トグルが focus:ring（focus-visible: でなく）でマウスクリックでもリングが出る軽微なUX後退。a11y違反ではない（キーボードfocus可視・round5手前の収束優先で残置）。CSS予算に余裕ができたら focus-visible: へ。
- [open] (🟡・要注意) CSS バンドルが 10.00kB ＝予算上限ピッタリでマージンゼロ。次に CSS を足す変更は即超過するため、近いうちに既存 CSS のリファクタで余裕を作るか size 予算の妥当性を再検討（別 Issue 候補）。
## Issue #75 デイリー入口（ルーレット→朝会→マップ）の摩擦を減らしテンポを上げる（2026-06-23 / 完全自走ループ3件目）
playtest-triage 発見（入口が長く3日目から前置きの作業化）→ ux-engineer が CSS 中立でテンポ調整。§4.1 構造保持・engine 不変。
- 実装: Roulette SPIN_MS 3600→2200ms＋transition文字列を SPIN_MS 由来に単一真実源化（旧ハードコード 3.6s の不整合排除）／"静かな朝"（単一候補日）にマップ2タップを省く直行ボタン（既存className流用・既存 onTravel API・マップは残置）／朝会可変文 INTRO_MULTI/SINGLE/RECKONING にバリアント追加（既存 seed 選択に乗る）。
- code-reviewer R1🔴1（直行ボタンの candidates[0] コールバック内 narrowing 不成立＝型負債）＋🟡2（locationOf二重評価・SRラベル）→ R2: soloEvent/soloDest をブロック外で1回抽出しガード/onClick/ラベルを統一（型narrowing確定・二重評価解消）＋aria-label付与。
- ゲート: check:all(type-cov success)/build/size(JS162.16/CSS9.97kB・CSS中立)/e2e(axe3pass)/lighthouse 全緑・381 tests。
- [open] (🟡・次イテレーション) 朝会タイルに「前日の選択の余韻＝今日だけの引っかかり」をビジュアルで出す案は新規props配線＋新規CSSを要するため分離（CSS予算回避）。ルーレット「2周目以降スキップ可」も状態保持が絡むため効果測定後に別スライス。

## playtest-triage 2026-06-23（D ティック / キュー枯渇後）

playtest-critic 通しプレイ（Sprint1〜3、直近 #73/#74/#75 反映済み状態）。

### 起票済み
- 🔴 issued: #79 — Sprint2 デイリーの同型2択「b 連打作業化」（3〜4日目 s2-daily-return/anxiety 付近が離脱点）
- 🔴 issued: #80 — Sprint3 デイリー移譲テーマ一本調子（s3-daily-handover2 付近が最露骨・終盤ほど崩しが消える）
- 🟡 issued: #81 — スプリント境界（レトロ後）に「次が気になる」クリフハンガーなし（初見の離脱ボーナスポイント）

### 未起票（上限外・次回以降の優先候補）
- 🟡 triage: 未起票（上限外） — ResultModal normal ケース過多で中盤ご褒美感が薄まる（心得枯渇後 → greatStreak 演出の強化が緩和策）
- 🟡 triage: 未起票（上限外） — 朝会パネルのナビ作業化（Sprint2 5日目以降、3役セリフを読まずマップ直行）
- 🟡 triage: 未起票（上限外） — 据え置き b 選択肢の空振り感（メーター数字が1つも動かず手応えゼロ・例: s3-daily-scale/s1-daily-scope）

### 強み（記録のみ）
- 🟢 Sprint1 #73 適用後の3択・罠択の密度は「飽きさせない」の核心として機能
- 🟢 deduction 付きイベントは「外しても納得」な構造で没入感が高い——Sprint3 終盤に枯渇しているため追加余地あり
- 🟢 fraudCase 縦糸アーク（ghost-stock→循環取引）はフラグが引けた周回で確実に「続きが気になる」を生む

## Issue #79 Sprint2デイリーの「b連打作業化」解消（2026-06-23 / 完全自走ループ4件目）
playtest-triage 発見（Sprint2の3〜4日目で「どうせbが正解」とプレイヤーが学習しb連打になる）→ narrative-designer が2イベントに型崩し導入。Sprint1 #73 の手口（罠化・第3択）をSprint2に横展開。
- s2-daily-anxiety: c「最も火種になりうる一人に先に話を通す」(insight+1/culture-1)追加。トリアージ型正解候補でb(全員均等)との単一最適解なしを確保。
- s2-daily-return: a を「記述式ヒアリングシートを全員に送る」正論型罠(trust+1/insight-1 warn)に差し替え。c「各画面に開かれた回数を記録する仕掛け」(insight+1/trust-1)新設。深さ(b)vs広さ(c)の機会コスト対比。
- R1: fde🔴0🟡2(記録のみ)/ story🔴0🟡2(比喩混在・抽象距離表現)/ learning🔴0🟡2(ラベル曖昧2件)
- R2修正: 比喩統一(火モチーフ統一)・具体描写化・ラベル明瞭化。R2 dry。
- 全11ゲート緑(395tests/JS163kB/CSS9.98kB/lighthouse/e2e-axe)。PR #82。
- [open] Sprint3デイリーの移譲テーマ一本調子(#80)・スプリント境界の引き弱さ(#81)は未着手。

## Issue #80 Sprint3デイリー移譲テーマ一本調子の解消（2026-06-23 / 完全自走ループ5件目）
playtest-triage 発見（Sprint3中盤でb連打作業化）→ narrative-designer が s3-daily-onboard・s3-daily-handover2 の b resultText に移譲の短期コストを追記し、締めを各イベント固有の学びに差別化。

- onboard b: 「今日だけの痛み」→「誰かのミスを責めずに一緒に直せる現場なら、人に任せていける」（心理的安全）
- handover2 b: 「一時の痛み」→「手順書を誰かが直し続けるかぎり、固まった属人化はほどけていく」（継続保守）、「一件やり直し」→「{{WMS}}のマスタ登録を一本やり直し」（橋本エンジニア文脈に整合）
- lastman b は変更なし（後継育成の締めが上限モデル）

R1: fde🔴0🟡1・logistics🔴0🟡2・story🔴0🟡1・learning🔴1🟡1（「今日だけ」3件収斂で固有学び喪失）
R2修正: 全4件解消（構文差別化・橋本エンジニア文脈修正）。R2 dry。

- [open] (🟡・scope外・次回Issue候補) learning: s3-daily-handover2 b が culture+1/insight+1 の両軸プラスで a（culture-1 warn）に対して実質支配的。本文に痛みを書いたがメーターに反映されない。effects 変更はエンディング収支に波及するため別 Issue で検討。

## playtest-triage 2026-06-24（D ティック / #81 PR中・キュー枯渇後）

playtest-critic 通しプレイ（Sprint1〜3、直近 #79/#80/#81 反映済み状態）。

### 起票済み
- 🔴 issued: #85 — 朝会パネルが「ナビ作業化」しセリフが読まれなくなる（Sprint2 中盤以降）
- 🟡 issued: #86 — Sprint3後半の「決める」系イベント3連が同型で離脱を招く
- 🟡 issued: #87 — 据え置きb選択肢の「変化ゼロ」が手応えなく空振りに感じられる

### 未起票（上限外・次回以降の優先候補）
- 🟡 triage: 未起票（上限外） — #81 の弱さ（a 選択肢にクリフハンガーなし・resultText 末尾に埋もれる → PR#84 へのコメントで追記推奨）
- 🟡 triage: 未起票（上限外） — ResultModal normal ケース過多（心得枯渇後の演出単調減衰・greatStreak 格上げが緩和策）

### 検収
- 🟢 #79（Sprint2 デイリー2択型崩し）効いている。s2-daily-return の c（利用計測）が特に有効
- 🟡 #80（Sprint3 移譲一本調子）2イベントは差別化済み。Sprint3 後半の lastman/leadership/drive 3連が残存（→ #86 で対処）
- 🟡 #81（Sprint1 レトロ クリフハンガー）方向は正しいが a 選択肢に引きがなく、resultText 末尾で埋もれ気味

### 強み（記録のみ）
- 🟢 Sprint1 つかみ（s1-daily-logs の沈黙するログ）が強い
- 🟢 deduction（推理）ミニゲームが「読む報酬」として機能。中盤以降も出現頻度を維持すると効果的
- 🟢 TradeoffNote のトレードオフ言語化が本作の背骨。累積効果がより劇的に見えると周回性UP

## playtest-triage 2026-06-24（D ティック / #108-110 PR#122 レビュー中・キュー枯渇後）

playtest-critic 通しプレイ（Sprint1〜3、直近 #113-#122 反映済み状態）。

### 起票済み
- 🔴 issued: #123 — 結果文の機会コスト定型句インフレ（TradeoffNoteとの二重表示）
- 🔴 issued: #124 — Sprint2後半〜Sprint3前半の2択密集帯（s2-daily-idea/close/security等）c択追加
- 🟡 issued: #125 — hearingOptions good:false 3択の口調テンプレ崩し（正論型罠横展開）

### 未起票（上限外・次回以降の優先候補）
- 🟡 triage: 未起票（上限外）— Sprint3前半の移譲テーマ語彙反復（onboard〜handoff-trust 7〜8連の「渡せ」説教同型。#80/#89 で個別本文は差別化済みだがマクロ単調さが残存）
- 🟡 triage: 未起票（上限外）— ResultModal normal ケース過多（心得枯渇後の演出単調減衰・greatStreak格上げが緩和策）

### 検収
- 🟢 Sprint1 deduction（s1-daily-cynefin PR#122）と循環取引縦糸アークは引きの武器として機能
- 🟢 c択が入ったイベント群（#113/#115/#117 適用後）の型崩しは効いている
- 🟡 2択密集帯はSprint2後半（s2-daily-idea/close/security等）に依然残存 → #124 で対処

### 強み（記録のみ）
- 🟢 s1-daily-logs の沈黙するログがつかみとして強い
- 🟢 deduction パネルが「読む報酬」として機能している
- 🟢 TradeoffNote のトレードオフ言語化が本作の背骨として機能

## playtest-triage 2026-06-24（D ティック / Tick 10・キュー枯渇後）

playtest-critic 通しプレイ（Sprint1〜3、直近 #141/#142/#145 反映後・worktree ベース）。

### 起票済み
- 🔴 issued: #147 — S2デイリーのa択が全件warn固定（「a=罠」構造読みをS2でも崩す）
- 🔴 issued: #148 — 機会コスト文「取り逃す」がS3で20件超残存（#123の続き・S3版trim）

### 未起票（false positive・重複）
- 🟡 s2-retro b/c 引きの同文 → PR #144 マージ済み。critic が古いブランチを読んだ false positive
- 🟡 S3 hearing 偏在残存 → PR #143 マージ済み。同上 false positive
- 🔴 a/b答え合わせ構造（全スプリント） → #97/#104/#124 と実質重複（上記 #147 で S2 側をカバー）

### 検収
- 🟢 PR #143（S3 minigame 多様化）: main に反映済み、hearing 減少を確認
- 🟢 PR #144（retro b/c cliffhanger 差別化）: main に反映済み、b/c 末尾が差別化されている
- 🟢 S3 c択群（s3-daily-onboard/ai-agent/drive/burn）の「等価だが別ベクトル」設計は手応えあり

### 強み（記録のみ）
- 🟢 S3 の「どちらも正しいが別ベクトル」c択 → S2 中盤へ前倒しする方向が最優先
- 🟢 不正暴露アーク（fraudClue縦糸）が依然として引きの核として機能

## 2026-06-24 — #142 実装中の副産物

### 🟡 社名表記ゆれ（pre-existing）
- `cast.ts` の prologue 付近: 「**カルゴ物流**」
- `docs/STORY.md` §1: 「**翠流物流**」
- story-reviewer が発見。本 PR スコープ外のため未修正。別 Issue で narrative-designer が確認・統一が必要。

## playtest-triage 2026-06-24（D ティック / Tick 6・キュー枯渇後）

playtest-critic 通しプレイ（Sprint1〜3、直近 #135/#136/#137 反映後状態）。

### 起票済み
- 🔴 issued: #141 — S3ミニゲームのhearing偏在（13/19件）でdev/drill/persuadeが消えて作業化
- 🔴 issued: #142 — retro b/c択が同一cliffhangerで締まり「選択が物語に影響しない」と学習される

### 未起票（重複・上限外）
- 🔴 #140（c択バッジ）未マージは inReview 中の正常状態 ＝ 新規起票不要
- 🟡 c択偏在（S2中盤〜S3末）→ #92/#124 と実質重複 ＝ 起票せず

### 検収
- 🟢 PR #138（soumu-access トレードオフ化）: warn は ResultModal で初出、構造読み崩しが有効
- 🟢 PR #139（s3-daily-stuck-base 因果体験）: 自分の過去選択が後で牙を剥く体験として理想形
- 🟢 #104 warn 位置問題: ResultModal で選択後に表示されており解消済み

### 強み（記録のみ）
- 🟢 フラグ回収設計（wrongKpi/aiOverreliance）への横展開価値あり — 正本改変なし範囲で

## playtest-triage 2026-06-24（D ティック / #131 PR#134 レビュー中・キュー枯渇後）

playtest-critic 通しプレイ（Sprint1〜3、直近 #124/#129/#130 マージ後の最新状態）。

### 起票済み
- 🔴 issued: #135 — S1デイリー4個目で「a＝必ず罠」学習が確定し思考停止（`s1-daily-standup`付近）
- 🟡 issued: #136 — フラグ回収（ツケ返し）イベントが同型2択で感情の山が活きない（演出差別化）
- 🟡 issued: #137 — c択イベントが2択の海に埋もれ気づかれない（ux-engineer による視覚サイン追加）

### 未起票（上限外・次回以降の優先候補）
- 🔴 triage: 未起票（上限外）— S1デイリーの物量（20本超の同型作業ベルトコンベア）——スプリント内の遭遇数制御または非同型挿入が抜本解
- 🟡 triage: 未起票（上限外）— ResultModal 毎回フル装備の情報密度（初出 vs リピートで表示を段階化する提案）

### 検収
- 🟢 不正暴露アーク（fraudClue→fraudCase）が唯一の「続きが気になる引き」として強く機能
- 🟢 s1-physical-ai-showcase（映像的コントラスト）の没入感が高い
- 🟢 retro レバー選択 → S3 分岐エンディング（s3-review-topdown/trust）の差分が周回性の核
- 🟡 c択追加分（#127/#132）は型崩しとして正しい方向、だが2択の海に埋もれている → #137 で視覚的強調

### 強み（記録のみ）
- 縦糸2本（不正暴露アーク + retro→エンディング分岐）が本作を救っている——この2本への遭遇頻度・密度を前倒すと周回性がさらに上がる
