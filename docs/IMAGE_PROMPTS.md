# 画像生成プロンプト案（不足画面の補完）

> 「画像が足りていない画面」の補完用。各キーに `public/img/{key}.jpg` を生成・配置し、
> `src/data/images.ts` の `AVAILABLE_IMAGES` に追記すると表示される（未登録キーは描画されない＝404を出さない）。
> 配線は既存のまま：状況画像=`EventModal.tsx`、結果画像=`ResultModal.tsx`、エンディング/フィナーレ=`EndingScreen.tsx`/`Finale.tsx`（本対応で枠を新設）。

## 共通プレフィックス（全プロンプトの頭に付ける）

```
実写ドキュメンタリー風 / シネマティック、中堅物流会社「翠流物流」の倉庫・事務所・会議室・サーバ室が舞台。
自然光、手持ちカメラ的な構図、浅い被写界深度。人物の表情と手元で感情を語る。
画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長（上下が object-cover でトリミングされる前提で被写体は中央寄せ）。

English: Photographic documentary style, cinematic, set in a mid-size Japanese logistics company
("Suiryu Butsuryu") — warehouse, back office, meeting room, server room. Natural light, handheld framing,
shallow depth of field. Emotion told through faces and hands. No legible UI/logos/text. 16:9 landscape,
subject centered (top/bottom will be cropped by object-cover).
```

各キーの説明文は既存の `images.ts` 末尾コメントの作法（「何が写っているか」を一文で）に合わせている。

---

## Phase A: 結果（顛末）画像 — 最優先

「問題画像と必ず別の絵」が制約（`images.ts:20-21`）。**物語の主軸となる選択（pinned / setsFlag）**に絞った。
キー命名は `{eventId}__{choiceId}__r`。登録済み3件（`s1-daily-warehouse__b__r` / `s2-daily-ghost-stock__b__r` / `s2-retro__b__r`）は除く。

| # | キー | 元イベント / 選択 | プロンプト案（共通プレフィックス＋以下） |
|---|------|------------------|----------------------------------------|
| A1 | `s1-plan-goal__b__r` | s1-plan-goal「なぜ画面が使われないかを突き止める」をゴールに | 倉庫の片隅でFDEがベテラン田淵の手書き台帳を一緒に指でなぞり、現場の流れを聞き取る。問題画面（結城に予測機能を迫られる会議）とは対照的に、静かで前向きな現場の一場面。<br>EN: FDE crouched beside the veteran's handwritten ledger in the warehouse, listening, hopeful and quiet — opposite of the tense boardroom. |
| A2 | `s1-daily-showcase-order__b__r` | s1-daily-showcase-order「まず基本のIT化が要ると正直に上げる」 | 会議室で、FDEが資料を閉じ、上司に率直に進言する横顔。窓の外に地味だが稼働する倉庫。誇張のない誠実さ。<br>EN: FDE closing the slick deck, speaking honestly to a superior; through the window the unglamorous-but-working warehouse. |
| A3 | `s1-physical-ai-showcase__c__r` | s1-physical-ai-showcase「田淵さんの隣で、ベテランの目に映るデモ機を聞く」 | 二足歩行ロボットのデモ機の前で、FDEと作業着の田淵が並んで小声で言葉を交わす。最新技術と現場の知の対話。<br>EN: FDE and the veteran in work clothes standing side by side before a humanoid demo robot, exchanging quiet words. |
| A4 | `s2-daily-debt__a__r` | s2-daily-debt「意図的に負債を借りてMVPを締切に間に合わせる」 | 締切直前、付箋に「後で返す」と走り書きして貼るFDEの手元。安堵と一抹の不安が同居。<br>EN: FDE's hand sticking a "pay back later" note on the board right before the deadline — relief mixed with unease. |
| A5 | `s2-daily-repo-aicode__a__r` | s2-daily-repo-aicode「AIに丸ごと書かせてすぐマージ」 | モニターにAI生成コードが大量に流れ、後ろで小さな赤いエラーバッジが点る。FDEは満足げだが画面端に綻びの予兆。<br>EN: AI-generated code streaming on screen, a small red error badge glowing at the edge; FDE looks satisfied, trouble foreshadowed. |
| A6 | `s2-daily-keiri-odd__b__r` | s2-daily-keiri-odd「間宮さんの違和感をメモし、現場の実数と突き合わせる約束」 | 経理部の机で、経理担当の間宮とFDEが書類の数字に同時に指を置く。違和感の共有＝不正の入口。<br>EN: At an accounting desk, accountant and FDE both pointing at a figure on a sheet — a shared doubt, the seed of the fraud arc. |
| A7 | `s3-plan-handoff__a__r` | s3-plan-handoff「自分が運用も握り、頼れる窓口であり続ける」 | FDE一人の机に問い合わせの行列ができ、本人だけが忙しい。頼られているが、仕組みは残らない——属人化の影。<br>EN: A queue forming at the FDE's lone desk; relied-upon but no system left behind — the shadow of becoming a single point of failure. |
| A8 | `s3-daily-keiri-closing__b__r` | s3-daily-keiri-closing「決算と現場実数の食い違いを記録に残す」 | 夜の経理部で、間宮とFDEが連結決算の数字と現場の実数を静かに突き合わせ、ノートに控える。<br>EN: Night accounting office; accountant and FDE quietly reconciling consolidated figures against real warehouse counts, taking notes. |
| A9 | `s3-daily-circular__b__r` | s3-daily-circular「循環取引の輪郭を記録に残す」 | 同じシリアル番号が複数社の伝票を巡る——FDEが帳票を並べ、輪を指でたどる手元のクローズアップ。<br>EN: The same serial number circling through several companies' slips; close-up of a hand tracing the loop across laid-out documents. |
| A10 | `s3-daily-soumu-paper__b__r` | s3-daily-soumu-paper「契約書と請求書の符合を控えに残す」 | 総務の守屋が棚の奥からファイルを出し、FDEが日付と相手先の一致を控える。紙side の決定的証拠。<br>EN: General-affairs clerk pulling a file from the back of a shelf; FDE noting the matching dates and counterparties — the paper-trail evidence. |

