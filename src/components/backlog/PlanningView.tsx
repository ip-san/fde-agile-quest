/** PlanningView.tsx
 *  スプリント計画：プロダクトバックログ並べ替え提案＋スプリント予測組み立て。
 */

import { useMemo, useState } from 'react'
import {
  backlogItem,
  canAddToForecast,
  estimateOf,
  forecastPoints,
  isSbi,
  type ProposalVerdict,
  parentPbiOf,
  reviewBacklogProposal,
  reviewCapacityFor,
  titleOf,
} from '../../engine/backlog'
import { seedFor } from '../../lib/seed'
import type { ExecTier } from '../../types'
import { MiniGame } from '../minigame/MiniGame'
import { RichText } from '../RichText'
import { LegacySummary, PbiBadges, StakeholderBalance, VelocityChart } from './BacklogShared'

// ───────────────────────── ヘルパ ─────────────────────────

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

// ───────────────────────── 型 ─────────────────────────

export interface PlanningProps {
  sprintIndex: number
  backlogOrder: string[]
  sprintForecast: string[]
  backlogDone: string[]
  velocity: number[]
  lastCarryover: string[]
  retroImprovements: string[]
  unrefinedPbis: string[]
  commitBacklogOrder: (ids: string[]) => void
  toggleForecast: (id: string) => void
  splitItem: (id: string) => void
  refinePbi: (id: string) => void
}

// ───────────────────────── PlanningView ─────────────────────────

