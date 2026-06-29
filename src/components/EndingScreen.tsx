import { useEffect, useState } from 'react'
import { displayName } from '../data/chapters/chapter-01/names'
import { endingImage, imageUrl } from '../data/images'
import { SEEDS } from '../data/seeds'
import type { ValueBreakdown } from '../engine/progression'
import { sfxReveal } from '../engine/sfx'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import type { Epilogue, GameFlag, LogEntry, Meters } from '../types'
import { CustomerValueBar } from './CustomerValueBar'
import { DecisiveFlash } from './DecisiveFlash'
import { MeterHUD } from './MeterHUD'

interface Props {
  ending: Epilogue
  meters: Meters
  customerValue: number
  /** 顧客価値の内訳（積み上げバー用。判断×実装の合流を見せる） */
  valueBreakdown: ValueBreakdown
  /** 届けたインクリメント＝DoD 達成のバックログ項目（カンバンの Done 通算） */
  deliveredItems: number
  /** 開始時の顧客価値（成長曲線の起点） */
  valueBaseline: number
  /** スプリント末ごとに記録した顧客価値（index=sprintIndex。成長曲線に使う） */
  valueHistory: number[]
  /** 第1章で掴んだ不正の"伏線"の深さ（次章への引き）。none=気づかず / clue=違和感 / case=輪郭 */
  fraudHint?: 'none' | 'clue' | 'case'
  /** この周回で立ったフラグ（エンディング引き文の周回差別化に使用） */
  flags?: ReadonlySet<GameFlag>
  /** これまでに発見した「次の機能の種」ID（周回をまたいで永続） */
  foundSeeds?: ReadonlySet<string>
  log: LogEntry[]
  onReset: () => void
}

/** 第1章で掴んだ不正の伏線に応じた"次章への引き"。告発の決着は次章へ繰り延べる。 */
const FRAUD_TEASER: Record<'clue' | 'case', string> = {
  clue: '——本物の仕事を進めるほどに、グループの数字の裏に、説明のつかない違和感が一つ、残った。それが何なのか、今はまだ分からない。だが、見なかったことには、できない。',
  case: '——あなたは見てしまった。同じ機材が書類の上だけを巡る、架空の循環取引の輪郭を。一介のFDEが今この場で動かせる話ではない。だがその記録は、静かに胸に刻まれた。いつか、決着をつける日のために。',
}

/** 不正アークを追った周回への"章内の払い"（§6.5・労力に報酬を返す）。
 *  次章への「引き」（FRAUD_TEASER）が情緒の余韻なのに対し、こちらは「追った手間が次フェーズで効く資産として
 *  残った」ことを具体的に確認する一段。決着は次章へ繰り延べる（§6.5）ため、ここでは"暴く"ではなく
 *  「掴んだものが消えずに次へ持ち越される」ことだけを担保し、全スルー周回との"差"を体感に変える。
 *  掴んだ深さ（clue=違和感の入口／case=固めた記録）で払いの重みに勾配をつける。 */
const FRAUD_CARRYOVER: Record<'clue' | 'case', { label: string; body: string }> = {
  case: {
    label: '持ち越す手札',
    body: '——あなたが裏取りに費やした時間は、無駄ではなかった。突き合わせ、控えに残したその記録は、誰かの記憶任せではない、消えない一束の証拠としてまだ手の中にある。今は動かせなくても、次のフェーズで必ず使うときが来る。追った者だけが、その手札を持って次の舞台に立つ。',
  },
  clue: {
    label: '持ち越す糸口',
    body: '——あなたが立ち止まって確かめた一手は、無駄ではなかった。流していれば気づかぬまま終わっていた糸口を、見える場所に掴んでいる。まだ証拠と呼べる固さはない。それでも、追った者だけが次の一歩の入口に立っている。',
  },
}

/** 「次章への引き」の末尾に周回の判断を反映した1文を追加する（#190）。
 *  ending.id と主要フラグで最初にマッチした一文を返す。全員共通の核（テラー文）はそのまま残す。 */
