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
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-sky-500/40 bg-slate-900/98 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur">
        <span className="flex-1 text-sm text-slate-200">
          {needRefresh
            ? '新しいバージョンがあります。'
            : 'オフラインでも遊べるようになりました。'}
        </span>
        {needRefresh && (
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="shrink-0 rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-sky-400 active:scale-95"
          >
            更新
          </button>
        )}
        <button
          type="button"
          onClick={close}
          aria-label="閉じる"
          className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800"
        >
          {needRefresh ? '後で' : '閉じる'}
        </button>
      </div>
    </div>
  )
}
