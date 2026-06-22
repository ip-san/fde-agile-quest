// ───────────────────────────────────────────────────────────
// 効果音エンジン（WebAudio 合成）。アセット不要・オフライン対応（PWA）。
//
// 設計の出典: 逆転裁判の「面白さ」の中核に、決定的瞬間を音で強く印象づける演出がある
// （カプコン公式サウンドインタビュー＝確度: 高）。具体的には
//   ・「異議あり！」のSEと同時に BGM を止め、その“静寂”でインパクトを最大化する
//   ・追い詰めるクライマックスでは効果音を大幅に強化する
//   ・文字送り音のように、音だけで作品を識別できるシグネチャ音を持つ
// 本作には BGM が無いため「静寂を破る一撃」は作れないが、
//   選択を確定した瞬間の“決め”の合図 ＝ sfxDecide
//   結果を開示する瞬間の“一拍おいた一撃” ＝ sfxReveal（impact ほど派手に）
// で「決定的瞬間」を再現する。
//
// 注: jsdom（Vitest）や AudioContext 非対応環境では全 API が安全に no-op する。
// ───────────────────────────────────────────────────────────

import { readBool, writeBool } from '../lib/persist'

const MUTE_KEY = 'fde-agile-quest:muted'

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext }

let ctx: AudioContext | null = null
let muted = readBool(MUTE_KEY)

/** 現在ミュート中か */
export function isMuted(): boolean {
  return muted
}

/** ミュートを切り替えて、切替後の状態を返す（localStorage に永続化） */
export function toggleMuted(): boolean {
  muted = !muted
  writeBool(MUTE_KEY, muted)
  return muted
}