function carryoverLine(endingId: string, flags: ReadonlySet<GameFlag>): string | null {
  if (endingId.startsWith('fail-')) return null
  if (endingId === 'disliked')
    return '嫌われた。それが正しかったかどうかは、次のフェーズが答えを持っている。背を向けた人ほど、理由を覚えているものだ。'
  if (endingId === 'orderTaker' || flags.has('topDown'))
    return '言われた通り作って、納期は守った。要望書の外に残した宿題が、次のフェーズで戻ってくる。'
  if (flags.has('genbaTrust') && endingId === 'trueFde')
    return '翠流物流の現場と築いた信頼は、次のフェーズで最大の資産になる。この3スプリントで刻んだ人間関係の地図は、消えない。'
  if (flags.has('genbaTrust')) return '現場の側に立ち続けた積み上げは残る。次のフェーズでそれが効く場面が来る。'
  if (endingId === 'trueFde')
    return '取り切れたトレードオフと、取り切れなかったトレードオフ。どちらも次の入り口で待っている。'
  // decent / hero / その他クリアエンド
  return '取り切れなかったトレードオフが、次の入り口で待っている。'
}

/** 現場で発見した「次の機能の種」の収集数をエンディングに反映する純関数（クリアエンドのみ）。
 *  全種収集: 現場観察→製品還元のフィードバックループ完結を祝う一段。
 *  部分達成（4種以上）: 手応えを体感させ、次周回での全収集意欲に繋げる。
 *  fail-* エンディングでは非表示（return null）。 */
function seedsLine(endingId: string, foundSeeds: ReadonlySet<string>): string | null {
  if (endingId.startsWith('fail-')) return null
  if (foundSeeds.size >= SEEDS.length) {
    return `${SEEDS.length}つの種がすべてStockPilotに還元された——現場の声が製品になる回路を、あなたが繋いだ。`
  }
  if (foundSeeds.size >= 4) {
    return `${foundSeeds.size}つの現場の声がStockPilotに届いている——観察が製品を変える手応えが、ここにある。`
  }
  return null
}

/** 「決断の一歩手前」（不正を掴んだ周回のみ）。告発の決着は次章へ繰り延べる（§6.5）ので、
 *  ここでは"決着"ではなく主人公の「姿勢」を一つ選ばせ、繰り延べを"自分で選んだ焦らし"に変える。
 *  フレーバー（結びの一文を彩る）に留め、メーターや永続フラグには影響しない。 */
const FRAUD_STANCE: Record<
  'clue' | 'case',
  { prompt: string; options: { key: string; label: string; after: string }[] }
> = {
  case: {
    prompt: 'この記録を、どう抱える？',
    options: [
      { key: 'pursue', label: 'いつか、必ず暴く', after: '——胸の奥で、静かに刃を研ぐと決めた。次章で、必ず。' },
      {
        key: 'hold',
        label: '今は、記録だけを抱いて',
        after: '——今は動かない。だが消さない。時が満ちるまで、抱えていく。',
      },
    ],
  },
  clue: {
    prompt: 'この違和感を、どうする？',
    options: [
      {
        key: 'pursue',
        label: '忘れない。必ず確かめる',
        after: '——小さな棘が刺さったまま。次章で、その正体を確かめる。',
      },
      { key: 'letgo', label: '気のせいだと、流す', after: '——見なかったことにした。だが、本当にそうだろうか。' },
    ],
  },
}

