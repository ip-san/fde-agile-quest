// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ExecTier } from '../../types'
import { MiniGameDevPuzzle } from './MiniGameDevPuzzle'

const isTile = (el: HTMLElement) => !/戻す|あと|組み上げる/.test(el.textContent ?? '')

describe('MiniGameDevPuzzle', () => {
  it('全タイルを置くまで確定できず、置き切ると tier を返す', () => {
    const onResolve = vi.fn<(t: ExecTier) => void>()
    render(<MiniGameDevPuzzle seed={2} onResolve={onResolve} />)

    // 未配置タイルを順に置く（毎回 DOM が変わるので都度取得）
    for (let i = 0; i < 4; i++) {
      const tiles = (screen.getAllByRole('button') as HTMLButtonElement[]).filter(isTile)
      expect(tiles.length).toBeGreaterThan(0)
      fireEvent.click(tiles[0])
    }

    const submit = screen.getByText(/組み上げる/) as HTMLButtonElement
    expect(submit.disabled).toBe(false)
    fireEvent.click(submit)

    expect(onResolve).toHaveBeenCalledTimes(1)
    expect(['great', 'good', 'poor']).toContain(onResolve.mock.calls[0][0])
  })
})
