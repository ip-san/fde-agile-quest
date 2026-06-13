// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ExecTier } from '../../types'
import { MiniGameHearing } from './MiniGameHearing'

describe('MiniGameHearing', () => {
  it('2つ選ぶまで確定できず、選ぶと tier を返す', () => {
    const onResolve = vi.fn<(t: ExecTier) => void>()
    render(<MiniGameHearing seed={3} onResolve={onResolve} />)
    const buttons = screen.getAllByRole('button') as HTMLButtonElement[]
    const options = buttons.slice(0, 5) // 5択
    const submit = buttons[buttons.length - 1]

    expect(submit.disabled).toBe(true) // 0個では不可
    fireEvent.click(options[0])
    expect(submit.disabled).toBe(true) // 1個でも不可
    fireEvent.click(options[1])
    expect(submit.disabled).toBe(false) // 2個で確定可
    fireEvent.click(submit)

    expect(onResolve).toHaveBeenCalledTimes(1)
    expect(['great', 'good', 'poor']).toContain(onResolve.mock.calls[0][0])
  })

  it('3つ目は選べない（上限2）', () => {
    const onResolve = vi.fn()
    render(<MiniGameHearing seed={1} onResolve={onResolve} />)
    const options = screen.getAllByRole('button').slice(0, 5)
    fireEvent.click(options[0])
    fireEvent.click(options[1])
    fireEvent.click(options[2]) // 無視されるはず
    expect(options[2].getAttribute('aria-pressed')).toBe('false')
  })
})
