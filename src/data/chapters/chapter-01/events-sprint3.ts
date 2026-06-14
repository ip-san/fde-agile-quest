// 第1章 Sprint 3 のイベント定義。chapter-01.ts（バレル）が結合する。
// 設計原則・キャラ陣は ./cast.ts と chapter-01.ts 冒頭コメントを参照。
import type { GameEvent } from '../../../types'

export const SPRINT3_EVENTS: GameEvent[] = [

  // ═══ Sprint 3「文化を残す」═══════════════════════════
  // ── プランニング ──
  {
    id: 's3-plan-handoff',
    sprint: 3,
    ceremony: 'planning',
    segment: 'kokyaku',
    title: '本番化の構え',
    narrative:
      '写真入力の叩き台は現場に渡り始めた。{{PoC}}で終わらせず本番に根付かせる段だ。最終スプリントのゴールは？',
    choices: [
      {
        id: 'a',
        label: '自分が運用も握り、頼れる窓口であり続ける',
        effects: { trust: 1, culture: -2 },
        resultText:
          '「あなたがいれば安心」と結城さんは頼り切る（信頼+）。だが自分が抜けたら止まる仕組みになっていく。',
        warn: true,
      },
      {
        id: 'b',
        label: '社内メンバーへの{{オンボーディング}}と移譲をゴールにする',
        effects: { culture: 1 },
        resultText:
          '「太く残す」に舵を切った。自分の見せ場は減るが、組織に根付く形へ。（頼られる信頼+は取り逃す）',
      },
    ],
  },

  // ── デイリー（wrongKpi なら手戻りが混ざる）──
  {
    id: 's3-daily-rework',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    requiresFlag: 'wrongKpi',
    title: '手戻り——使われない新機能',
    narrative:
      '「機能数を増やす」KPIに沿って予測タブを足したが、現場は相変わらずメモのまま。上位の仮説が間違っていたので、下位の作業がまるごと無駄になった。',
    choices: [
      {
        id: 'a',
        label: 'KPIの誤りを認め、「誤出荷率」に立て直して作り直す',
        effects: { insight: 1, trust: -1 },
        resultText:
          '「作り直し…？」と結城さんは渋い顔（前提の誤りを認めて信頼−）。痛い手戻りだが軌道修正した。上が崩れたら下は全部やり直す。',
      },
      {
        id: 'b',
        label: '引き返せず、機能をさらに足して押し切る',
        effects: { trust: -2, insight: -1 },
        resultText:
          '使われない機能を重ねるうち、成果の出なさに結城さんの失望が深まる（信頼−−）。沈黙する画面に沈黙する機能が積み上がる。',
        warn: true,
      },
    ],
  },
  {
    id: 's3-daily-onboard',
    sprint: 3,
    ceremony: 'daily',
    segment: 'team',
    title: '引き継ぎのデイリー',
    narrative: '社内の若手が運用を引き取ろうとしている。',
    choices: [
      {
        id: 'a',
        label: '自分でやった方が速いので巻き取る',
        effects: { trust: 1, culture: -2 },
        resultText:
          '今日は速く回り、結城さんも安心（信頼+）。だが運用が自分に依存し、組織は賢くならない。',
        warn: true,
      },
      {
        id: 'b',
        label: '任せて、詰まったところだけ支える',
        effects: { culture: 1 },
        resultText:
          '若手が運用を語れるようになった。文化が人に宿る。（自分が握る安心の信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's3-daily-genba',
    sprint: 3,
    ceremony: 'daily',
    segment: 'genba',
    title: '定着の確認',
    narrative: '新しいやり方が本当に根付いたか。現場へ確かめに行くか。',
    choices: [
      {
        id: 'a',
        label: 'リモートで数字だけ確認して済ます',
        effects: { insight: -1 },
        resultText: '数字は良い。だが現場の小さな不満は拾えていない。',
      },
      {
        id: 'b',
        label: '現場に通い、定着を肌で確かめ微調整する',
        effects: { insight: 1, trust: 1, culture: -1 },
        resultText:
          '「最後まで見てくれた」と現場は信頼を寄せる（信頼+）。細かな使いづらさも潰した。ただし丸一日チームを離れた（巻き込み−）。',
      },
    ],
  },
  {
    id: 's3-daily-scale',
    sprint: 3,
    ceremony: 'daily',
    segment: 'chance',
    title: '横展開の誘い',
    narrative:
      '経営から「他拠点にも広げたい」と声がかかった。{{ペルソナ}}は拠点ごとに少し違う。',
    choices: [
      {
        id: 'a',
        label: '期待に応え、今の成功をそのまま全拠点にコピーする',
        effects: { trust: 1, insight: -1 },
        resultText:
          'スピード感に経営は満足（信頼+）。だが拠点差を無視したコピーは、また別の「沈黙」を生むかも。',
      },
      {
        id: 'b',
        label: 'まず1拠点で現場を見てから広げる、と丁寧に説明する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '勢いには水を差したが、経営も「確かに」と納得（信頼は据え置き）。学んだやり方を作法として残せそうだ。',
      },
    ],
  },
  {
    id: 's3-daily-referral',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '広がる評判',
    narrative:
      '誤出荷が減ったと評判が立ち、別部署の部長が「うちにも来てくれ」と接触してきた。',
    choices: [
      {
        id: 'a',
        label: '今の案件を放って、すぐ新しい部署に乗り換える',
        effects: { trust: -1, culture: -1, insight: -1 },
        resultText:
          '目新しさに飛びつき、今の現場の定着を置き去りに。「もう興味ないのか」と熱が冷め、信頼が削れた。',
        warn: true,
      },
      {
        id: 'b',
        label: '今の定着を見届けつつ、紹介は次の入口として丁寧に繋ぐ',
        effects: { trust: 1, culture: 1 },
        resultText:
          '最後までやり切る姿勢が信頼を呼ぶ（信頼+）。「太く残す」が評判になって広がる。',
      },
    ],
  },
  {
    id: 's3-daily-metrics',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: '誰がダッシュボードを見るか',
    narrative:
      '誤出荷率の{{ダッシュボード}}を作ったが、自分が抜けたら誰も見ない懸念がある。',
    choices: [
      {
        id: 'a',
        label: '自分が毎朝チェックして結城さんに報告し続ける',
        effects: { trust: 1, culture: -2 },
        resultText:
          '毎朝の報告に結城さんは安心（信頼+）。だが数字を読む役が自分から離れず、現場が自分で意思決定する習慣が育たない。',
        warn: true,
      },
      {
        id: 'b',
        label: '現場のリーダーが見て動ける運用に組み替える',
        effects: { culture: 1, insight: 1 },
        resultText:
          '数字が現場の手に渡った。{{フィードバックループ}}が自走し始める。（毎朝報告の信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's3-daily-ai-agent',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: 'AIエージェントに権限を渡すか',
    narrative:
      '在庫の補正を{{エージェント}}に自動でやらせれば運用はぐっと楽になる。だが在庫データへの書き込み権限を渡すことになる。',
    choices: [
      {
        id: 'a',
        label: '全権限を与え、丸ごと自動化して一気に楽にする',
        effects: { trust: 1, culture: -1 },
        resultText:
          '一気に自動化して見せたので結城さんは「運用が楽になった」と一旦満足（信頼+）。だが暴走時に戻せない。{{エージェント}}より先に、権限の境界を設計すべきだった。',
        warn: true,
      },
      {
        id: 'b',
        label: '権限を最小に絞り、失敗時の{{ロールバック}}を先に用意する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '自動化より先に“戻し方”を用意した。一気に楽にして見せる進捗（信頼+）は取り逃すが、暴走時に戻せる安心が本番運用の土台になる。',
      },
    ],
  },
  {
    id: 's3-daily-ai-partner',
    sprint: 3,
    ceremony: 'daily',
    segment: 'chance',
    title: 'AIに任せきるか',
    narrative: '横展開の設計を、AIにほぼ丸投げすれば、自分は別案件に動ける。',
    choices: [
      {
        id: 'a',
        label: 'AIに丸投げして、自分は次の案件へ',
        effects: { trust: 1, insight: -1 },
        resultText:
          '速く仕上げて見せたので顧客は一旦満足（信頼+）。だが現場差をAIは知らない。「AIを使う」だけでは、また別の沈黙を生む。',
        warn: true,
      },
      {
        id: 'b',
        label: 'AIと協働し、現場知の部分は自分が判断して仕上げる',
        effects: { insight: 1, culture: 1 },
        resultText:
          'AIを“使う”でなく“共に働く”。速度はAI、判断は人。これがFDEのAIとの距離感だ。',
      },
    ],
  },

  {
    id: 's3-daily-sre',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: '深夜の本番障害',
    narrative:
      '本番の写真入力が深夜に停止。在庫が更新されず、朝の出荷に間に合わない。運用担当はまだ育っていない。',
    choices: [
      {
        id: 'a',
        label: '「自分の担当範囲外」として、朝の出社まで待つ',
        effects: { trust: -2, culture: -1 },
        resultText:
          '朝、出荷が止まり現場は混乱（信頼−−）。FDEはSREでもある。火が出たら、まず消すのが筋だ。',
        warn: true,
      },
      {
        id: 'b',
        label: 'SREとして即対応し、原因を直して再発防止まで入れる',
        effects: { trust: 1, insight: 1 },
        resultText: 'FDEはSREでもあり、最後はエンジニア。自ら火を消し、現場の朝を守った。',
      },
    ],
  },
  {
    id: 's3-daily-sales',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '「で、いくらで売れる？」',
    narrative:
      '成果を見た経営が「これ、他社にも売れるんじゃないか？ いくらの価値がある？」と聞いてきた。エンジニアの自分には畑違いに感じる。',
    choices: [
      {
        id: 'a',
        label: '「営業の領域なので」と話を技術に戻す',
        effects: { trust: -1 },
        resultText:
          '境界線の上に立てなかった（信頼−）。FDEは営業でもコンサルでもある。価値を語れる人が信頼を得る。',
        warn: true,
      },
      {
        id: 'b',
        label: '誤出荷削減の効果額を試算し、営業・コンサルとして価値を言葉にする',
        effects: { trust: 1, insight: 1 },
        resultText:
          'FDEは営業でもコンサルでもある。成果を“いくらの価値か”で語れたことが、次の案件を呼んだ。',
      },
    ],
  },
  {
    id: 's3-daily-facts',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '混ざる事実と願望',
    narrative:
      '経営への報告前。「たぶん誤出荷は半減した（はず）」「来期はゼロにできる（といいな）」と、事実と願望が頭の中で混ざっている。',
    choices: [
      {
        id: 'a',
        label: '景気のいい見込みも交えて、力強く報告する',
        effects: { trust: 1, insight: -1 },
        resultText:
          '景気のいい報告に経営はその場で沸いた（威勢で信頼+）。だが願望を事実のように語った以上、後で数字がズレた時、信頼は一気に崩れる火種になる。',
        warn: true,
      },
      {
        id: 'b',
        label: '事実・推測・願望を分けて報告する（実績／見込み／目標）',
        effects: { insight: 1, culture: 1 },
        resultText:
          '事実と推測と願望を切り分けた報告は、地味だが信頼に足る。経営の意思決定の土台になった。',
      },
    ],
  },

  {
    id: 's3-daily-boundary',
    sprint: 3,
    ceremony: 'daily',
    segment: 'team',
    title: '宙に浮くデータ移行',
    narrative:
      'データ移行が必要だが、「それは情シスの仕事」「いや業者の仕事」と誰も手を付けない。',
    choices: [
      {
        id: 'a',
        label: '自分の担当でもないので、決まるまで待つ',
        effects: { culture: -1, insight: -1 },
        resultText:
          '誰の仕事でもないものは、お前の仕事。境界線の上に立てず、移行は宙に浮いた。',
        warn: true,
      },
      {
        id: 'b',
        label: '境界線の上に立ち、誰も拾わない移行を自分が引き取る',
        effects: { insight: 1, culture: 1, trust: 1 },
        resultText:
          '境界線の上に立つ。誰も拾わなかった移行を引き取ったことで「この人は最後まで前に進める」と顧客の信頼が増した（信頼+）。隙間のタスクを拾った人が、案件を前に進める。',
      },
    ],
  },
  {
    id: 's3-daily-lastman',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: '空いたままの椅子',
    narrative: '本番切り替えの判断。「最終的に誰が責任を持つ？」と全員が顔を見合わせる。',
    choices: [
      {
        id: 'a',
        label: '責任が曖昧なので、誰かが決めるのを待つ',
        effects: { trust: -1, culture: -1 },
        resultText:
          'ラストマンの椅子が空いたまま、本番切り替えは延期。前に進まない案件に顧客は苛立つ（停滞で信頼−）。その場で試す者がいなかった。',
        warn: true,
      },
      {
        id: 'b',
        label: 'ラストマンとして座り、小さく切り替えてその場で試す',
        effects: { trust: 1, insight: 1 },
        resultText:
          'ラストマンとして座り、その場で試す。責任を引き受けた瞬間、場が動き出した。',
      },
    ],
  },
  {
    id: 's3-daily-drive',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '紛糾する会議',
    narrative: '関係者会議が紛糾。皆が様子を見て、誰も決めようとしない。',
    choices: [
      {
        id: 'a',
        label: '空気を読んで、結論は次回に持ち越す',
        effects: { culture: -1 },
        resultText:
          'その場で動かす者が主導権を握る。動かなかったあなたから、主導権は静かに離れた。',
        warn: true,
      },
      {
        id: 'b',
        label: '最後に責任を取る前提で、その場で決めて動かす',
        effects: { trust: 1, insight: 1 },
        resultText:
          'その場で動かす者が主導権を握る。最後は自分が責任を取る、と決めた人に皆が従った。紛糾していた関係者会議が結論に至り、顧客は前に進む手応えを得た（信頼+）。',
      },
    ],
  },
  {
    id: 's3-daily-dissent',
    sprint: 3,
    ceremony: 'daily',
    segment: 'team',
    title: '「それ、おかしくないですか」',
    narrative:
      'あなたの設計に、若手が「それ、おかしくないですか」と反論し、別の人が次々質問してくる。',
    choices: [
      {
        id: 'a',
        label: '面倒なので「決まったことだから」と議論を打ち切る',
        effects: { culture: -1, insight: -1 },
        resultText:
          '反論と質問を歓迎しなかった。以後、誰も異論を言わなくなり、欠陥が放置された。',
        warn: true,
      },
      {
        id: 'b',
        label: '反論を歓迎し、質問を喜んで、設計を一緒に鍛える',
        effects: { culture: 1, insight: 1 },
        resultText:
          '反論を歓迎しろ、質問されたら喜べ。叩かれた設計は、一人で考えたものより強くなった。',
      },
    ],
  },
  {
    id: 's3-daily-burn',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: 'ぶっつけ本番',
    narrative:
      'これまでは小さな写真入力だけだった。今回は基幹を含む大規模な本番切り替え。ぶっつけで行くか、手を動かして備えるか。',
    choices: [
      {
        id: 'a',
        label: '大規模な切り替えは初めてだが、その場で考えれば何とかなる',
        effects: { trust: -1, insight: -1 },
        resultText:
          '練習しろ、本番で初めて考えるな。案の定、想定外で本番切り替えが炎上し、現場の出荷が一時止まって顧客に迷惑をかけた（炎上で信頼−）——が、授業料は払った。',
        warn: true,
      },
      {
        id: 'b',
        label: 'リハーサルで練習し、炎上を“授業料つきの実地訓練”として記録する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '練習しろ。小さな炎上は授業料つきの実地訓練。記録した教訓が、次の現場で効く。',
      },
    ],
  },
  {
    id: 's3-daily-craft',
    sprint: 3,
    ceremony: 'daily',
    segment: 'chance',
    title: '次の現場へ',
    narrative: '案件は終わりに近づいた。次に向けて、自分は何を磨くべきか。',
    choices: [
      {
        id: 'a',
        label: '案件が終われば一区切り。特に振り返らず次へ',
        effects: { insight: -1 },
        resultText:
          '自分の道具を磨かなければ、次の現場では通用しない。FDEの旅はここで止まる。',
        warn: true,
      },
      {
        id: 'b',
        label: '自分の道具（専門性・型）を磨き、次の現場へデプロイする準備をする',
        effects: { insight: 1, culture: 1 },
        resultText:
          '自分の道具を磨け。{{FDE}}とは、未来を現場にデプロイする仕事。次の現場が待っている。',
      },
    ],
  },

  // ── レビュー ──
  // 主軸の分岐（topDown / genbaTrust）。既定 s3-review より前に置き、proceedCore が
  // フラグ一致のバリアントを優先して出す＝決定論的に展開が変わる。
  {
    id: 's3-review-topdown',
    sprint: 3,
    ceremony: 'review',
    segment: 'kokyaku',
    requiresFlag: 'topDown',
    title: '最終レビュー：崩れるデモ',
    narrative:
      '郷田専務の前で、自動化した{{ピッキング}}を本番データでデモする。だが——号令で集めた手順には、現場が隠した“例外”が抜けていた。イレギュラーな品が来た瞬間、自動仕分けが連鎖的に誤り、画面が{{欠品}}と誤出荷の山を映し出す。',
    choices: [
      {
        id: 'a',
        label: '原因を現場の入力ミスにして、その場を取り繕う',
        effects: { trust: -1, culture: -1 },
        resultText:
          '「現場の習熟不足です」と言い繕った。事実とズレた釈明に郷田専務の信頼は揺らぎ（信頼−）、現場は「結局、俺たちのせいか」と完全に背を向けた（巻き込み−）。隠された例外は、隠されたままだ。',
        warn: true,
      },
      {
        id: 'b',
        label: '隠れていた例外こそが急所だと正直に認め、現場に頭を下げて教えを請う',
        effects: { insight: 1, trust: -1 },
        resultText:
          '失敗を経営の前でさらすのは痛い（粗い結果を見せて信頼−）。だが「あなた方の例外処理が要る。教えてください」と頭を下げた瞬間、田淵さんの眉がわずかに動いた。挽回の糸口は、誠実さの側にある。',
      },
    ],
  },
  {
    id: 's3-review-trust',
    sprint: 3,
    ceremony: 'review',
    segment: 'kokyaku',
    requiresFlag: 'genbaTrust',
    title: '最終レビュー：現場の勘が動く',
    narrative:
      '自動化した{{ピッキング}}を本番データでデモする。田淵さんがこっそり教えてくれた“例外の見分け方”が、ちゃんと組み込まれている。イレギュラーな品が来ても、システムは現場の勘そのままに正しく弾いた。郷田専務がうなる。',
    choices: [
      {
        id: 'a',
        label: '「私が設計しました」と、成果を自分の手柄として語る',
        effects: { trust: 1, culture: -1 },
        resultText:
          '経営の評価は自分に集まった（信頼+）。だが、ノウハウを開いてくれた現場の名は、どこにも出なかった。田淵さんの表情が、すっと醒めた。',
        warn: true,
      },
      {
        id: 'b',
        label: '「現場が教えてくれた例外処理が要でした」と、田淵さんたちの功績として語る',
        effects: { culture: 1, insight: 1 },
        resultText:
          '郷田専務の視線が現場に向いた。「君らの仕事だったのか」。隠していたノウハウが、誇りに変わる。自動化は、現場のものになった。（手柄を独り占めする信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's3-review',
    sprint: 3,
    ceremony: 'review',
    segment: 'kokyaku',
    title: '最終レビュー：成果を語る',
    narrative:
      '誤出荷率の推移を、完成した{{インクリメント}}とともに郷田専務に報告する。{{PoC}}止まりにせず本番で回り始めた成果だ。',
    choices: [
      {
        id: 'a',
        label: '数字を少し盛って、成功をきれいに見せる',
        effects: { trust: 1, culture: -1, insight: -1 },
        resultText:
          'きれいな成果に拍手（その場の信頼+）。だが事実とズレた時、信頼は一気に崩れる火種を抱えた。',
        warn: true,
      },
      {
        id: 'b',
        label: '成果も残課題も正直に共有する',
        effects: { insight: 1 },
        resultText:
          '経営は実態を掴み、次の一手の精度が上がった。誠実さは長い信頼の土台になる。（数字を盛れば得られた“その場の信頼+”は取り逃す）',
      },
    ],
  },

  // ── レトロ ──
  // 主軸の結末。topDown は挽回（建て直す/突き放す）、genbaTrust は文化定着。既定 s3-retro の前に置く。
  {
    id: 's3-retro-topdown',
    sprint: 3,
    ceremony: 'retro',
    segment: 'team',
    requiresFlag: 'topDown',
    title: '最後のレトロ：建て直せるか',
    narrative:
      'キャンペーン最後の{{レトロスペクティブ}}。トップダウンで押し切った自動化は、本番でつまずいた。隠された例外が漏れたからだ。チームは沈み、現場との溝は深い。最後に、どう締める？',
    choices: [
      {
        id: 'a',
        label: '「現場が非協力的だった」と総括し、自分の責任は回避する',
        effects: { culture: -2 },
        resultText:
          '報告書はきれいに整った。だが現場は完全に心を閉ざし、橋本さん頼みの属人化に逆戻り。あなたが去れば、すべては元の沈黙に戻る。',
        warn: true,
      },
      {
        id: 'b',
        label: '押し切った自分の非を認め、時間をかけて信頼を建て直すと約束する',
        effects: { culture: 1, insight: 1 },
        resultText:
          '「あなた方の怖さを、ちゃんと見ていなかった。すまない」。頭を下げると、田淵さんがぼそり。「…まあ、次は最初から相談しろや」。溝は残るが、橋を架け直す一歩は踏めた。',
      },
    ],
  },
  {
    id: 's3-retro-trust',
    sprint: 3,
    ceremony: 'retro',
    segment: 'team',
    requiresFlag: 'genbaTrust',
    title: '最後のレトロ：根を張る文化',
    narrative:
      'キャンペーン最後の{{レトロスペクティブ}}。信頼を積み、現場と一緒に隠れたノウハウを形にした自動化は、本番でも例外まで含めて回っている。田淵さんが言う。「正直、最初はあんたが仕事を奪いに来たと思ってた」。学びをどう残す？',
    choices: [
      {
        id: 'a',
        label: '成功体験を、横展開のテンプレとして手早くまとめて次の現場へ急ぐ',
        effects: { insight: -1 },
        resultText:
          '雛形はできた。だが「現場ごとに違う」という今回いちばんの学びを、自分で薄めてしまった。',
        warn: true,
      },
      {
        id: 'b',
        label: 'なぜ現場が開いてくれたのか——信頼の築き方そのものを、チームの財産として言語化する',
        effects: { culture: 1, insight: 1 },
        resultText:
          'ノウハウを引き出す力が、チームに残った。隠していた現場が、自分から「次はここもやろう」と言い始める。文化が、根を張った。',
      },
    ],
  },
  {
    id: 's3-retro',
    sprint: 3,
    ceremony: 'retro',
    segment: 'team',
    title: '最後のレトロスペクティブ',
    narrative:
      'キャンペーン最後の{{レトロスペクティブ}}。チームは口々に言う。「{{KPI}}を“誤出荷を減らす”に据えられるかどうかで、結果がここまで変わるとは。機能数を追っていたら、作ったものは全部やり直しだった」。この案件の学びをどう残す？',
    choices: [
      {
        id: 'a',
        label: '成功を自分の手柄としてまとめ、経営に売り込む',
        effects: { trust: 1, culture: -2 },
        resultText:
          '個人の評価は上がった（信頼+）。だが学びは自分に閉じ、チームには残らない。',
        warn: true,
      },
      {
        id: 'b',
        label: 'チームと組織の学びとして言語化し残す',
        effects: { culture: 2 },
        resultText:
          '現場の学びがプロダクトと人に残った。「太く残す」一手。（手柄にする信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's3-daily-ai-regression',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    location: 'repo',
    requiresFlag: 'aiOverreliance',
    hints: {
      po: '昨日まで賢かったAIの精度が急に落ちた。リポジトリで影響範囲を確かめて。',
      sm: 'モデル更新でAIの挙動が変わったみたい。リポジトリで何が壊れたか切り分けよう。',
      dev: 'AIが書いたコードが急に火を噴いてます…。リポジトリで一緒に見てください。',
    },
    title: 'モデル更新、突然のバカ',
    narrative:
      'ある朝、{{需要予測}}AIの出力が突然おかしくなった。提供元のモデルが黙って更新され、昨日まで通っていた在庫提案が軒並み的外れに。検証を省いて全面委任していた箇所が、一斉に火を噴く。{{欠品}}が広がり、{{充足率}}が急落していく。',
    choices: [
      {
        id: 'a',
        label: 'とりあえずプロンプトを盛って、その場の出力を取り繕う',
        effects: { trust: -1, insight: -1 },
        resultText:
          '一時はそれらしい数字に戻った。だが根本は{{リグレッション}}したまま。顧客に出した在庫提案がまたズレ、結城さんの信頼が削れた（顧客に実害＝信頼−）。{{ハルシネーション}}を、{{ハルシネーション}}で塗り重ねた。',
        warn: true,
      },
      {
        id: 'b',
        label: '一旦AIを“下書き”に格下げし、人の検証と{{完成の定義}}を作り直す',
        effects: { insight: 1, culture: 1 },
        resultText:
          '出力は遅くなった。だが人の目を通す関所を取り戻し、二度と黙って壊れない構えにした。AIが書いた答えも、最後は自分の責任だ。',
      },
    ],
  },
  {
    id: 's3-daily-outcome',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '「動く」と「使われる」の谷',
    narrative:
      '新しい在庫画面は{{完成の定義}}を満たし、本番に乗った。だが田淵さんはまだ手書きメモを併用している。「動く」けれど、現場の習慣はまだ変わっていない。',
    choices: [
      {
        id: 'a',
        label: 'DoDは満たしたので「完了」とし、次の機能に進む',
        effects: { insight: -1 },
        resultText:
          'チケットは閉じた。だが使われない機能が、また一つ増えた。作って動くことを、成果と取り違えた。',
        warn: true,
      },
      {
        id: 'b',
        label: '{{成果の定義}}——田淵さんが手書きをやめたか——まで見届ける',
        effects: { insight: 1, culture: 1 },
        resultText:
          '画面に一手間足したら、ついに手書きが消えた。出力でなく、現場に起きた変化が“完了”だ。',
      },
    ],
  },
  {
    id: 's3-daily-3pl',
    sprint: 3,
    ceremony: 'daily',
    segment: 'chance',
    title: '「いっそ3PLに出せば？」',
    narrative:
      '赤城部長が「いっそ庫内まるごと{{3PL}}に出せば、コストもKPIも一発で良くなる」と言い出した。確かに数字は良くなる。だが現場で育ちかけた知は、外へ出ていく。',
    choices: [
      {
        id: 'a',
        label: '数字が良くなるなら、と{{3PL}}全面移管を後押しする',
        effects: { trust: 1, culture: -1 },
        resultText:
          '提案は経営に受けた（コスト削減で信頼+）。だが現場の改善文化は根こそぎ外注され、せっかくの知が霧散した。',
        warn: true,
      },
      {
        id: 'b',
        label: '移管は定型業務に絞り、現場で育った改善の核は社内に残す',
        effects: { insight: 1, culture: 1 },
        resultText:
          '全部は出さない。{{3PL}}に任せる所と、自分たちで握る所を線引きした。文化は、残す形を選ばないと残らない。（コストの信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's3-daily-handover2',
    sprint: 3,
    ceremony: 'daily',
    segment: 'team',
    title: '手順書か、橋本さんか',
    narrative:
      '橋本さんの手順書ができ始めた。だが「結局あの人に聞くのが速い」と、みんなまた橋本さんに駆け寄る。仕組みは作っても、習慣が戻る。',
    choices: [
      {
        id: 'a',
        label: '急ぎだから、今日もまた橋本さんに直接聞いて済ませる',
        effects: { culture: -1 },
        resultText:
          '今日は速かった。だが手順書は使われず埃をかぶる。仕組みは、使う習慣まで作って初めて根付く。',
        warn: true,
      },
      {
        id: 'b',
        label: 'あえて橋本さん抜きで、手順書を見ながらチームで対応してみる',
        effects: { culture: 1, insight: 1 },
        resultText:
          'つっかえながらも、チームだけで捌けた。橋本さんが「もう俺いらんかもな」と笑った。属人化が、ほどけ始めた。',
      },
    ],
  },
  {
    id: 's3-daily-retro-owner',
    sprint: 3,
    ceremony: 'daily',
    segment: 'team',
    title: '「やろう」で終わる改善',
    narrative:
      '改善案はたくさん出た。だが「誰が・いつまでに」やるかが、いつものように曖昧なまま終わりそうだ。',
    choices: [
      {
        id: 'a',
        label: '空気よく、たくさんの改善に全部「やろう」と頷いて終える',
        effects: { culture: -1 },
        resultText:
          '前向きな空気で散会した。だが誰のものでもない改善は、誰もやらず、次も同じ議題が並ぶ。',
        warn: true,
      },
      {
        id: 'b',
        label: '改善を3つに絞り、それぞれ担当と期限を{{バックログ}}に刻む',
        effects: { culture: 1, insight: 1 },
        resultText:
          '少ないが、確実に回る改善が残った。所有と期限のない合意は、ただの願望にすぎない。',
      },
    ],
  },
  {
    id: 's3-daily-leadership',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: '誰が決めるのか',
    narrative:
      '本番直前、重大な判断が要る局面。全員が当事者として意見を出すが、誰が最終決定をするのかが曖昧で、時間だけが過ぎていく。',
    choices: [
      {
        id: 'a',
        label: '波風を立てず、全員一致を待って判断を先送りにする',
        effects: { insight: -1 },
        resultText:
          '合議は続き、決まらないまま好機を逃した。全員の責任は、しばしば誰の責任でもなくなる。',
        warn: true,
      },
      {
        id: 'b',
        label: '意見を出し切らせた上で、自分がラストマンとして決め、責任を引き受ける',
        effects: { insight: 1, culture: 1 },
        resultText:
          '「自分が決める。責任は取る」。決まった瞬間、チームが動き出した。分散した当事者性も、最後の一点は要る。',
      },
    ],
  },
  {
    id: 's3-daily-prod',
    sprint: 3,
    ceremony: 'daily',
    segment: 'genba',
    title: 'もう少し磨いてから？',
    narrative:
      '改善した在庫最適化は、検証環境では完璧に回っている。「もう少し磨いてから本番に」という声。だが現場が本当に使うのは、本番に出てからだ。',
    choices: [
      {
        id: 'a',
        label: 'もう少し作り込んでから、と本番投入を先送りする',
        effects: { insight: -1 },
        resultText:
          '磨きは進んだが、現場の反応は得られないまま。{{PoC}}で満足する“あと一歩”が、いちばん遠い。',
        warn: true,
      },
      {
        id: 'b',
        label: '荒削りでも本番に出し、現場の反応で次を決める',
        effects: { insight: 1 },
        resultText:
          '本番に出した瞬間、検証環境では見えなかった例外が噴き出した。ユーザーが使って、初めて設計が始まる。',
      },
    ],
  },
  {
    id: 's3-daily-handoff-trust',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '「あなたが抜けたら…」',
    narrative:
      'プロジェクトの終わりが見えてきた。結城さんが不安げだ。「あなたが抜けたら、また元に戻るんじゃ…」。自分がいなくても回る形を、どう残すか。',
    choices: [
      {
        id: 'a',
        label: '不安に応え、自分が居続けて手厚く面倒を見ると約束する',
        effects: { trust: 1, culture: -1 },
        resultText:
          '結城さんは安心した（寄り添って信頼+）。だが自分への依存を作っただけ。FDEがヒーローのままでは、文化は残らない。',
        warn: true,
      },
      {
        id: 'b',
        label: '結城さんと橋本さんが自走できる運用と勘所を、一緒に文書化する',
        effects: { culture: 1, insight: 1 },
        resultText:
          '「これなら、自分たちで回せそうだ」。頼られることより、要らなくなることを目指した。（寄り添いの信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's3-daily-numbers',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '数字だけ並べるか',
    narrative:
      '郷田専務に最終成果を報告する。{{誤出荷率}}は確かに下がった。だが「なぜ下がったか」「次に何を残すか」を語らず、数字だけ並べることもできる。',
    choices: [
      {
        id: 'a',
        label: '良い数字だけをきれいに並べ、成功として締める',
        effects: { insight: -1 },
        resultText:
          '数字は拍手を呼んだ。だが理由を語らなかったぶん、再現性は残らない。定量は方向、定性は理由なのに。',
        warn: true,
      },
      {
        id: 'b',
        label: '数字に、現場で何が変わったかの物語を添えて報告する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '「だから、ここを残すんです」。数字と理由が揃って初めて、次へ続く成果になった。',
      },
    ],
  },
  {
    id: 's3-daily-blame',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    title: '「誰のミスだ」',
    narrative:
      '本番で小さな事故が出た。経営は「誰のミスだ」と犯人を探したがる。チームは萎縮し始めている。',
    choices: [
      {
        id: 'a',
        label: '経営の手前、原因者を特定して報告し、収拾を図る',
        effects: { culture: -1 },
        resultText:
          '犯人は見つかった。だが次から誰も失敗を言わなくなり、小さな火種が水面下に潜った。責任追及は、透明性を殺す。',
        warn: true,
      },
      {
        id: 'b',
        label: '個人でなく仕組みの欠陥として扱い、再発防止に振り向ける',
        effects: { culture: 1, insight: 1 },
        resultText:
          '「誰が、ではなく、なぜ起きたか」。安心して失敗を出せる場が、いちばん早く学ぶ。炎上は授業料つきの実地訓練だ。',
      },
    ],
  },
  {
    id: 's3-daily-scope-creep',
    sprint: 3,
    ceremony: 'daily',
    segment: 'chance',
    title: '「ついでにあれも」',
    narrative:
      '成果が出て、結城さんも郷田専務も上機嫌だ。「ついでにあれも、これも」と新しい要望が一気に膨らみ始めた。',
    choices: [
      {
        id: 'a',
        label: '機運に乗って、出てきた要望を全部この案件に詰め込む',
        effects: { insight: -1 },
        resultText:
          '欲張ったぶん、どれも中途半端になった。成功の勢いは、焦点を溶かす毒にもなる。',
        warn: true,
      },
      {
        id: 'b',
        label: '今回の{{スプリントゴール}}は守り、新要望は次の{{プロダクトゴール}}として整理する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '「次の約束」に並べ替えた。広げたい時こそ、Whyの最上段から積み直す。',
      },
    ],
  },
  {
    id: 's3-daily-mentor',
    sprint: 3,
    ceremony: 'daily',
    segment: 'chance',
    title: '久遠さんの問い',
    narrative:
      '夜の倉庫で、久遠さんがコーヒーを差し出した。「で、お前は何を“残せた”と思う？」。FDEとして来た意味を、問われている。',
    choices: [
      {
        id: 'a',
        label: '「{{誤出荷率}}を下げた成果です」と、出した数字で答える',
        effects: { insight: -1 },
        resultText:
          '久遠さんは静かに首を振った。「数字は、お前が抜けたら誰が守る？」。成果の手前で、問いの芯を外していた。',
        warn: true,
      },
      {
        id: 'b',
        label: '「現場が、自分たちで直し始めたことです」と答える',
        effects: { culture: 1, insight: 1 },
        resultText:
          '久遠さんはうなずいた。「現場を変え、プロダクトに戻し、組織を賢くする。それがFDEだ」。残すべきは、数字でなく回り続ける仕組みだった。',
      },
    ],
  },
  {
    id: 's3-daily-credit',
    sprint: 3,
    ceremony: 'daily',
    segment: 'team',
    title: '横取りされる手柄',
    narrative:
      '{{誤出荷率}}改善の成果を、赤城部長が自分の主導だったかのように経営へ報告しようとしている。やったのは現場とチームだ。来週の役員会、どう動く。',
    choices: [
      {
        id: 'a',
        label: '波風を立てず、手柄は赤城部長に譲って貸しを作る',
        effects: { trust: 1, culture: -1 },
        resultText:
          '赤城部長に貸しを作り、社内での立ち回りは楽になった（信頼+）。だがチームは「やった人が報われない」と熱を失った。',
        warn: true,
      },
      {
        id: 'b',
        label: '誰が何をやったかを事実ベースで示し、現場とチームの功績として経営に伝える',
        effects: { culture: 1, trust: -1 },
        resultText:
          '面子を潰された赤城部長は気色ばんだ（部長の顔を潰して信頼−）。だが田淵さんや橋本さんの名が役員会に残り、現場は「見ていてくれた」と背筋を伸ばした。',
      },
    ],
  },
  {
    id: 's3-daily-subcon',
    sprint: 3,
    ceremony: 'daily',
    segment: 'kokyaku',
    title: '下請けへの値下げ要求',
    narrative:
      '赤城部長が「うちの立場なら、運送の協力会社にもう1割値下げを飲ませられる。やれ」と言う。長年支えてくれた下請けだ。立場を使えば、断れまい。',
    choices: [
      {
        id: 'a',
        label: '立場を使い、協力会社に一方的な値下げを飲ませる',
        effects: { trust: 1, culture: -1 },
        resultText:
          'コストは下がり、社内の覚えはいい（信頼+）。だが下請けの信頼は冷え、繁忙期に「もう受けられません」と背を向けられる火種を作った。',
        warn: true,
      },
      {
        id: 'b',
        label: '叩くのでなく、物量の平準化で双方が得する組み方を協力会社と設計する',
        effects: { insight: 1, culture: 1 },
        resultText:
          '一方的に削るより、波を平らにして互いの無駄を消した。強い立場は、叩くためでなく、共に儲ける設計に使う。（即コスト減の信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's3-daily-keiri-closing',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    location: 'keiri',
    requiresFlag: 'fraudClue',
    hints: {
      po: '決算の数字の裏を詰めたい。経理部で連結の計上を確かめてきて。',
      sm: '現場実数と決算の食い違いを詰めよう。経理部で間宮さんと突き合わせて。',
      dev: '同じ機材が期末ごとに売買されてる気がします。経理部で原票を追ってください。',
    },
    title: '連結の帳尻',
    narrative:
      '間宮さんが連結決算の資料を広げた。「グループの間で、この機材が期末ごとに売り買いされて、そのたび利益が乗っています」。現場の実数は在庫ゼロ。なのに経理の数字には売上が立つ。会計の帳尻が、循環取引を指していた。',
    choices: [
      {
        id: 'a',
        label: '深入りは身の危険だ。資料は見なかったことにする',
        effects: { trust: 1, insight: -1 },
        resultText:
          '波風を立てず、その場をやり過ごした（角が立たず信頼+）。だが、会計が示した“動かぬ証拠”から、自分の手で目を逸らした。',
        warn: true,
      },
      {
        id: 'b',
        label: '間宮さんと、決算と現場実数の食い違いを証拠として固める',
        effects: { insight: 1 },
        resultText:
          '数字で語れ——会計の帳尻と現場の実数を突き合わせ、逃げ場のない証拠にした。紙・データに続く、三つ目の裏付けが揃った。（波風を立てない信頼+は取り逃す）',
        setsFlag: 'fraudCase',
      },
    ],
  },
  {
    id: 's3-daily-soumu-expense',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    location: 'soumu',
    hints: {
      po: '経費まわりの統制が気になる。総務部で精算のフローを見てきて。',
      sm: '承認が形骸化してるかも。総務部で手続きの実態を確かめて。',
      dev: '領収書と承認印の運用がゆるい気がします。総務部で確かめてください。',
    },
    title: '経費の綻び',
    narrative:
      '守屋さんに経費精算の代理入力を頼まれ、ふと気づく。承認印は形だけ、領収書は後付けでも通ってしまう。内部統制がザルだ。これでは、数字はいくらでも作れてしまう——嫌な符合が、頭をよぎる。',
    choices: [
      {
        id: 'a',
        label: '自分の領分じゃない。言われた通り処理して返す',
        effects: { trust: 1, insight: -1 },
        resultText:
          '波風を立てず、総務の覚えはよい（信頼+）。だが、見て見ぬふりをした統制の穴は、そのまま残った。',
        warn: true,
      },
      {
        id: 'b',
        label: '統制の穴を、責めずに改善提案として総務へそっと添える',
        effects: { culture: 1, insight: 1 },
        resultText:
          '誰かを責めるのでなく、仕組みで塞ぐ提案にした。{{ガバナンス}}は後付けにせず、設計で受け止める。組織が少し賢くなった。（事を荒立てない信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's3-daily-soumu-paper',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    location: 'soumu',
    requiresFlag: 'fraudClue',
    hints: {
      po: '幽霊設備の件、紙の裏取りが要る。総務部で契約書と請求書に当たって。',
      sm: '電算室のデータと紙が符合するか確かめたい。総務部で書類を突き合わせて。',
      dev: '請求書の控えに同じ機材が何度も出る気がします。総務部で原本を確認して。',
    },
    title: '書類の裏取り',
    narrative:
      '幽霊設備の件を追い、守屋さんに頼んで総務部の契約書と請求書の控えに当たった。守屋さんは少し迷ってから、棚の奥のファイルを出してくれた。すると——同じ{{フィジカルAI}}機材が、グループ各社の間で書類の上だけ売り買いされた痕跡。電算室で見た取引データと、紙が符合する。',
    choices: [
      {
        id: 'a',
        label: '波風を立てず、書類はそっと元の棚に戻す',
        effects: { trust: 1, insight: -1 },
        resultText:
          '面倒を避け、見なかったことにした（角が立たず信頼+）。だが——真実から目を逸らした手応えだけが残る。',
        warn: true,
      },
      {
        id: 'b',
        label: '日付と相手先まで、契約書と請求書の符合を突き合わせて記録する',
        effects: { insight: 1 },
        resultText:
          '事実・推測・願望を分け、誰が・いつ・何を・なぜまで控えた。紙とデータ、二つの“動かぬ証拠”が固まった。（波風を立てない信頼+は取り逃す）',
        setsFlag: 'fraudCase',
      },
    ],
  },
  {
    id: 's3-daily-faction',
    sprint: 3,
    ceremony: 'daily',
    segment: 'team',
    location: 'jinji',
    hints: {
      po: '人事を盾にした圧力がかかってる。人事部で異動の話の出どころを確かめて。',
      sm: 'チームが萎縮してる。人事部で“出向”の脅しが本当に動いてるのか見てきて。',
      dev: '出向だ何だは僕らじゃ分かりません。人事部で人事の事実を確かめてください。',
    },
    title: '「地方に飛ばされたいのか」',
    narrative:
      '正論で押し返すFDEに、赤城派の課長が耳打ちする。「あんまり波風立てると、君も地方倉庫に出向だぞ」。それを聞いたチームが、目に見えて萎縮し始めた。隅で、人事の新田さんが気まずそうに目を伏せた。',
    choices: [
      {
        id: 'a',
        label: '角を立てないよう正論を引っ込め、チームにも合わせるよう促す',
        effects: { trust: 1, culture: -1 },
        resultText:
          '波風は立たず、課長や赤城派の覚えはよくなった（信頼+）。だが「長いものに巻かれろ」が空気になり、現場の声がまた一つ死んだ。',
        warn: true,
      },
      {
        id: 'b',
        label: '脅しに屈さず、事実と数字で筋を通し、チームを守る',
        effects: { insight: 1, culture: 1 },
        resultText:
          '「出向、結構です」。感情でなく事実で受け返すと、課長は黙った。チームが「この人についていく」と背筋を伸ばした。（事を荒立てない信頼+は取り逃す）',
      },
    ],
  },
  {
    id: 's3-daily-circular',
    sprint: 3,
    ceremony: 'daily',
    segment: 'trouble',
    location: 'serverroom',
    hints: {
      po: 'お客さんの数字の裏が気になる。電算室で取引データに当たってきて。',
      sm: '部門の壁でデータが分断されてる。電算室で繋いで全体の流れを見て。',
      dev: '同じ機材のシリアルが何度も出てくる気が。電算室で取引ログを追ってください。',
    },
    requiresFlag: 'fraudClue',
    title: '書類の上だけ、ぐるぐる回る',
    narrative:
      '“在るはずの無い機材”を追い、組織の壁を壊して本社の取引データに繋いだ。すると見えてきた——同じシリアルの{{フィジカルAI}}機材が、グループ各社を書類の上だけで巡り、一周するたびに売上が立っている。架空の循環取引。カルゴ物流は、その踏み台にされていた。',
    choices: [
      {
        id: 'a',
        label: 'これは触れてはいけない領域だ。気づかなかったことにして蓋をする',
        effects: { insight: -1 },
        resultText:
          '見て見ぬふりを選んだ。だが一度見えた循環は、もう目に焼き付いている。事実から逃げた重さだけが残った。',
        warn: true,
      },
      {
        id: 'b',
        label: '取引データを突き合わせ、循環取引の証拠を一本につなげて固める',
        effects: { insight: 1 },
        resultText:
          '伝票・在庫・入出庫のログが、一本の輪につながった。これは状況証拠ではない。動かぬ証拠だ。——あとは、これをどうするか、だけ。',
        setsFlag: 'fraudCase',
      },
    ],
  },
]