/** AudioContext を遅延生成（初回のユーザー操作後）。鳴らせない環境では null。 */
function audio(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null
  const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext
  if (!AC) return null
  if (!ctx) {
    try {
      ctx = new AC()
    } catch {
      return null
    }
  }
  // 自動再生ポリシーで suspended になることがある。ユーザー操作起点なので resume できる。
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface ToneOpts {
  freq: number
  dur: number
  /** コンテキスト現在時刻からのオフセット（秒）。複数音をずらして“間”やアルペジオを作る */
  t0?: number
  type?: OscillatorType
  gain?: number
  /** 指定すると freq → slideTo へグライド（追い詰める上昇／削れる下降の表現） */
  slideTo?: number
}

/** 単音。クリックノイズ回避のため微小なアタック／リリースを付ける。 */
function tone(ac: AudioContext, { freq, dur, t0 = 0, type = 'triangle', gain = 0.12, slideTo }: ToneOpts) {
  const start = ac.currentTime + t0
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(g).connect(ac.destination)
  osc.start(start)
  osc.stop(start + dur + 0.02)
}

/**
 * 項目を選んだ／外した瞬間の軽いカチッ音（チェックボックスの触感）。
 * 確定（sfxDecide）より控えめな単発。on は明るく上、off は低く下げて操作方向を音で区別する。
 */
export function sfxTick(on: boolean): void {
  const ac = audio()
  if (!ac) return
  tone(ac, { freq: on ? 880 : 440, dur: 0.045, type: 'square', gain: 0.05 })
}

/** 選択を確定した瞬間の“決め”の合図（短い二連符＝本作のシグネチャ音）。 */
export function sfxDecide(): void {
  const ac = audio()
  if (!ac) return
  tone(ac, { freq: 660, dur: 0.08, gain: 0.1 })
  tone(ac, { freq: 880, t0: 0.07, dur: 0.1, gain: 0.1 })
}

/** 結果開示の演出強度。impact＝決定的瞬間（大きく動いた／警告）。 */
export type RevealKind = 'impact' | 'good' | 'bad' | 'normal'

/**
 * 結果を開示する瞬間の一撃。逆転裁判の「静寂→一撃」を“一拍の間（無音）→開示音”で再現する。
 * impact は鋭く上昇する三段の一撃で「決定的瞬間」を強調する。
 */
export function sfxReveal(kind: RevealKind): void {
  const ac = audio()
  if (!ac) return
  switch (kind) {
    case 'impact':
      // 一拍おいて、鋭く突き上げる一撃（追い詰める／突きつける感触）
      tone(ac, { freq: 330, t0: 0.12, dur: 0.18, type: 'sawtooth', gain: 0.09, slideTo: 740 })
      tone(ac, { freq: 990, t0: 0.18, dur: 0.22, gain: 0.1 })
      tone(ac, { freq: 1320, t0: 0.25, dur: 0.26, gain: 0.07 })
      return
    case 'good':
      // 軽やかな上昇（伸びた）
      tone(ac, { freq: 523, dur: 0.1, gain: 0.09 })
      tone(ac, { freq: 784, t0: 0.09, dur: 0.14, gain: 0.09 })
      return
    case 'bad':
      // 下降（削れた／警告）
      tone(ac, { freq: 392, dur: 0.16, type: 'sawtooth', gain: 0.08, slideTo: 196 })
      return
    default:
      // 控えめな確認音
      tone(ac, { freq: 587, dur: 0.12, gain: 0.07 })
  }
}

/**
 * 危険水域に踏み込んだ瞬間の警告音（追い詰められる緊張＝逆転裁判のライフゲージ減少に相当）。
 * 低く沈む不穏な二連の下降音。致命圏入りの結果開示で reveal の代わりに鳴らす。
 */
export function sfxDanger(): void {
  const ac = audio()
  if (!ac) return
  tone(ac, { freq: 247, dur: 0.22, type: 'sawtooth', gain: 0.09, slideTo: 130 })
  tone(ac, { freq: 196, t0: 0.16, dur: 0.3, type: 'sawtooth', gain: 0.08, slideTo: 98 })
}

/** FDE心得を新しく獲得した瞬間のご褒美音（明るく上昇するアルペジオ）。学習の到達を音で祝う。 */
export function sfxPrecept(): void {
  const ac = audio()
  if (!ac) return
  tone(ac, { freq: 659, dur: 0.1, gain: 0.08 })
  tone(ac, { freq: 880, t0: 0.09, dur: 0.1, gain: 0.08 })
  tone(ac, { freq: 1175, t0: 0.18, dur: 0.18, gain: 0.08 })
}

/** ルーレットを回し始めた合図（短い上昇する三連の刻み＝回り出す手応え）。 */
export function sfxSpin(): void {
  const ac = audio()
  if (!ac) return
  tone(ac, { freq: 440, dur: 0.06, gain: 0.07 })
  tone(ac, { freq: 587, t0: 0.05, dur: 0.06, gain: 0.07 })
  tone(ac, { freq: 740, t0: 0.1, dur: 0.08, gain: 0.07 })
}

/** ルーレットが止まった瞬間の合図（カチッと噛む短い停止音）。お題が確定する区切り。 */
export function sfxStop(): void {
  const ac = audio()
  if (!ac) return
  tone(ac, { freq: 880, dur: 0.05, gain: 0.08 })
  tone(ac, { freq: 392, t0: 0.04, dur: 0.12, gain: 0.07 })
}

/**
 * AudioContext を"温める"（mobile Safari 等の初回無音対策）。
 *
 * 背景: mobile Safari では AudioContext は生成直後 suspended 状態で、
 * audio() 内の ctx.resume() は async なため、resume 完了前に tone を
 * スケジュールすると初回が無音になることがある。
 * 最初のユーザー操作（pointerdown / keydown）でこの関数を呼ぶことで
 * context を事前に生成＋resume しておき、以降の効果音を確実に鳴らす
 * （標準的な mobile-audio unlock パターン）。
 *
 * - muted 時: audio() が null を返すため no-op（音が無いので温め不要）。
 * - jsdom / AudioContext 非対応: audio() が安全に null を返すため no-op。
 * - 冪等: 複数回呼んでも ctx は singleton なので害なし。
 */
export function primeAudio(): void {
  audio()
}

/** 結果のメーター増減と警告フラグから、開示演出の強度を決める純関数。 */
export function revealKindFor(effects: Record<string, number | undefined>, warn?: boolean): RevealKind {
  let magnitude = 0
  let hasNeg = false
  let hasPos = false
  for (const v of Object.values(effects)) {
    if (!v) continue
    magnitude += Math.abs(v)
    if (v > 0) hasPos = true
    if (v < 0) hasNeg = true
  }
  // 警告つき、または合計の振れ幅が大きい判断＝決定的瞬間
  if (warn || magnitude >= 3) return 'impact'
  if (hasPos && !hasNeg) return 'good'
  if (hasNeg) return 'bad'
  return 'normal'
}