function FraudStanceBeat({ hint }: { hint: 'clue' | 'case' }) {
  const [picked, setPicked] = useState<string | null>(null)
  const s = FRAUD_STANCE[hint]
  const chosen = picked ? s.options.find((o) => o.key === picked) : null
  if (chosen) return <p className="mt-3 text-sm leading-relaxed text-amber-100">{chosen.after}</p>
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-semibold text-amber-200/90">{s.prompt}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {s.options.map((o) => (
          <button
            type="button"
            key={o.key}
            onClick={() => setPicked(o.key)}
            className="flex-1 rounded-lg border border-amber-500/40 px-3 py-2 text-sm text-amber-100 transition hover:bg-amber-500/10 active:scale-95"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** S/A ランク演出のフラッシュ色（ResultModal の greatExit 相当の amber）。 */
const RANK_FLASH_COLOR = '#fbbf24' // amber-400

/** ランク閾値（valueRank 関数と必ず一致させる）。
 *  EndingScreen 内でギャップ計算に使う唯一の定義場所。 */
const RANK_THRESHOLDS = { S: 90, A: 75, B: 60, C: 40 } as const

/** C/D ランク時の固定メッセージ（スコアギャップ表示が使えない場合のフォールバック）。 */
const LOW_RANK_FALLBACK: Record<'C' | 'D', string> = {
  C: 'まだ見えていない現場がある。次は、もう一歩だけ深く踏み込んでみよう。',
  D: '価値を届けられなかった判断の跡を、一度ゆっくり辿ってみよう。次は違う景色が見える。',
}

/** C/D ランク・FAIL 時の「惜しさ・次への焦点」ヒントを返す純関数。
 *  C ランクかつギャップ 15 以内: スコアギャップを具体的に名指し（例A）。
 *  それ以外: 別ルートへの1行ヒント（例C ベース）。 */
function lowRankHint(grade: 'C' | 'D' | 'fail', customerValue: number): string {
  if (grade === 'fail') {
    return 'どのゲージが先に尽きたか確かめて、そのゲージに関わる判断をひとつ変えてみよう。'
  }
  if (grade === 'C') {
    const gap = RANK_THRESHOLDS.B - customerValue // 正値 = B 未満
    if (gap > 0 && gap <= 15) {
      return `あと ${gap} ポイントで B ランクだった。その差を埋めた判断が、次の鍵になる。`
    }
  }
  // D ランク or C ランクでギャップが大きい場合: 別ルートヒント
  return LOW_RANK_FALLBACK[grade === 'C' ? 'C' : 'D']
}

/** 顧客価値（北極星）の最終ランク。案件の"スコア"として結果に意味を与える。 */
function valueRank(v: number): { grade: string; label: string; cls: string } {
  if (v >= 90)
    return {
      grade: 'S',
      label: '圧倒的な価値を届けた',
      cls: 'text-amber-300 border-amber-400/50 bg-[var(--accent)]/10',
    }
  if (v >= 75)
    return { grade: 'A', label: '確かな価値を届けた', cls: 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10' }
  if (v >= 60) return { grade: 'B', label: '価値は届いた', cls: 'text-sky-300 border-sky-400/40 bg-sky-400/10' }
  if (v >= 40)
    return {
      grade: 'C',
      label: '価値は道半ば',
      cls: 'text-[var(--text-body)] border-[var(--border-strong)]/70 bg-[var(--border-strong)]/10',
    }
  return { grade: 'D', label: '価値を残せなかった', cls: 'text-rose-300 border-rose-400/40 bg-rose-400/10' }
}

/** 顧客価値の成長曲線（開始 → 各スプリント末）。「案件を通じてどれだけ価値を伸ばしたか」を
 *  右肩上がり（であってほしい）の一枚絵で見せる。北極星は手段の結実なので、ここが物語の総括になる。 */
function ValueTrend({ baseline, history }: { baseline: number; history: number[] }) {
  // 起点（開始時）＋スプリント末ごとの記録値。未記録（undefined）は曲線から落とす。
  const points: { label: string; v: number }[] = [{ label: '開始', v: baseline }]
  history.forEach((v, i) => {
    if (typeof v === 'number' && Number.isFinite(v)) points.push({ label: `S${i + 1}`, v })
  })
  if (points.length < 2) return null // スプリント末の記録が無ければ曲線にならない

  const W = 100
  const H = 34
  const pad = 3
  const n = points.length
  const x = (i: number) => pad + (i * (W - pad * 2)) / (n - 1)
  const y = (v: number) => pad + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - pad * 2)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ')
  const net = points[n - 1].v - points[0].v

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/60 px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-200">顧客価値の歩み</p>
        <span
          className={`text-xs font-bold tabular-nums ${net > 0 ? 'text-emerald-300' : net < 0 ? 'text-rose-300' : 'text-[var(--text-sub)]'}`}
        >
          通算 {net > 0 ? `▲ +${net}` : net < 0 ? `▼ ${net}` : '±0'}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-16 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`顧客価値の推移：${points.map((p) => `${p.label} ${p.v}`).join('、')}`}
      >
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          className="text-[var(--accent)]"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={p.label} cx={x(i)} cy={y(p.v)} r={1.6} fill="currentColor" className="text-[var(--accent)]" />
        ))}
      </svg>
      <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-[var(--text-sub)]">
        {points.map((p) => (
          <span key={p.label}>
            {p.label}
            <span className="ml-0.5 text-[var(--text-body)]">{p.v}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function EndingScreen({
  ending,
  meters,
  customerValue,
  valueBreakdown,
  deliveredItems,
  valueBaseline,
  valueHistory,
  fraudHint = 'none',
  flags = new Set(),
  foundSeeds = new Set(),
  log,
  onReset,
}: Props) {
  const failed = ending.id.startsWith('fail-')
  const rank = valueRank(customerValue)
  const teaser = fraudHint === 'none' ? null : FRAUD_TEASER[fraudHint]
  const fraudCarryover = fraudHint === 'none' ? null : FRAUD_CARRYOVER[fraudHint]
  const carry = carryoverLine(ending.id, flags)
  const imgKey = endingImage(ending.id)

  // S/A ランクの一撃演出フェーズ。
  // 'flash'=閃光・音のみ表示 → 600ms 後に 'reveal'=グラフ・ランクバッジ表示。
  // prefers-reduced-motion 時・S/A 以外は最初から 'reveal'。
  const reducedMotion = usePrefersReducedMotion()
  const isHighRank = !failed && (rank.grade === 'S' || rank.grade === 'A')
  const [phase, setPhase] = useState<'flash' | 'reveal'>(isHighRank && !reducedMotion ? 'flash' : 'reveal')

  // S/A ランクかつモーション有効な場合のみ演出を起動する。
  // マウント直後に sfxReveal('impact') を鳴らし、600ms 後に reveal フェーズへ。
  // 依存配列を空にするのは意図的：コンポーネントは1回だけマウントされ、演出も1回だけ起動する。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 初回マウント時の1回起動が意図した動作
  useEffect(() => {
    if (!isHighRank || reducedMotion) return
    sfxReveal('impact')
    const timer = setTimeout(() => setPhase('reveal'), 600)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-safe py-10">
      {/* S/A ランク演出：閃光（phase==='flash' の間だけ全画面表示し、音は useEffect で鳴らす） */}
      {isHighRank && phase === 'flash' && <DecisiveFlash color={RANK_FLASH_COLOR} />}

      <div className="text-center">
        <p
          className={`text-xs font-semibold uppercase tracking-widest ${failed ? 'text-rose-400' : 'text-[var(--text-sub)]'}`}
        >
          {failed ? 'BAD END — 案件終了' : 'Ending'}
        </p>
        <h1 className={`mt-2 text-3xl font-bold ${failed ? 'text-rose-300' : 'text-amber-300'}`}>{ending.title}</h1>
      </div>

      {/* 結末の情景画像（実写ドキュメンタリー風・あれば）。未登録なら枠ごと出さない。 */}
      {imgKey && (
        <img
          src={imageUrl(imgKey)}
          alt=""
          className="h-40 w-full rounded-2xl object-cover sm:h-56"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}

      {failed && <p className="text-center text-xs text-rose-300/80">ゲージが1つでも0になると、案件はここで終わる。</p>}

      <p
        className={`rounded-2xl border p-5 text-sm leading-relaxed ${
          failed
            ? 'border-rose-500/40 bg-rose-950/30 text-rose-100'
            : 'border-[var(--border)] bg-[var(--card)]/60 text-[var(--text-body)]'
        }`}
      >
        {ending.reflection}
      </p>

      {/* "次章への引き"（クリア時のみ）。告発の決着は第1章ではつけない（§6.5）。
          全員向け＝ショーケース弧の伏線（フィジカルAI実証が“ルミクラウドのおかげで順調”と上方向に
          報告される皮肉。主人公の成否に依らず＝低評価エンドでも矛盾しないよう、断定せず「上が実態を
          確かめぬまま順調と上げ、見栄えの数字だけが独り歩きする」構図に留める。産学官/補助金の決着には
          絡めず、機械が回り続ける匂わせだけ残して第二章へ繋ぐ）。不正を掴んだ周回はさらに違和感の引きを重ねる。 */}
      {!failed && (
        <div className="rounded-2xl border border-amber-600/40 bg-amber-950/20 p-5">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-400/80">
            To be continued — 次章へ
          </p>
          {carry && <p className="mb-3 text-sm italic leading-relaxed text-amber-200/80">{carry}</p>}
          <p className="text-sm leading-relaxed text-amber-100/90">
            ——後日、グループの定例報告。{displayName('parentCo')}は、現場の実態を確かめもせず、さらに上の
            {displayName('groupHq')}へ、こう上げたという。「フィジカルAI実証、順調に進んでおります。現場のIT化が
            効きました——{displayName('lumen')}のおかげで」。現場で実際に何が起きたかとは関わりなく、
            “実証は進んでいる”という見栄えの数字だけが、ひとり歩きを始めていた。あの日のフィジカルAIの華々しいお披露目は、
            まだ終わっていない。——デモ機の足元のパネルに小さく並んでいた{displayName('powerDevice')}
            という名が、ふと脳裏をよぎる。次の舞台は、その奥にある。
          </p>
          {/* 不正の伏線を掴んだ周回だけ、個人の“違和感”の引きを重ねる。決着はつけず（§6.5）、
              主人公の"姿勢"だけを選ばせて繰り延べを焦らしに変える。 */}
          {teaser && (
            <div className="mt-3 border-t border-amber-600/20 pt-3">
              <p className="text-sm leading-relaxed text-amber-100/90">{teaser}</p>
              {/* 章内の"払い"（§6.5・労力に報酬を返す）。追った手間が「次フェーズで効く資産」として残った
                  ことを具体に確認し、全スルー周回との差を体感に変える。決着は次章へ繰り延べたまま。 */}
              {fraudCarryover && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-amber-300/80">
                    {fraudCarryover.label}
                  </p>
                  <p className="text-sm leading-relaxed text-amber-100/90">{fraudCarryover.body}</p>
                </div>
              )}
              <FraudStanceBeat hint={fraudHint as 'clue' | 'case'} />
            </div>
          )}
        </div>
      )}

      {/* Seeds ナレーション: 現場観察→製品還元ループの達成をクリアエンドのみで表示する。
          全種収集・部分達成（4種以上）でそれぞれ異なる一段を出す。fail-* は非表示（seedsLine が null を返す）。 */}
      {seedsLine(ending.id, foundSeeds) && (
        <p className="mt-2 text-sm leading-relaxed text-emerald-200/70">{seedsLine(ending.id, foundSeeds)}</p>
      )}

      {/* C/D ランク時：演出なし・「惜しさと次への焦点」を前面に出す。
          メーター/グラフより先に表示して「改善への意欲」を持ち帰らせる。
          スコアギャップが 15 以内なら具体的なポイント差を名指しし、それ以外は別ルートヒント。 */}
      {!failed && (rank.grade === 'C' || rank.grade === 'D') && (
        <div className="rounded-2xl border border-[var(--border-strong)]/70 bg-[var(--card)]/80 px-5 py-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-sub)]">
            次回に向けて
          </p>
          <p className="text-base font-bold leading-relaxed text-[var(--text-body)]">
            {lowRankHint(rank.grade as 'C' | 'D', customerValue)}
          </p>
        </div>
      )}

      {/* FAIL 時：「どのゲージが先に尽きたか確かめる」リトライ焦点を追加する。
          既存の reflection テキストの直後に表示し、次への具体的な手がかりを渡す。 */}
      {failed && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 px-5 py-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-rose-400/80">次への焦点</p>
          <p className="text-sm leading-relaxed text-rose-100/90">{lowRankHint('fail', customerValue)}</p>
        </div>
      )}

      {/* S/A ランク演出中（phase==='flash'）はグラフ・ランクバッジを非表示にし、
          演出後（phase==='reveal'）にフェードインして提示する（苦労の山 → データ提示の順）。 */}
      <div
        className={
          phase === 'flash' ? 'invisible' : isHighRank ? 'motion-safe:animate-[fadeSlideIn_0.25s_ease-out]' : ''
        }
      >
        <div className="space-y-2">
          <p className="mb-2 text-xs font-semibold text-[var(--text-sub)]">最終評価</p>
          {/* 顧客価値ランク＝この案件で届けた価値の総合スコア（北極星の結実） */}
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${rank.cls}`}>
            <span className="text-2xl font-bold tabular-nums">{rank.grade}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold">顧客価値ランク：{rank.label}</p>
              <p className="text-xs opacity-80">最終顧客価値 {customerValue} / 100</p>
            </div>
          </div>
          <CustomerValueBar value={customerValue} breakdown={valueBreakdown} />
          {/* 開始 → 各スプリント末の顧客価値の歩み（成長曲線）。案件の総括として右肩上がりを見せる。 */}
          <ValueTrend baseline={valueBaseline} history={valueHistory} />
          <MeterHUD meters={meters} />
          {/* 届けたインクリメント＝スプリントバックログを Done にした成果。0 は"使わなかった機会損失"として可視化 */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)]/60 px-4 py-2.5 text-sm">
            <span className="text-[var(--text-body)]">届けたインクリメント</span>
            {deliveredItems > 0 ? (
              <span className="font-bold tabular-nums text-emerald-300">{deliveredItems} 件</span>
            ) : (
              <span className="text-xs text-[var(--text-sub)]">0 件 — バックログを Done にできなかった</span>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-[var(--text-sub)]">
        この案件であなたは {log.length} の判断を下した。
        <br />
        別の判断は、別の結末へ続く。
      </p>

      <button
        type="button"
        onClick={onReset}
        className={`mx-auto rounded-xl px-8 py-3 font-bold text-[var(--bg)] transition active:scale-95 ${
          failed ? 'bg-rose-400 hover:bg-rose-300' : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)]'
        }`}
      >
        もう一度、別の判断で挑む
      </button>
    </div>
  )
}
