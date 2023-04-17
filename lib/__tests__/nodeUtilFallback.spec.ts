import { getCustomInspectSymbol, getUtilInspect } from "../utilHelper";
import util from "util";
import { Cookie, CookieJar, MemoryCookieStore } from "../cookie";
import { inspectFallback } from "../memstore";

jest.useFakeTimers()

describe('Node util module fallback for non-node environments', () => {
  describe('getCustomInspectSymbol', () => {
    it('should not be null in a node environment', () => {
      expect(getCustomInspectSymbol()).toEqual(
        Symbol.for('nodejs.util.inspect.custom') || util.inspect.custom,
      )
    })

    it('should not be null in a node environment when custom inspect symbol cannot be retrieved (< node v10.12.0', () => {
      expect(
        getCustomInspectSymbol({
          lookupCustomInspectSymbol: () => null,
        }),
      ).toEqual(Symbol.for('nodejs.util.inspect.custom') || util.inspect.custom)
    })

    it('should be null in a non-node environment since `util` features cannot be relied on', () => {
      expect(
        getCustomInspectSymbol({
          lookupCustomInspectSymbol: () => null,
          requireUtil: () => null,
        }),
      ).toBeNull()
    })
  })

  describe('getUtilInspect', () => {
    it('should use util.inspect in a node environment', () => {
      const inspect = getUtilInspect(() => 'fallback')
      expect(inspect('util.inspect')).toEqual(util.inspect('util.inspect'))
    })

    it('should use fallback inspect function in a non-node environment', () => {
      const inspect = getUtilInspect(() => 'fallback', {
        requireUtil: () => null,
      })
      expect(inspect('util.inspect')).toEqual('fallback')
    })
  })

  describe('util usage in Cookie', () => {
    it('custom inspect for Cookie still works', () => {
      const cookie = Cookie.parse('a=1; Domain=example.com; Path=/')
      if (!cookie) {
        throw new Error("This should not be undefined")
      }
      expect(cookie.inspect()).toEqual(util.inspect(cookie))
    })
  })

  describe('util usage in MemoryCookie', () => {
    let memoryStore: MemoryCookieStore

    beforeEach(() => {
      memoryStore = new MemoryCookieStore()
    })

    describe('when store is empty', () => {
      it('custom inspect for MemoryCookie still works', () => {
        expect(memoryStore.inspect()).toEqual(util.inspect(memoryStore))
      })

      it('fallback produces equivalent output to custom inspect', () => {
        expect(util.inspect(memoryStore.idx)).toEqual(
          inspectFallback(memoryStore.idx),
        )
      })
    })

    describe('when store has a single cookie', () => {
      beforeEach(async () => {
        const cookieJar = new CookieJar(memoryStore)
        await cookieJar.setCookie(
          'a=1; Domain=example.com; Path=/',
          'http://example.com/index.html',
        )
      })

      it('custom inspect for MemoryCookie still works', () => {
        expect(memoryStore.inspect()).toEqual(util.inspect(memoryStore))
      })

      it('fallback produces equivalent output to custom inspect', () => {
        expect(util.inspect(memoryStore.idx)).toEqual(
          inspectFallback(memoryStore.idx),
        )
      })
    })

    describe('when store has multiple cookies', () => {
      beforeEach(async () => {
        const cookieJar = new CookieJar(memoryStore)
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
      })

      it('custom inspect for MemoryCookie still works', () => {
        expect(memoryStore.inspect()).toEqual(util.inspect(memoryStore))
      })

      it('fallback produces equivalent output to custom inspect', () => {
        expect(util.inspect(memoryStore.idx)).toEqual(
          inspectFallback(memoryStore.idx),
        )
      })
    })
  })
})