> 備考：「悪手」側（chasedPromise / wrongKpi / topDown / aiOverreliance の負の帰結）は、状況画像
> （`s3-daily-rework` 等の着地イベント）で既に視覚化されているため結果画像は割愛。必要なら同方式で追加可。

---

## Phase B: 状況画像 — テーマ共通絵に頼っているイベント（trouble中心）

`eventImage`（`images.ts:170`）がテーマ絵にフォールバックしている13件。キー命名は `{eventId}`。

| # | キー / segment | タイトル | プロンプト案（共通プレフィックス＋以下） |
|---|---------------|---------|----------------------------------------|
| B1 | `s2-daily-ai-eval` / trouble | 評価基準を書く前に | 「誤出荷チェック」をAIに書かせようと、評価基準なしで「動いたら採用」と気軽に話す若手と、眉をひそめるFDE。<br>EN: Junior dev casually saying "ship it if it runs" about AI-written code; FDE frowning — no acceptance criteria yet. |
| B2 | `s2-daily-debt` / trouble | 締切と技術的負債 | 締切二日前のホワイトボード。「きれいに作る」と「速く出す」の二択が線で分けられ、時計が迫る。<br>EN: Whiteboard two days before the deadline split into "build clean" vs "ship fast", a clock looming. |
| B3 | `s2-daily-debt-collection` / trouble | 握った"後で返す"の期日 | 田淵が画面を指し「ここ直すたびこわごわでさ」と苦笑。同じスプリント内で早くも負債の利息が現れる。<br>EN: Veteran pointing at the screen, wryly: "every fix here is nerve-racking" — the borrowed debt's interest already showing. |
| B4 | `s2-daily-exception` / trouble | 矛盾だらけの例外ルール | 「火曜だけ手順が違う」「この客は別ルート」——付箋が矛盾しながら増える壁の前で頭を抱えるFDE。<br>EN: Wall of contradictory sticky notes ("Tuesdays differ", "this client, separate route"); FDE holding their head. |
| B5 | `s2-daily-security` / trouble | 後回しにされた制約 | 結城が「個人情報は社外に出すな」と釘を刺す。写真をAIに送る構成図に赤い禁止マークが重なる構図。<br>EN: Manager warning "no personal data leaves the company"; a photo-to-AI architecture sketch with a red prohibition mark over it. |
| B6 | `s2-daily-undone-debt` / trouble | "動いてた"はずの機能 | 現場から鳴る電話。「ピッキング画面、数が合わない」。浅いレビューで Done を貼った付箋が剥がれかける。<br>EN: A phone ringing from the floor — "the picking screen counts don't add up"; a hastily-stuck "Done" note peeling off. |
| B7 | `s3-daily-burn` / trouble | ぶっつけ本番 | 基幹を含む大規模切り替えの前夜。ぶっつけか、手を動かすリハーサルか——緊張した面持ちのチーム。<br>EN: Night before a large core-system cutover; tense team weighing going live cold vs rehearsing hands-on. |
| B8 | `s3-daily-night-shift-miss` / trouble | 夜勤明けの、誤出荷 | 早朝の倉庫、誤配された荷を前に渋い顔の田淵。「ミスが出るのは決まって夜勤明け、口で引き継ぐだけだから」。<br>EN: Early-morning warehouse, veteran grim over a mis-shipped pallet; night-shift handoff done only verbally. |
| B9 | `s3-daily-soumu-expense` / trouble | 経費の綻び | 守屋に頼まれた経費精算の代理入力。承認印は形だけ、領収書は後付け——ザルな内部統制にふと気づくFDE。<br>EN: FDE proxy-entering expenses for the clerk, noticing the approval stamp is a formality and receipts are added later — weak internal control. |
| B10 | `s3-daily-joushi-deprioritized` / kokyaku | 見せる数字が、まだ無い | 会議室、結城の手元に経営向け報告フォーマットが固まったまま。「数字を見せる画面が、まだ一枚も無い」と声が低い。<br>EN: Meeting room; manager's exec-report template stalled open, voice low: "not a single screen yet to show the numbers." |
| B11 | `s1-daily-legacy` / trouble | 笑えない古いシステム | 20年前の基幹システム、承認に紙のハンコが混じる。同僚が画面を覗き「化石、作り直せば」と笑うが、現実は重い。<br>EN: A 20-year-old core system with paper stamps in the approval flow; a peer laughs "scrap this fossil", but reality is heavier. |
| B12 | `s1-daily-refine-grounded` / team | 何を作るか、より、何を確かめるか | リモート越しの瀬川が「このまま着手します？」。"作る"でなく"確かめる"へ——手が止まって見えるデイリー。<br>EN: Remote teammate asking "do we just start building?"; a daily where hands seem to pause — shifting from "build" to "verify". |
| B13 | `s3-daily-genba-deprioritized` / genba | 後回しにされた、使い勝手 | 倉庫で田淵がまた手書きメモを広げる。「数字を出す画面は立派になった。けど俺らが触るここは前のまんまだ」。芽生えた信用が一歩遠のく。<br>EN: Veteran back to handwritten notes: "the numbers screen got fancy, but what we touch daily is unchanged" — trust slipping a step. |

