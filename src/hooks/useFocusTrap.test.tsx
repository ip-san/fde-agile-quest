// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFocusTrap } from './useFocusTrap'

function Dialog({
  initialFocusLast = false,
  onEscape,
}: {
  initialFocusLast?: boolean
  onEscape?: () => void
}) {
  const ref = useFocusTrap<HTMLDivElement>(onEscape)
  return (
    <div ref={ref} role="dialog" aria-modal="true">
      <button type="button">first</button>
      <button type="button" {...(initialFocusLast ? { 'data-initial-focus': true } : {})}>
        last
      </button>
    </div>
  )
}

describe('useFocusTrap', () => {
  it('autoFocus 要素が無ければダイアログ本体にフォーカスする', () => {
    render(<Dialog />)
    expect(document.activeElement).toBe(screen.getByRole('dialog'))
  })

  it('data-initial-focus 要素があればそれを優先フォーカスする（Enter が native に効く前提）', () => {
    render(<Dialog initialFocusLast />)
    expect(document.activeElement).toBe(screen.getByText('last'))
  })

  it('ダイアログ本体から Shift+Tab で最後の要素へラップし、背後に抜けない', () => {
    render(<Dialog />)
    const dialog = screen.getByRole('dialog')
    expect(document.activeElement).toBe(dialog) // 初期は本体（リスト外）
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByText('last'))
  })

  it('ダイアログ本体から Tab で最初の要素へ入る', () => {
    render(<Dialog />)
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByText('first'))
  })

  it('最後の要素から Tab で最初へ、最初から Shift+Tab で最後へラップする', () => {
    render(<Dialog />)
    const first = screen.getByText('first')
    const last = screen.getByText('last')
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('用語ツールチップが開いている間は Esc で onEscape を発火しない（チップを閉じる Esc を奪わない）', () => {
    const onEscape = vi.fn()
    render(<Dialog onEscape={onEscape} />)
    const dialog = screen.getByRole('dialog')
    // ツールチップが開いている状態を再現（RichText は portal で role=tooltip を body に出す）
    const tip = document.createElement('span')
    tip.setAttribute('role', 'tooltip')
    document.body.appendChild(tip)
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onEscape).not.toHaveBeenCalled()
    // チップが閉じた後は Esc が通る
    tip.remove()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('ダイアログ外（backdrop 余白）の mousedown は preventDefault され、フォーカスが body へ落ちない', () => {
    render(
      <div data-testid="backdrop">
        <Dialog />
      </div>,
    )
    const backdrop = screen.getByTestId('backdrop')
    // 外側 mousedown はキャンセルされる（＝既定のフォーカス移動が起きない）
    const prevented = !fireEvent.mouseDown(backdrop)
    expect(prevented).toBe(true)
    // ダイアログ内の mousedown はキャンセルされない（通常操作を妨げない）
    const insidePrevented = !fireEvent.mouseDown(screen.getByText('first'))
    expect(insidePrevented).toBe(false)
  })
})
