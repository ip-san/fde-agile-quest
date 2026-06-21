import { useRegisterSW } from 'virtual:pwa-register/react'

/** PWA の更新通知バナー。新しいバージョンが配信されると下部に「更新」ボタンを出す。
 *  registerType:'prompt' と組で動く（自動適用せず、押下で skipWaiting → リロード）。 */
export function PwaUpdater() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--card)]/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur">
        <span className="flex-1 text-sm text-[var(--text-body)]">
          {needRefresh ? '新しいバージョンがあります。' : 'オフラインでも遊べるようになりました。'}
        </span>
        {needRefresh && (
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-bold text-[var(--bg)] transition hover:bg-[var(--accent-hover)] active:scale-95"
          >
            更新
          </button>
        )}
        <button
          type="button"
          onClick={close}
          aria-label="閉じる"
          className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm text-[var(--text-sub)] transition hover:bg-[var(--panel)]"
        >
          {needRefresh ? '後で' : '閉じる'}
        </button>
      </div>
    </div>
  )
}