---

## Phase C: エンディング／フィナーレ画像（コード枠は本対応で新設済み）

キー命名は `ending-{Epilogue.id}`（フィナーレ画面は `ending-finale`）。`endingImage()`（`images.ts`）で取得。
12種すべてを一度に用意せず、まず代表4＋フィナーレ1から。

| # | キー | 結末 | プロンプト案（共通プレフィックス＋以下） |
|---|------|------|----------------------------------------|
| C1 | `ending-trueFde` | 最良：真のFDE | 夕暮れ、現場に根付いた仕組みを背に静かに去るFDの後ろ姿。倉庫では田淵たちが自分たちで端末を使い回している。達成と継承。<br>EN: Dusk; FDE walking away, back turned, as the floor team now uses the system on their own — legacy embedded. |
| C2 | `ending-hero` | 属人化：頼れる英雄 | 明るいオフィスで皆に頼られ忙しいFDE。だがその机だけに人が群がり、本人がいなければ回らない——光と影。<br>EN: FDE busy and relied-upon in a bright office, yet everyone crowds that one desk — heroic but a single point of failure. |
| C3 | `ending-fail-trust` | 失敗：信頼の崩壊 | 誰もいなくなった会議室、片付けられた席。FDEが一人、閉じたノートPCの前で天を仰ぐ。案件終了の重さ。<br>EN: An emptied meeting room, a cleared seat; FDE alone before a closed laptop, looking up — the weight of a terminated engagement. |
| C4 | `ending-finale-expose` | 暴露：不正を告発 | 証拠ファイルを手に、まっすぐ前を見て廊下を歩くFDE。覚悟の横顔、背後に役員室の扉。<br>EN: FDE walking a corridor holding the evidence file, gaze forward, resolute; a boardroom door behind. |
| C5 | `ending-finale` | フィナーレ画面（決断の直前） | 手の中の証拠（伝票束/USB）を見つめるFDEの手元クローズアップ。机上に循環取引の書類。決断の一拍前の静けさ。<br>EN: Close-up of the FDE's hands holding the evidence (a stack of slips / a USB), circular-trade documents on the desk — the still beat before the decision. |

