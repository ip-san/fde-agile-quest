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
          '「あなたがいれば安心」と情シスは頼り切る（信頼+）。だが自分が抜けたら止まる仕組みになっていく。',
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
          '「作り直し…？」と情シスは渋い顔（前提の誤りを認めて信頼−）。痛い手戻りだが軌道修正した。上が崩れたら下は全部やり直す。',
      },
      {
        id: 'b',
        label: '引き返せず、機能をさらに足して押し切る',
        effects: { trust: -2, insight: -1 },
        resultText:
          '使われない機能を重ねるうち、成果の出なさに情シスの失望が深まる（信頼−−）。沈黙する画面に沈黙する機能が積み上がる。',
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
          '今日は速く回り、情シスも安心（信頼+）。だが運用が自分に依存し、組織は賢くならない。',
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
        label: '自分が毎朝チェックして情シスに報告し続ける',
        effects: { trust: 1, culture: -2 },
        resultText:
          '毎朝の報告に情シスは安心（信頼+）。だが数字を読む役が自分から離れず、現場が自分で意思決定する習慣が育たない。',
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
          '一気に自動化して見せたので情シスは「運用が楽になった」と一旦満足（信頼+）。だが暴走時に戻せない。{{エージェント}}より先に、権限の境界を設計すべきだった。',
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
  {
    id: 's3-review',
    sprint: 3,
    ceremony: 'review',
    segment: 'kokyaku',
    title: '最終レビュー：成果を語る',
    narrative:
      '誤出荷率の推移を、完成した{{インクリメント}}とともに経営に報告する。{{PoC}}止まりにせず本番で回り始めた成果だ。',
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
]
