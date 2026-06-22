import type { HearingTheme } from '../types'

/** イベントのセグメントからヒアリングのテーマを決める（hearing は genba/kokyaku/chance/team で発火）。
 *  trouble をヒアリングにする場合は、調査=genba／対人=team を event.hearingTheme で明示する想定。 */
export function hearingThemeFor(segment: string): HearingTheme {
  return segment === 'genba' || segment === 'kokyaku' || segment === 'chance' || segment === 'team'
    ? segment
    : 'kokyaku'
}