> 残り（disliked / orderTaker / decent / fail-insight / fail-culture / finale-expose-weak / finale-complicit / finale-coopted）は
> 同じ命名規約 `ending-{id}` で随時追加すれば、コード変更なしで表示される。

---

---

## コピペ用プロンプト（全文・共通プレフィックス込み）

> 各ブロックをそのまま Gemini に貼り付け → 生成 → DL → `node scripts/import-image.mjs <key>`。

### A1 `s1-plan-goal__b__r`
```
実写ドキュメンタリー風 / シネマティック、中堅物流会社「翠流物流」の倉庫・事務所・会議室・サーバ室が舞台。自然光、手持ちカメラ的な構図、浅い被写界深度。人物の表情と手元で感情を語る。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
倉庫の片隅で、FDEがベテラン作業員（田淵）の手書き台帳を一緒に指でなぞり、現場の流れを真剣に聞き取っている。静かで前向きな空気。
Photographic documentary, cinematic, mid-size Japanese logistics company warehouse. Natural light, handheld framing, shallow depth of field. FDE crouched beside a veteran worker's handwritten ledger, listening intently — quiet and hopeful. No legible text/UI. 16:9 landscape.
```

### A2 `s1-daily-showcase-order__b__r`
```
実写ドキュメンタリー風 / シネマティック、中堅物流会社「翠流物流」の会議室。自然光、手持ちカメラ的な構図、浅い被写界深度。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
会議室で、FDEが派手なプレゼン資料を閉じ、上司に率直に進言する横顔。窓の外には地味だが確かに稼働している倉庫。誇張のない誠実さ。
Photographic documentary, cinematic, meeting room. FDE closing a slick deck, speaking honestly to a superior; through the window an unglamorous but working warehouse. Sincere, no exaggeration. No legible text. 16:9 landscape.
```

### A3 `s1-physical-ai-showcase__c__r`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の倉庫の一角での技術お披露目。自然光、浅い被写界深度。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
二足歩行ロボットのデモ機の前で、FDEと作業着のベテラン（田淵）が並んで小声で言葉を交わす。最新技術と現場の知の静かな対話。
Photographic documentary, cinematic. FDE and a veteran in work clothes standing side by side before a humanoid demo robot, exchanging quiet words — latest tech meets floor wisdom. No legible text. 16:9 landscape.
```

### A4 `s2-daily-debt__a__r`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の開発フロアのカンバンボード前。自然光、浅い被写界深度、手元のクローズアップ。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
締切直前、付箋に「後で返す」とだけ走り書きして貼るFDEの手元のクローズアップ。安堵と一抹の不安が同居する空気。
Photographic documentary, cinematic, close-up of an FDE's hand sticking a "pay back later" note on a board right before a deadline — relief mixed with unease. No legible text. 16:9 landscape.
```

