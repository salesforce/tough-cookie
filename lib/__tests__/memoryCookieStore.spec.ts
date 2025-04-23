import { describe, expect, it } from 'vitest'
import { Cookie } from '../cookie/cookie.js'
import { MemoryCookieStore } from '../memstore.js'

describe('MemoryCookieStore', () => {
  it('should have no static methods', () => {
    expect(Object.keys(MemoryCookieStore)).toEqual([])
  })

  it('should have instance methods that return promises', () => {
    const memoryCookieStore = new MemoryCookieStore()
    expect(
      memoryCookieStore.findCookie('example.com', '/', 'key'),
    ).toBeInstanceOf(Promise)
    expect(memoryCookieStore.findCookies('example.com', '/')).toBeInstanceOf(
      Promise,
    )
    expect(memoryCookieStore.putCookie(new Cookie())).toBeInstanceOf(Promise)
    expect(
      memoryCookieStore.updateCookie(new Cookie(), new Cookie()),
    ).toBeInstanceOf(Promise)
    expect(
      memoryCookieStore.removeCookie('example.com', '/', 'key'),
    ).toBeInstanceOf(Promise)
    expect(memoryCookieStore.removeCookies('example.com', '/')).toBeInstanceOf(
      Promise,
    )
    expect(memoryCookieStore.removeAllCookies()).toBeInstanceOf(Promise)
    expect(memoryCookieStore.getAllCookies()).toBeInstanceOf(Promise)
  })
})
