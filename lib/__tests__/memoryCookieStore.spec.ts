import util from 'node:util'
import { Cookie } from '../cookie/cookie'
import { CookieJar } from '../cookie/cookieJar'
import { MemoryCookieStore } from '../memstore'

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

  describe('custom inspect matches util.inspect', () => {
    let memoryStore: MemoryCookieStore
    let cookieJar: CookieJar

    beforeEach(() => {
      memoryStore = new MemoryCookieStore()
      cookieJar = new CookieJar(memoryStore)
    })

    it('for empty store', () => {
      expect(memoryStore.inspect()).toEqual(util.inspect(memoryStore))
    })

    it('for store with single cookie', async () => {
      await cookieJar.setCookie(
        'a=1; Domain=example.com; Path=/',
        'http://example.com/index.html',
      )
      expect(memoryStore.inspect()).toEqual(util.inspect(memoryStore))
    })

    it('for store with multiple cookies', async () => {
      const url = 'http://example.com/index.html'
      await cookieJar.setCookie('a=0; Domain=example.com; Path=/', url)
      await cookieJar.setCookie('b=1; Domain=example.com; Path=/', url)
      await cookieJar.setCookie('c=2; Domain=example.com; Path=/', url)
      await cookieJar.setCookie(
        'd=3; Domain=example.com; Path=/some-path/',
        url,
      )
      await cookieJar.setCookie(
        'e=4; Domain=example.com; Path=/some-path/',
        url,
      )
      await cookieJar.setCookie(
        'f=5; Domain=another.com; Path=/',
        'http://another.com/index.html',
      )
      expect(memoryStore.inspect()).toEqual(util.inspect(memoryStore))
    })
  })
})