### A5 `s2-daily-repo-aicode__a__r`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の開発デスク。薄暗い室内光、モニターの光が顔に当たる、浅い被写界深度。読めるコード文字は作り込まない（文字はぼかす）。16:9 横長、被写体は中央寄せ。
モニターにAI生成コードが大量に流れ、画面端に小さな赤いエラーバッジが点る。FDEは満足げだが、端の綻びが不穏な予兆を漂わせる。
Photographic documentary, cinematic. AI-generated code streaming on a monitor (text blurred/illegible), a small red error badge glowing at the edge; the FDE looks satisfied while trouble is foreshadowed. 16:9 landscape.
```

### A6 `s2-daily-keiri-odd__b__r`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の経理部の机。自然光、浅い被写界深度、手元中心。書面の数字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
経理担当（間宮）とFDEが、書類上の同じ数字に同時に指を置く。違和感を共有する瞬間＝不正の入口。
Photographic documentary, cinematic, accounting desk. An accountant and the FDE both pointing at the same figure on a sheet (numbers illegible) — a shared doubt, the seed of the fraud arc. 16:9 landscape.
```

### A7 `s3-plan-handoff__a__r`
```
実写ドキュメンタリー風 / シネマティック、翠流物流のオフィス。自然光、浅い被写界深度。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
FDE一人の机に問い合わせの行列ができ、本人だけが忙しく対応している。頼られているが仕組みは残らない——属人化（単一障害点）の影。
Photographic documentary, cinematic. A queue forming at the FDE's lone desk while only they handle everything — relied-upon but no system left behind; the shadow of becoming a single point of failure. No legible text. 16:9 landscape.
```

### A8 `s3-daily-keiri-closing__b__r`
```
実写ドキュメンタリー風 / シネマティック、夜の翠流物流・経理部。デスクライトの暖色光、浅い被写界深度。書面・画面の数字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
夜の経理部で、経理担当（間宮）とFDEが連結決算の数字と現場の実数を静かに突き合わせ、ノートに控える。
Photographic documentary, cinematic, night accounting office. The accountant and FDE quietly reconciling consolidated figures against real warehouse counts, taking notes (figures illegible). 16:9 landscape.
```

### A9 `s3-daily-circular__b__r`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の事務室の机。自然光、浅い被写界深度、手元のクローズアップ。伝票の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
机に並べた複数社の伝票を、FDEの指が輪を描くようにたどる手元のクローズアップ。同じシリアル番号が会社を巡る＝循環取引の輪郭。
Photographic documentary, cinematic, close-up of a hand tracing a loop across slips from several companies laid out on a desk (text illegible) — the same serial circling through firms; the outline of a circular trade. 16:9 landscape.
```

### A10 `s3-daily-soumu-paper__b__r`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の総務部・書庫前。自然光、浅い被写界深度。書面の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
総務担当（守屋）が棚の奥からファイルを取り出し、FDEが契約書と請求書の日付・相手先の一致を控えに書き留める。紙の決定的証拠。
Photographic documentary, cinematic, archive shelves. A general-affairs clerk pulling a file from the back of a shelf while the FDE notes matching dates and counterparties (text illegible) — the paper-trail evidence. 16:9 landscape.
```

### B1 `s2-daily-ai-eval`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の開発フロア。自然光、浅い被写界深度。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
「動いたら採用でいい」と気軽に話す若手エンジニアと、評価基準なしでAIにコードを書かせることに眉をひそめるFDE。
Photographic documentary, cinematic. A junior dev casually saying "ship it if it runs" while the FDE frowns — AI-written code with no acceptance criteria yet. No legible text. 16:9 landscape.
```

### B2 `s2-daily-debt`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の開発フロアのホワイトボード前。自然光、浅い被写界深度。ボードの文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
締切二日前。ホワイトボードに「きれいに作る」と「速く出す」の二択が線で分けられ、壁の時計が迫る緊張。
Photographic documentary, cinematic. A whiteboard two days before a deadline, split into "build clean" vs "ship fast" (text illegible), a wall clock looming. 16:9 landscape.
```

### B3 `s2-daily-debt-collection`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の倉庫事務室。自然光、浅い被写界深度。画面の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
ベテラン（田淵）が端末画面を指して「ここ直すたびこわごわでさ」と苦笑。借りた技術的負債の利息が同じスプリント内で早くも現れる。
Photographic documentary, cinematic. A veteran pointing at a screen, wryly amused — "every fix here is nerve-racking"; the borrowed technical debt's interest already showing. No legible text. 16:9 landscape.
```

### B4 `s2-daily-exception`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の事務室の付箋だらけの壁。自然光、浅い被写界深度。付箋の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
「火曜だけ手順が違う」「この客は別ルート」——矛盾しながら増え続ける付箋の壁を前に、頭を抱えるFDE。
Photographic documentary, cinematic. A wall of contradictory sticky notes (text illegible); the FDE holding their head before the growing mess of exceptions. 16:9 landscape.
```