export function PlanningView({
  sprintIndex,
  backlogOrder,
  sprintForecast,
  backlogDone,
  velocity,
  lastCarryover,
  retroImprovements,
  unrefinedPbis,
  commitBacklogOrder,
  toggleForecast,
  splitItem,
  refinePbi,
}: PlanningProps) {
  const unrefinedSet = useMemo(() => new Set(unrefinedPbis), [unrefinedPbis])
  // 予測の"目安"＝今スプリントで実際に終わらせられる量。律速は1日のレビュー容量なので
  // それを基準にする（前回ベロシティではなく、真のボトルネックに合わせる）。レトロ改善(capacity)を反映。
  const capacity = reviewCapacityFor(retroImprovements)
  // 前回スプリントから持ち越された PBI のうち、まだ未 done のもの
  const carryoverSet = useMemo(() => new Set(lastCarryover), [lastCarryover])
  const fpts = forecastPoints({ sprintForecast })
  const over = fpts > capacity
  const doneSet = useMemo(() => new Set(backlogDone), [backlogDone])
  // 予測は分割後 SBI（`pbi#n`）を含むので、「この PBI を予測に入れたか」は親へ射影して判定する。
  const forecastParents = useMemo(() => new Set(sprintForecast.map(parentPbiOf)), [sprintForecast])
  // その PBI を既に作業項目(SBI)へ分割済みか（配下に SBI が一つでも入っている）。
  const splitParents = useMemo(() => new Set(sprintForecast.filter(isSbi).map(parentPbiOf)), [sprintForecast])

  const officialActive = useMemo(() => backlogOrder.filter((id) => !doneSet.has(id)), [backlogOrder, doneSet])
  const doneList = useMemo(() => backlogOrder.filter((id) => doneSet.has(id)), [backlogOrder, doneSet])

  const [editState, setEditState] = useState<{ draft: string[]; verdict: ProposalVerdict | null }>({
    draft: officialActive,
    verdict: null,
  })

  const { draft, verdict } = editState
  const dirty = !sameOrder(draft, officialActive)
  // 上位優先（飛ばし入れ禁止）では"次に入れられる1件"だけが addable。毎行 canAddToForecast を呼ぶと O(n²) なので、
  // PO 確定順(backlogOrder)上で最初に入れられる id を一度だけ求めて使い回す（その1件＝addable、他は不可）。
  const nextAddableId = useMemo(() => {
    const coreForSelect = { sprintForecast, backlogDone, unrefinedPbis, backlogOrder }
    return backlogOrder.find((id) => canAddToForecast(coreForSelect, id)) ?? null
  }, [sprintForecast, backlogDone, unrefinedPbis, backlogOrder])
  // PO 説得ミニゲームの表示フラグ。
  const [proposing, setProposing] = useState(false)
  const move = (id: string, dir: -1 | 1) => {
    setEditState((cur) => {
      const arr = [...cur.draft]
      const i = arr.indexOf(id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= arr.length) return cur
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return { draft: arr, verdict: null }
    })
  }
  // 「PO に提案」＝説得ミニゲームへ。優先順位は PO の所有なので、価値の論拠で説得して初めて動く。
  const submitProposal = () => setProposing(true)
  const resolveProposal = (tier: ExecTier) => {
    const v = reviewBacklogProposal({ sprintIndex, backlogDone, backlogOrder }, [...draft, ...doneList], tier)
    commitBacklogOrder(v.order)
    // PO が確定した順を draft に同期（採用/補正/却下のいずれでも"今の公式順"を映す）。verdict は残して結果を見せる。
    setEditState({ draft: v.order.filter((id) => !doneSet.has(id)), verdict: v })
    setProposing(false)
  }

  const rows = [...draft, ...doneList]

  // スプリントへ入れた予測（＝スプリントバックログ）。分割後は SBI を含むので forecast の並びをそのまま使う
  // （splitIntoSbi が親の位置に SBI を挿し込むので、同じ親の作業項目は連続して並ぶ）。完了済み親は除く。
  const selected = sprintForecast.filter((id) => !doneSet.has(parentPbiOf(id)))
  // 綱引き内訳は PBI 単位（SBI の estimate は親に合算済み）なので親へ射影して重複排除。
  const selectedParents = [...new Set(selected.map(parentPbiOf))]
  // 「外す」は親 PBI 単位で1回だけ出す。各親の先頭 id を一度の走査で求めて O(1) 参照にする（行ごとの findIndex を避ける）。
  const firstIdOfParent = new Map<string, string>()
  for (const id of selected) {
    const p = parentPbiOf(id)
    if (!firstIdOfParent.has(p)) firstIdOfParent.set(p, id)
  }

  return (
    <>
      <p className="text-xs leading-relaxed text-slate-400">
        <RichText text="{{プロダクトバックログ}}（価値順）の上位から「＋ スプリントへ」で今スプリントの{{スプリントバックログ}}に入れる＝{{スプリント予測}}。下位を上げたいときは、並びをPOに提案（説得）。" />
      </p>

      {/* 入れた予測の即時フィードバック：長いリストを下までスクロールしなくても件数/容量が常に見える。 */}
      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs ${
          selected.length === 0
            ? 'border-amber-500/30 bg-amber-500/5 text-amber-300'
            : over
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              : 'border-sky-500/30 bg-sky-500/10 text-sky-200'
        }`}
      >
        <span className="font-semibold">
          {selected.length === 0
            ? 'スプリントバックログは空（1件以上で開始）'
            : `スプリントバックログ：${selected.length}件`}
        </span>
        <span className="tabular-nums">
          {fpts} / {capacity} pt
        </span>
      </div>

      {/* 元：プロダクトバックログ（選ぶ側） */}
      <section className="rounded-xl bg-slate-900/40 p-2">
        <h3 className="mb-1 px-1 text-xs font-bold text-slate-300">
          <RichText text="{{プロダクトバックログ}}" />
          <span className="ml-1 font-normal text-slate-400">価値順・上位から選ぶ</span>
        </h3>

        {/* 持ち越しがある場合だけ注意書きを出す */}
        {carryoverSet.size > 0 && (
          <p
            role="note"
            className="mb-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-300"
          >
            ↪ 前回終わらなかった項目がバックログに戻っています。今回の予測に組み直しましょう。
          </p>
        )}

        <ul className="space-y-1.5">
          {rows.map((id) => {
            const item = backlogItem(id)
            if (!item) return null
            const isDone = doneSet.has(id)
            const isForecast = forecastParents.has(id)
            const isSplit = splitParents.has(id)
            // 分割できる：予測に素のまま入っていて（未分割）、split 定義を持つ。プランニング中はこの画面でのみ表示。
            const splittable = isForecast && !isSplit && !!item.split?.length
            const draftPos = draft.indexOf(id)
            // 上位優先：この項目が"次に入れられる1件"か（飛ばし入れ禁止）。
            const addable = id === nextAddableId
            return (
              <li
                key={id}
                className={`rounded-xl border px-3 py-2 ${
                  isDone
                    ? 'border-slate-800 bg-slate-800/20 opacity-70'
                    : isForecast
                      ? 'border-sky-500/40 bg-sky-500/10'
                      : 'border-slate-700 bg-slate-800/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!isDone ? (
                    <div className="flex flex-col gap-0.5 pt-0.5">
                      <button
                        type="button"
                        aria-label={`${item.title} を上へ`}
                        disabled={draftPos <= 0}
                        onClick={() => move(id, -1)}
                        className="rounded px-1 text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label={`${item.title} を下へ`}
                        disabled={draftPos < 0 || draftPos >= draft.length - 1}
                        onClick={() => move(id, 1)}
                        className="rounded px-1 text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  ) : (
                    <span className="w-5 shrink-0 pt-0.5 text-center text-xs text-emerald-300">✓</span>
                  )}

                  <div className="min-w-0 flex-1">
                    <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
                      {item.estimate}pt
                    </span>
                    {/* 機構：Refinement。発見直後の暫定見積り（Ready 化前）を明示 */}
                    {unrefinedSet.has(id) && !isDone && (
                      <span
                        aria-label="暫定見積り（要リファインメント）"
                        className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
                      >
                        暫定
                      </span>
                    )}
                    {/* 前回持ち越し・未done の項目にバッジ表示 */}
                    {carryoverSet.has(id) && !isDone && (
                      <span
                        aria-label="前回持ち越し"
                        className="ml-1.5 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300"
                      >
                        ↪ 前回持ち越し
                      </span>
                    )}
                    <PbiBadges id={id} stakeholder={item.stakeholder} />
                    <p className={`mt-1 text-sm ${isDone ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                      <RichText text={item.title} />
                    </p>
                    {/* 機構：プランニング Topic Three（PBI→作業項目への分解）。予測に入れた大きめ PBI を
                        「How（実行計画）」へ割れる。割るかはプレイヤー判断（大きいまま回すのも有効）。 */}
                    {!isDone && item.split?.length && isForecast && (
                      <div className="mt-1.5">
                        {splittable ? (
                          <button
                            type="button"
                            aria-label={`${item.title} を作業項目に分割する`}
                            title="大きな PBI を How（実行計画）へ分解＝作業項目に割る。各作業項目を独立に着手・レビューできる。ただし割れば着手の手間も仕掛り（WIP）の枠も増える——大きいまま1枚で回すのも有効で、唯一の正解はない。"
                            onClick={() => splitItem(id)}
                            className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[11px] font-semibold text-violet-200 transition hover:bg-violet-500/20 active:scale-95"
                          >
                            ✂ <RichText text="{{作業項目}}" interactive={false} />
                            に分割（{item.split.length}件）
                          </button>
                        ) : (
                          <ul className="space-y-0.5" aria-label="分割した作業項目">
                            {item.split.map((s, n) => (
                              <li
                                key={`${id}#${n + 1}`}
                                className="flex items-center gap-1.5 text-[11px] text-violet-200/90"
                              >
                                <span className="rounded bg-violet-500/15 px-1 py-px text-[9px] font-bold tabular-nums text-violet-300">
                                  {s.estimate}pt
                                </span>
                                <span className="truncate">
                                  <RichText text={s.title} interactive={false} />
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {!isDone &&
                    (unrefinedSet.has(id) ? (
                      // 機構：Refinement。発見直後の暫定見積りは Ready 化するまで予測に積めない。
                      <button
                        type="button"
                        aria-label={`${item.title} をリファインメントして Ready にする`}
                        title="発見した項目は暫定見積り。リファインメントで見積りを確かめて Ready にすると予測に積める。"
                        onClick={() => refinePbi(id)}
                        className="shrink-0 self-center rounded-lg bg-amber-500/90 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-400 active:scale-95"
                      >
                        🔍 <RichText text="{{リファインメント}}" interactive={false} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={
                          isForecast ? `${item.title} をスプリントから外す` : `${item.title} をスプリントへ入れる`
                        }
                        onClick={() => toggleForecast(id)}
                        disabled={!isForecast && !addable}
                        title={
                          !isForecast && !addable
                            ? '上位の項目を先に入れます（価値の高い順）。下位を上げたいなら、下で並べ替えをPOに提案。'
                            : undefined
                        }
                        className={`shrink-0 self-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                          isForecast
                            ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                            : addable
                              ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                              : 'cursor-not-allowed bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isForecast ? '✓ 入れた' : addable ? '＋ スプリントへ' : '上位が先'}
                      </button>
                    ))}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-2 space-y-2 rounded-xl border border-slate-700 bg-slate-800/30 px-3 py-2.5">
          {verdict && (
            <p
              role="status"
              aria-live="polite"
              className={`text-xs leading-relaxed ${
                verdict.rejected ? 'text-rose-300' : verdict.accepted ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              <span className="font-semibold">プロダクトオーナー：</span>
              {verdict.rejected ? (
                '今の優先順位には根拠がある。価値で説得しきれていない——並べ替えは見送りだ。現状の順で行こう。'
              ) : verdict.accepted ? (
                'いい並びだ。価値の順に届く。これで行こう。'
              ) : (
                <>
                  筋は通っている。ただし
                  {verdict.floated.map((fid) => `「${backlogItem(fid)?.title ?? fid}」`).join('')}
                  は今スプリントのゴールに直結する。優先順位の最終責任は私にある——上に戻した。
                </>
              )}
            </p>
          )}
          {!dirty && !verdict && (
            <p id="propose-hint" className="text-xs text-slate-500">
              ▲▼で並び替えると提案できます
            </p>
          )}
          {dirty && (
            <p className="text-xs leading-relaxed text-amber-300/90">
              並べ替えは"提案"の下書き中。「＋
              スプリントへ」はPOが確定した順から選べます——先にこの並びをPOに提案して通すと、その順で選べるようになります。
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitProposal}
              disabled={!dirty}
              aria-describedby={!dirty && !verdict ? 'propose-hint' : undefined}
              className="flex-1 rounded-lg bg-amber-500/90 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              並びをPOに提案する
            </button>
            {dirty && (
              <button
                type="button"
                onClick={() => {
                  setEditState({ draft: officialActive, verdict: null })
                }}
                className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-600 active:scale-95"
              >
                取消
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 入れる方向の明示 */}
      <p className="text-center text-xs text-sky-400/80" aria-hidden="true">
        ⬇ 選んだものが入る
      </p>

      {/* 先：スプリントバックログ（入れた予測） */}
      <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="px-0.5 text-xs font-bold text-sky-300">
            <RichText text="{{スプリントバックログ}}" />
            <span className="ml-1 font-normal text-sky-400/70">今スプリントに入れた予測</span>
          </h3>
          <span className={`text-xs font-bold tabular-nums ${over ? 'text-amber-300' : 'text-sky-200'}`}>
            {fpts} / {capacity} pt
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full rounded-full transition-all ${over ? 'bg-amber-500' : 'bg-sky-400'}`}
            style={{ width: `${Math.min(100, capacity ? (fpts / capacity) * 100 : 0)}%` }}
          />
        </div>
        <p className="mt-1 mb-2 text-xs text-slate-400">
          容量の目安＝1日の{<RichText text="{{レビュー}}" />}容量（{capacity}
          pt/日・毎デイリー回復・使い切り）。超えて入れても終わるのはレビューできた分だけ＝残りは
          {<RichText text="{{キャリーオーバー}}" />}。
        </p>

        {/* ステークホルダー内訳（情シス/現場の綱引き）。分割した SBI は親に合算済みなので親 id で集計。 */}
        <StakeholderBalance forecastIds={selectedParents} />

        {selected.length === 0 ? (
          <p className="rounded-lg bg-slate-900/40 px-3 py-3 text-center text-xs text-slate-400">
            まだ何も入れていません。上のリストから「＋ スプリントへ」で選びます。
          </p>
        ) : (
          <ul className="space-y-1">
            {selected.map((id) => {
              const parentId = parentPbiOf(id)
              const parent = backlogItem(parentId)
              if (!parent) return null
              const sbi = isSbi(id)
              // 「外す」は親 PBI 単位（配下 SBI ごと外れる）。同じ親が連続する分割行では先頭にだけ出す。
              const firstOfParent = firstIdOfParent.get(parentId) === id
              return (
                <li
                  key={id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
                    sbi ? 'border-violet-500/30 bg-violet-500/10' : 'border-sky-500/30 bg-sky-500/10'
                  }`}
                >
                  <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-300">
                    {estimateOf(id)}pt
                  </span>
                  {sbi ? (
                    <span
                      title="この一片だけ Done でも納品ではない。親 PBI の作業項目が全部そろって初めて顧客に届く（＝インクリメント）。"
                      className="rounded bg-violet-500/15 px-1 py-0.5 text-[9px] font-semibold text-violet-300"
                    >
                      作業項目
                    </span>
                  ) : (
                    <PbiBadges id={parentId} stakeholder={parent.stakeholder} />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-100">
                    <RichText text={titleOf(id)} interactive={false} />
                  </span>
                  {firstOfParent ? (
                    <button
                      type="button"
                      aria-label={`${parent.title} をスプリントから外す`}
                      onClick={() => toggleForecast(parentId)}
                      className="shrink-0 rounded px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-rose-300"
                    >
                      外す
                    </button>
                  ) : (
                    <span className="w-7 shrink-0" aria-hidden="true" />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 太く残す PBI のサマリ */}
      <LegacySummary backlogDone={backlogDone} />

      <VelocityChart velocity={velocity} />

      {/* PO 説得ミニゲーム（並べ替え提案時）。価値の論拠を2つ選んで PO を動かす。スキップ＝標準(good)。 */}
      {proposing && (
        <MiniGame
          kind="persuade"
          // 提案の中身でシードを変える＝説得の論拠カードの並びが毎回固定にならない（位置の暗記化を防ぐ）。
          seed={seedFor(`po-proposal-${sprintIndex}-${draft.join(',')}`)}
          onDone={resolveProposal}
          onSkip={() => resolveProposal('good')}
        />
      )}
    </>
  )
}
