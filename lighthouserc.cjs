// Lighthouse CI 設定。ビルド済み dist を vite preview（base 準拠）で配信して監査する。
// ベースライン: performance 94 / accessibility 100 / best-practices 100 / seo 100。
// a11y・best-practices は決定的で価値が高いので error（CIを止める）、
// performance・seo は実行環境で揺れるので warn（可視化のみ）にする。
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local',
      startServerReadyTimeout: 30000,
      url: ['http://localhost:4173/fde-agile-quest/'],
      numberOfRuns: 1,
      settings: {
        // CI（root 実行）でも Chrome を起動できるように
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
}