### B5 `s2-daily-security`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の会議室。自然光、浅い被写界深度。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
上司（結城）が「個人情報を含む配送データは社外に出すな」と厳しく釘を刺す。写真をAIに送る構成のホワイトボード図に、赤い禁止マークが重なる構図。
Photographic documentary, cinematic. A manager sternly warning "no personal data leaves the company"; a whiteboard photo-to-AI architecture sketch overlaid with a red prohibition mark. No legible text. 16:9 landscape.
```

### B6 `s2-daily-undone-debt`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の倉庫近くの事務スペース。自然光、浅い被写界深度。画面・付箋の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
現場からの電話を受けるFDE。「ピッキング画面、数が合わない」。浅いレビューで貼った Done の付箋が剥がれかけている。
Photographic documentary, cinematic. The FDE taking a call from the floor — "the picking screen counts don't add up"; a hastily-stuck "Done" note peeling off. No legible text. 16:9 landscape.
```

### B7 `s3-daily-burn`
```
実写ドキュメンタリー風 / シネマティック、夜の翠流物流の開発フロア。薄暗い室内光、浅い被写界深度。画面の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
基幹を含む大規模なシステム切り替えの前夜。ぶっつけ本番か、手を動かすリハーサルか——緊張した面持ちのチーム。
Photographic documentary, cinematic, night dev floor. The eve of a large core-system cutover; a tense team weighing going live cold vs rehearsing hands-on. No legible text. 16:9 landscape.
```

### B8 `s3-daily-night-shift-miss`
```
実写ドキュメンタリー風 / シネマティック、早朝の翠流物流の倉庫。朝の斜光、浅い被写界深度。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
誤配された荷（別の店の分）を前に渋い顔のベテラン（田淵）。夜勤帯の出荷ミス。「口で引き継ぐだけだから出る」というあきらめ。
Photographic documentary, cinematic, early-morning warehouse. A veteran grim over a mis-shipped pallet (wrong store); a night-shift error from verbal-only handoffs. No legible text. 16:9 landscape.
```

### B9 `s3-daily-soumu-expense`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の総務部の机。自然光、浅い被写界深度。書面の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
経費精算の代理入力を頼まれたFDEが、承認印が形だけで領収書が後付けでも通る様子にふと気づく。ザルな内部統制への小さな違和感。
Photographic documentary, cinematic, general-affairs desk. The FDE, proxy-entering expenses, noticing the approval stamp is a mere formality and receipts get added later — a quiet unease at weak internal control. No legible text. 16:9 landscape.
```

### B10 `s3-daily-joushi-deprioritized`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の会議室。自然光、浅い被写界深度。画面の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
上司（結城）の手元に経営向け報告フォーマットが開いたまま固まっている。「数字を見せる画面が、まだ一枚も無い」と低い声。圧と落胆。
Photographic documentary, cinematic, meeting room. The manager's exec-report template stalled open; a low voice — "not a single screen yet to show the numbers." Pressure and disappointment. No legible text. 16:9 landscape.
```

### B11 `s1-daily-legacy`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の電算室・古い端末の前。蛍光灯の白い光、浅い被写界深度。画面の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
20年前のレガシー基幹システム。承認フローには今も紙のハンコが混じる。同僚が画面を覗き「こんな化石、作り直せば」と笑うが、現実の重さがにじむ。
Photographic documentary, cinematic, computer room with an old terminal. A 20-year-old legacy core system with paper stamps still in the approval flow; a peer peeking and laughing "scrap this fossil", but reality feels heavy. No legible text. 16:9 landscape.
```

### B12 `s1-daily-refine-grounded`
```
実写ドキュメンタリー風 / シネマティック、翠流物流のデイリースクラムの場（リモート画面越しの同僚を含む）。自然光、浅い被写界深度。画面の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
リモート越しの同僚（瀬川）が「このまま着手します？」と問う。"作る"でなく"確かめる"へ舵を切り、手が止まって見えるデイリー。迷いと集中。
Photographic documentary, cinematic, a daily standup with a remote teammate on screen. The teammate asking "do we just start building?"; hands seem to pause as the goal shifts from "build" to "verify". No legible text. 16:9 landscape.
```

### B13 `s3-daily-genba-deprioritized`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の倉庫。自然光、浅い被写界深度。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
ベテラン（田淵）がまた手書きのメモを広げている。「数字を出す画面は立派になった。けど俺らが毎日触るここは前のまんまだ」。芽生えた信用が一歩遠のく寂しさ。
Photographic documentary, cinematic, warehouse. A veteran back to spreading handwritten notes — "the numbers screen got fancy, but what we touch daily is unchanged"; the just-budding trust slipping a step. No legible text. 16:9 landscape.
```

