import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

// WCAG 2.0/2.1 A・AA を対象に、重大度の高い違反だけをゲートにする
// （Lighthouse の単一ロード監査では届かない“モーダルを開いた状態”の a11y を検査する）。
const GATE_IMPACTS = new Set(['serious', 'critical'])

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return violations
    .filter((v) => GATE_IMPACTS.has(v.impact ?? ''))
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.map((n) => n.target),
    }))
}

// プロローグを既読にして盤面から始める（ルーレットの乱数に触れず決定的に検査する）
async function gotoBoard(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('fde-agile-quest:prologue-seen', '1')
    // 都度教示(コーチマーク)は遅延ロードで盤面に被さり、クリックを遮る（z-40 オーバーレイ）。
    // 既読化して抑止し、a11y テストのパネル操作を決定的にする（盤面の本来の a11y は別テストで担保）。
    for (const k of ['intro', 'planning', 'daily', 'review', 'retro', 'minigame']) {
      localStorage.setItem(`fde-agile-quest:coach:${k}`, '1')
    }
    // バックログパネル初回チュートリアルオーバーレイも抑止（role="dialog" が重複するのを防ぐ）。
    localStorage.setItem('backlog-tutorial-seen', '1')
  })
  await page.goto('/')
}

test('初回ロードのプロローグに重大な a11y 違反がない', async ({ page }) => {
  await page.goto('/')
  const v = await seriousViolations(page)
  expect(v, JSON.stringify(v, null, 2)).toEqual([])
})

test('ゲーム盤面に重大な a11y 違反がない', async ({ page }) => {
  await gotoBoard(page)
  const v = await seriousViolations(page)
  expect(v, JSON.stringify(v, null, 2)).toEqual([])
})

test('バックログ・パネル（モーダル）に重大な a11y 違反がない', async ({ page }) => {
  await gotoBoard(page)
  await page.getByRole('button', { name: 'バックログ', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const v = await seriousViolations(page)
  expect(v, JSON.stringify(v, null, 2)).toEqual([])
})
