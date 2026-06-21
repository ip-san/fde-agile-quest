// localStorage に boolean を '1'/'0' で永続化する小ヘルパー。
// private モード/SSR など localStorage に触れない環境でも例外を握り潰す（読めなければ false 扱い）。
export function readBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeBool(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? '1' : '0')
  } catch {
    /* noop */
  }
}