### C1 `ending-trueFde`
```
実写ドキュメンタリー風 / シネマティック、夕暮れの翠流物流の倉庫。黄金色の斜光、浅い被写界深度、後ろ姿のロングショット。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
夕暮れ、現場に根付いた仕組みを背に静かに去るFDEの後ろ姿。倉庫では作業員たちが自分たちで端末を使いこなしている。達成と継承の余韻。
Photographic documentary, cinematic, dusk warehouse, golden backlight. The FDE walking away (back turned) as the floor team now uses the system on their own — legacy embedded, a quiet sense of accomplishment. No legible text. 16:9 landscape.
```

### C2 `ending-hero`
```
実写ドキュメンタリー風 / シネマティック、明るい翠流物流のオフィス。自然光、浅い被写界深度。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
皆に頼られ忙しく立ち働くFDE。だがその机だけに人が群がり、本人がいなければ回らない構図。光と影＝頼れる英雄であり単一障害点。
Photographic documentary, cinematic, bright office. The FDE busy and relied-upon, yet everyone crowds that one desk — heroic but a single point of failure; light and shadow. No legible text. 16:9 landscape.
```

### C3 `ending-fail-trust`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の誰もいなくなった会議室。冷たい曇天光、浅い被写界深度。画面内に読めるUI・ロゴ・文字の作り込みはしない。16:9 横長、被写体は中央寄せ。
片付けられた空席。FDEが一人、閉じたノートPCの前で天を仰ぐ。案件終了の重さと喪失感。
Photographic documentary, cinematic, an emptied meeting room, cold overcast light. A cleared seat; the FDE alone before a closed laptop, looking up — the weight of a terminated engagement. No legible text. 16:9 landscape.
```

### C4 `ending-finale-expose`
```
実写ドキュメンタリー風 / シネマティック、翠流物流本社の廊下。硬い直射光と影、浅い被写界深度。書面の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
証拠のファイルを手に、まっすぐ前を見て廊下を歩くFDEの覚悟の横顔。背後に役員室の重い扉。
Photographic documentary, cinematic, HQ corridor, hard light and shadow. The FDE walking forward holding the evidence file (text illegible), resolute in profile; a heavy boardroom door behind. 16:9 landscape.
```

### C5 `ending-finale`
```
実写ドキュメンタリー風 / シネマティック、翠流物流の事務室の机。落ち着いた室内光、浅い被写界深度、手元のクローズアップ。伝票の文字は読めないようぼかす。16:9 横長、被写体は中央寄せ。
手の中の証拠（伝票束、またはUSBメモリ）を見つめるFDEの手元のクローズアップ。机上には循環取引の書類。決断の一拍前の静けさ。
Photographic documentary, cinematic, office desk, close-up of the FDE's hands holding the evidence (a stack of slips or a USB), circular-trade documents on the desk (text illegible) — the still beat before the decision. 16:9 landscape.
```

---

## 登録手順（生成後）

1. 生成した `.jpg` を `public/img/{key}.jpg` に置く。
2. `src/data/images.ts` の対応ブロックにキーを追記（末尾に内容コメント）。
   - 結果画像 → `images.ts:22` 付近の `__r` ブロック
   - 状況画像 → `images.ts:25` 以降の個別状況ブロック
   - エンディング → 任意の位置に `ending-*` を追加（`endingImage()` が拾う）
3. `npm run dev` で各画面を実機確認 → `npm run check:all` で緑を確認。
