import { afterEach, describe, expect, it } from 'vitest'
import {
  NAMES,
  displayName,
  localizeDeep,
  localizeNames,
  nameWithReading,
} from './names'

// NAMES は可変 export。テストで name を差し替えたら必ず元へ戻す。
const ORIGINAL = Object.fromEntries(
  Object.entries(NAMES).map(([k, v]) => [k, { ...v }]),
) as typeof NAMES

afterEach(() => {
  for (const [k, v] of Object.entries(ORIGINAL)) {
    Object.assign(NAMES[k as keyof typeof NAMES], v)
  }
})

describe('localizeNames — 既定（リネーム無し）は恒等', () => {
  it('name===canonical のとき本文はそのまま返る', () => {
    expect(localizeNames('カルゴ物流の倉庫で結城係長と話す')).toBe('カルゴ物流の倉庫で結城係長と話す')
  })
  it('displayName / nameWithReading は登録値を返す', () => {
    expect(displayName('cargo')).toBe('カルゴ物流')
    expect(displayName('yuki')).toBe('結城')
    expect(nameWithReading('yuki')).toBe('結城（ゆうき）')
    expect(nameWithReading('lumen')).toBe('ルーメン') // reading 無しは name のみ
  })
})

describe('localizeNames — リネームすると本文が追従する', () => {
  it('人名 name を変えると地の文の綴りが置換される', () => {
    NAMES.yuki.name = '神楽'
    expect(localizeNames('結城係長は前例がないと渋る')).toBe('神楽係長は前例がないと渋る')
    expect(displayName('yuki')).toBe('神楽')
  })

  it('社名は長い綴り優先で置換（「カルゴ物流」を「カルゴ」より先に消す）', () => {
    NAMES.cargo.name = '青葉ロジ'
    // also: ['カルゴ'] も同じ表示名へ。長い「カルゴ物流」が先に置換され二重化しない
    expect(localizeNames('カルゴ物流に常駐。カルゴの倉庫へ')).toBe('青葉ロジに常駐。青葉ロジの倉庫へ')
  })

  it('複数のリネームが同時に効く', () => {
    NAMES.lumen.name = 'ルクス'
    NAMES.takano.name = '高城'
    expect(localizeNames('ルーメンの鷹野が指名した')).toBe('ルクスの高城が指名した')
  })
})

describe('localizeDeep — 入れ子データの全文字列に適用', () => {
  it('リネーム無しなら同一参照を返す（ゼロコスト短絡）', () => {
    const data = { a: 'カルゴ物流', list: ['結城', { b: 'ルーメン' }] }
    expect(localizeDeep(data)).toBe(data)
  })

  it('リネーム時はネストした文字列を置換し、関数や非文字列は保持する', () => {
    NAMES.cargo.name = '青葉ロジ'
    const fn = () => 1
    const out = localizeDeep({
      title: 'カルゴ物流の現場',
      n: 3,
      fn,
      nested: [{ desc: 'カルゴ物流の棚' }],
    })
    expect(out.title).toBe('青葉ロジの現場')
    expect(out.nested[0].desc).toBe('青葉ロジの棚')
    expect(out.n).toBe(3)
    expect(out.fn).toBe(fn) // 関数は素通し
  })
})
