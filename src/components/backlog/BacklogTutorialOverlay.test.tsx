// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BacklogTutorialOverlay } from './BacklogTutorialOverlay'

const STORAGE_KEY = 'backlog-tutorial-seen'

/** jsdom の localStorage は node --localstorage-file が必要なため vi.stubGlobal でモックする */
function makeLocalStorageMock() {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn<(key: string) => string | null>((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(store)) delete store[k]
    }),
  }
}

let localStorageMock: ReturnType<typeof makeLocalStorageMock>

describe('BacklogTutorialOverlay', () => {
  beforeEach(() => {
    localStorageMock = makeLocalStorageMock()
    vi.stubGlobal('localStorage', localStorageMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('未表示時（localStorage に値なし）はオーバーレイが表示される', () => {
    render(<BacklogTutorialOverlay />)
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText('上が優先度高め')).toBeDefined()
    expect(screen.getByText('前のスプリントが終わらなくても選べます')).toBeDefined()
  })

  it('localStorage に "1" がある場合はオーバーレイが表示されない', () => {
    localStorageMock.getItem.mockImplementation((key: string) => (key === STORAGE_KEY ? '1' : null))
    render(<BacklogTutorialOverlay />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('「わかった」ボタンで閉じると localStorage に "1" が保存される', () => {
    render(<BacklogTutorialOverlay />)
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, '1')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('オーバーレイ背景クリックで閉じる', () => {
    render(<BacklogTutorialOverlay />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, '1')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Escape キーで閉じる', () => {
    render(<BacklogTutorialOverlay />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, '1')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('role="dialog" aria-modal="true" aria-label が設定されている', () => {
    render(<BacklogTutorialOverlay />)
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('プロダクトバックログ操作ガイド')
  })
})
