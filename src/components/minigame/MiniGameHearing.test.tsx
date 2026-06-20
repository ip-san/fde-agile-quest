// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

  describe('上限到達演出', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('上限到達後の3つ目タップで aria-live に「すでに2つ選択中」が表示される', () => {
      vi.useFakeTimers()
      const onResolve = vi.fn()
      render(<MiniGameHearing seed={2} onResolve={onResolve} />)
      const options = screen.getAllByRole('button').slice(0, 5)

      fireEvent.click(options[0])
      fireEvent.click(options[1])
      // 上限超過タップ
      fireEvent.click(options[2])

      const status = screen.getByRole('status')
      expect(status.textContent).toContain('すでに2つ選択中')
    })

    it('aria-live メッセージは3秒後に消える', () => {
      vi.useFakeTimers()
      const onResolve = vi.fn()
      render(<MiniGameHearing seed={2} onResolve={onResolve} />)
      const options = screen.getAllByRole('button').slice(0, 5)

      fireEvent.click(options[0])
      fireEvent.click(options[1])
      fireEvent.click(options[2]) // 上限超過 → メッセージ表示

      const status = screen.getByRole('status')
      expect(status.textContent).toContain('すでに2つ選択中')

      // 3秒経過後に消える（act でタイマー起動の state 更新を DOM に反映）
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      expect(status.textContent).toBe('')
    })

    it('3秒以内に再タップするとタイマーがリセットされ、3秒後まで消えない', () => {
      vi.useFakeTimers()
      const onResolve = vi.fn()
      render(<MiniGameHearing seed={2} onResolve={onResolve} />)
      const options = screen.getAllByRole('button').slice(0, 5)

      fireEvent.click(options[0])
      fireEvent.click(options[1])

      // 1回目の上限超過タップ
      fireEvent.click(options[2])
      const status = screen.getByRole('status')
      expect(status.textContent).toContain('すでに2つ選択中')

      // 2秒後に再タップ（タイマー延長）
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      fireEvent.click(options[2])
      expect(status.textContent).toContain('すでに2つ選択中')

      // 再タップ起点の2秒後（合計4秒）はまだ表示中
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(status.textContent).toContain('すでに2つ選択中')

      // 再タップ起点の3秒後（合計5秒）で消える
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(status.textContent).toBe('')
    })
  })
})
