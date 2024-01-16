import type { Cookie } from '../cookie/cookie'
import { CookieJar } from '../cookie/cookieJar'
import { MemoryCookieStore } from '../memstore'
import { Store } from '../store'
import type { Callback, ErrorCallback } from '../utils'

const url = 'http://example.com/index.html'

describe('store removeAllCookies API', () => {
  describe(`with a store that doesn't implement removeAllCookies`, () => {
    it('should remove cookies one at a time under normal conditions', async () => {
      const store = new StoreWithoutRemoveAll()
      const jar = new CookieJar(store)
      await jar.setCookie('a=b', url)
      await jar.setCookie('c=d', url)
      await jar.removeAllCookies()
      expect(store.stats).toEqual({
        put: 2,
        getAll: 1,
        remove: 2,
      })
    })

    it('should throw an error if one of the removeCookie calls fail', async () => {
      const store = new StoreWithoutRemoveAll()
      const jar = new CookieJar(store)

      await jar.setCookie('a=b', url)
      await jar.setCookie('c=d', url)
      await jar.setCookie('e=f', url)
      await jar.setCookie('g=h', url)

      // replace remove cookie behavior to throw an error on the 4th invocation
      const _removeCookie = store.removeCookie.bind(store)
      const spy = jest.spyOn(store, 'removeCookie')
      spy.mockImplementationOnce((domain, path, key, callback) =>
        _removeCookie.call(store, domain, path, key, callback),
      )
      spy.mockImplementationOnce((domain, path, key, callback) =>
        _removeCookie.call(store, domain, path, key, callback),
      )
      spy.mockImplementationOnce((domain, path, key, callback) =>
        _removeCookie.call(store, domain, path, key, callback),
      )
      spy.mockImplementationOnce((_domain, _path, _key, callback) =>
        callback(new Error('something happened 4')),
      )

      await expect(jar.removeAllCookies()).rejects.toThrow(
        'something happened 4',
      )

      expect(store.stats).toEqual({
        put: 4,
        getAll: 1,
        remove: 3,
      })
    })

    it('should throw an error when several of the removeCookie calls fail', async () => {
      const store = new StoreWithoutRemoveAll()
      const jar = new CookieJar(store)

      await jar.setCookie('a=b', url)
      await jar.setCookie('c=d', url)
      await jar.setCookie('e=f', url)
      await jar.setCookie('g=h', url)

      // replace remove cookie behavior to throw an error on the 4th invocation
      const _removeCookie = store.removeCookie.bind(store)
      const spy = jest.spyOn(store, 'removeCookie')
      spy.mockImplementation((domain, path, key, callback) => {
        if (spy.mock.calls.length % 2 === 1) {
          return callback(
            new Error(`something happened ${spy.mock.calls.length}`),
          )
        }
        return _removeCookie.call(store, domain, path, key, callback)
      })

      await expect(jar.removeAllCookies()).rejects.toThrowError(
        'something happened 1',
      )

      expect(store.stats).toEqual({
        put: 4,
        getAll: 1,
        remove: 2,
      })
    })
  })

  describe('with a store that does implement removeAllCookies', () => {
    it('should remove the cookies using a batch operation', async () => {
      const store = new MemoryStoreExtension()
      const jar = new CookieJar(store)
      await jar.setCookie('a=b', url)
      await jar.setCookie('c=d', url)
      await jar.removeAllCookies()
      expect(store.stats).toEqual({
        getAll: 0,
        remove: 0,
        removeAll: 1,
      })
      expect(store.idx).toEqual({})
    })
  })
})

class StoreWithoutRemoveAll extends Store {
  stats: {
    put: number
    getAll: number
    remove: number
  }

  private cookies: Cookie[]

  constructor() {
    super()
    this.synchronous = true
    this.stats = { put: 0, getAll: 0, remove: 0 }
    this.cookies = []
  }

  override findCookie(
    domain: string,
    path: string,
    key: string,
  ): Promise<Cookie | undefined>
  override findCookie(
    domain: string,
    path: string,
    key: string,
    callback: Callback<Cookie | undefined>,
  ): void
  override findCookie(
    _domain: string,
    _path: string,
    _key: string,
    callback?: Callback<Cookie | undefined>,
  ): unknown {
    if (!callback) {
      throw new Error('This should not be undefined')
    }
    return callback(null, undefined)
  }

  override findCookies(
    domain: string,
    path: string,
    allowSpecialUseDomain?: boolean,
  ): Promise<Cookie[]>
  override findCookies(
    domain: string,
    path: string,
    allowSpecialUseDomain?: boolean,
    callback?: Callback<Cookie[]>,
  ): void
  override findCookies(
    _domain: string,
    _path: string,
    _allowSpecialUseDomain: boolean,
    callback?: Callback<Cookie[]>,
  ): unknown {
    if (!callback) {
      throw new Error('This should not be undefined')
    }
    return callback(null, [])
  }

  override putCookie(cookie: Cookie): Promise<void>
  override putCookie(cookie: Cookie, callback: ErrorCallback): void
  override putCookie(cookie: Cookie, callback?: ErrorCallback): unknown {
    this.stats.put++
    this.cookies.push(cookie)
    if (!callback) {
      throw new Error('This should not be undefined')
    }
    return callback(null)
  }

  override getAllCookies(): Promise<Cookie[]>
  override getAllCookies(callback: Callback<Cookie[]>): void
  override getAllCookies(callback?: Callback<Cookie[]>): unknown {
    this.stats.getAll++
    if (!callback) {
      throw new Error('This should not be undefined')
    }
    return callback(null, this.cookies.slice())
  }

  override removeCookie(
    domain: string,
    path: string,
    key: string,
  ): Promise<void>
  override removeCookie(
    domain: string,
    path: string,
    key: string,
    callback: ErrorCallback,
  ): void
  override removeCookie(
    _domain: string,
    _path: string,
    _key: string,
    callback?: ErrorCallback,
  ): unknown {
    this.stats.remove++
    if (!callback) {
      throw new Error('This should not be undefined')
    }
    return callback(null)
  }
}

class MemoryStoreExtension extends MemoryCookieStore {
  stats: {
    getAll: number
    remove: number
    removeAll: number
  }

  constructor() {
    super()
    this.stats = { getAll: 0, remove: 0, removeAll: 0 }
  }

  override getAllCookies(): Promise<Cookie[]>
  override getAllCookies(callback: Callback<Cookie[]>): void
  override getAllCookies(callback?: Callback<Cookie[]>): unknown {
    this.stats.getAll++
    if (!callback) {
      throw new Error('This should not be undefined')
    }
    return super.getAllCookies(callback)
  }

  override removeCookie(
    domain: string,
    path: string,
    key: string,
  ): Promise<void>
  override removeCookie(
    domain: string,
    path: string,
    key: string,
    callback: ErrorCallback,
  ): void
  override removeCookie(
    domain: string,
    path: string,
    key: string,
    callback?: ErrorCallback,
  ): unknown {
    this.stats.remove++
    if (!callback) {
      throw new Error('This should not be undefined')
    }
    return super.removeCookie(domain, path, key, callback)
  }

  override removeAllCookies(): Promise<void>
  override removeAllCookies(callback: ErrorCallback): void
  override removeAllCookies(callback?: ErrorCallback): unknown {
    this.stats.removeAll++
    if (!callback) {
      throw new Error('This should not be undefined')
    }
    return super.removeAllCookies(callback)
  }
}
