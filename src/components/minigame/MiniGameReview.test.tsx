// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ExecTier } from '../../types'
import { MiniGameReview } from './MiniGameReview'

describe('MiniGameReview', () => {
  it('LGTM（0件）でも出せ、答え合わせ→確定で tier を返す', () => {
    const onResolve = vi.fn<(t: ExecTier) => void>()
    render(<MiniGameReview seed={2} onResolve={onResolve} />)

    // 0件でも「出す」ボタンは押せる（AIを素通しできる＝あえてワナを許す）
    fireEvent.click(screen.getByRole('button', { name: /出す/ }))
    expect(onResolve).not.toHaveBeenCalled() // まず答え合わせを見せる

    // 確定で初めて解決
    fireEvent.click(screen.getByRole('button', { name: /確定/ }))
    expect(onResolve).toHaveBeenCalledTimes(1)
    expect(['great', 'good', 'poor']).toContain(onResolve.mock.calls[0][0])
  })

  it('指摘を選んでから出せる（複数選択でき、確定前は解決しない）', () => {
    const onResolve = vi.fn()
    render(<MiniGameReview seed={1} onResolve={onResolve} />)

    // 点検項目（5択）を2つ選ぶ
    const options = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') !== null)
    expect(options).toHaveLength(5)
    fireEvent.click(options[0])
    fireEvent.click(options[1])
    expect(options[0].getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: /レビューを出す/ }))
    expect(onResolve).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /確定/ }))
    expect(onResolve).toHaveBeenCalledTimes(1)
  })
})
