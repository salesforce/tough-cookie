import {Callback, Cookie, CookieJar, MemoryCookieStore, Store} from "../cookie";
import spyOn = jest.spyOn;
import SpyInstance = jest.SpyInstance;

const url = "http://example.com/index.html"

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
        remove: 2
      })
    })

    it('should throw an error if one of the removeCookie calls fail', async () => {
      const store = new StoreWithoutRemoveAll()
      const jar = new CookieJar(store)

      await jar.setCookieSync("a=b", url);
      await jar.setCookieSync("c=d", url);
      await jar.setCookieSync("e=f", url);
      await jar.setCookieSync("g=h", url);

      // replace remove cookie behavior to throw an error on the 4th invocation
      const _removeCookie = store.removeCookie
      const spy: SpyInstance<ReturnType<typeof _removeCookie>> = spyOn(store, 'removeCookie')
      spy.mockImplementationOnce((domain, path, key, callback) => _removeCookie.call(store, domain, path, key, callback))
      spy.mockImplementationOnce((domain, path, key, callback) => _removeCookie.call(store, domain, path, key, callback))
      spy.mockImplementationOnce((domain, path, key, callback) => _removeCookie.call(store, domain, path, key, callback))
      spy.mockImplementationOnce((domain, path, key, callback) => callback(new Error('something happened 4')))

      await expect(jar.removeAllCookies())
        .rejects
        .toThrowError('something happened 4')

      expect(store.stats).toEqual({
        put: 4,
        getAll: 1,
        remove: 3
      })
    })

    it('should throw an error when several of the removeCookie calls fail', async () => {
      const store = new StoreWithoutRemoveAll()
      const jar = new CookieJar(store)

      await jar.setCookieSync("a=b", url);
      await jar.setCookieSync("c=d", url);
      await jar.setCookieSync("e=f", url);
      await jar.setCookieSync("g=h", url);

      // replace remove cookie behavior to throw an error on the 4th invocation
      const _removeCookie = store.removeCookie
      const spy: SpyInstance<ReturnType<typeof _removeCookie>> = spyOn(store, 'removeCookie')
      spy.mockImplementation((domain, path, key, callback) => {
        if (spy.mock.calls.length % 2 === 1) {
          return callback(new Error(`something happened ${spy.mock.calls.length}`))
        }
        return _removeCookie.call(store, domain, path, key, callback)
      })

      await expect(jar.removeAllCookies())
        .rejects
        .toThrowError('something happened 1')

      expect(store.stats).toEqual({
        put: 4,
        getAll: 1,
        remove: 2
      })
    })
  })

  describe('with a store that does implement removeAllCookies', () => {
    it("should remove the cookies using a batch operation",  async () => {
      const store = new MemoryStoreExtension()
      const jar = new CookieJar(store)
      await jar.setCookie('a=b', url)
      await jar.setCookie('c=d', url)
      await jar.removeAllCookies()
      expect(store.stats).toEqual({
        getAll: 0,
        remove: 0,
        removeAll: 1
      })
      expect(store.idx).toEqual({})
    })
  })
})

class StoreWithoutRemoveAll extends Store {
  stats: {
    put: number;
    getAll: number;
    remove: number;
  }

  private cookies: Cookie[]

  constructor() {
    super();
    this.synchronous = true;
    this.stats = { put: 0, getAll: 0, remove: 0 };
    this.cookies = [];
  }

  findCookie(domain: string, path: string, key: string): Promise<Cookie>
  findCookie(domain: string, path: string, key: string, callback: Callback<Cookie>): void
  findCookie(domain: string, path: string, key: string, callback?: Callback<Cookie>): unknown {
    return callback(null, null);
  }

  findCookies(domain: string, path: string, allowSpecialUseDomain?: boolean): Promise<Cookie[]>
  findCookies(domain: string, path: string, allowSpecialUseDomain?: boolean, callback?: Callback<Cookie[]>): void
  findCookies(domain: string, path: string, allowSpecialUseDomain: boolean | Callback<Cookie[]> = false, callback?: Callback<Cookie[]>): unknown {
    return callback(null, []);
  }

  putCookie(cookie: Cookie): Promise<void>
  putCookie(cookie: Cookie, callback: Callback<void>): void;
  putCookie(cookie: Cookie, callback?: Callback<void>): unknown {
    this.stats.put++;
    this.cookies.push(cookie);
    return callback(null);
  }

  getAllCookies(): Promise<Cookie[]>
  getAllCookies(callback: Callback<Cookie[]>): void
  getAllCookies(callback?: Callback<Cookie[]>): unknown {
    this.stats.getAll++;
    return callback(null, this.cookies.slice());
  }

  removeCookie(domain: string, path: string, key: string): Promise<void>
  removeCookie(domain: string, path: string, key: string, callback: Callback<void>): void
  removeCookie(domain: string, path: string, key: string, callback?: Callback<void>): unknown {
    this.stats.remove++;
    return callback(null, null);
  }
}

class MemoryStoreExtension extends MemoryCookieStore {
  stats: {
    getAll: number;
    remove: number;
    removeAll: number;
  }

  constructor() {
    super();
    this.stats = { getAll: 0, remove: 0, removeAll: 0 };
  }

  getAllCookies(): Promise<Cookie[]>
  getAllCookies(callback: Callback<Cookie[]>): void
  getAllCookies(callback?: Callback<Cookie[]>): unknown {
    this.stats.getAll++;
    return super.getAllCookies(callback)
  }

  removeCookie(domain: string, path: string, key: string): Promise<void>
  removeCookie(domain: string, path: string, key: string, callback: Callback<void>): void
  removeCookie(domain: string, path: string, key: string, callback?: Callback<void>): unknown {
    this.stats.remove++;
    return super.removeCookie(domain, path, key, callback);
  }

  removeAllCookies(): Promise<void>
  removeAllCookies(callback: Callback<void>): void
  removeAllCookies(callback?: Callback<void>): unknown {
    this.stats.removeAll++;
    return super.removeAllCookies(callback);
  }
}
