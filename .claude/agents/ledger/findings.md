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
