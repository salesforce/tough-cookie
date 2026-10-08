import { beforeEach, describe, expect, it } from 'vitest'
import { Cookie } from '../cookie/cookie.js'
import { CookieJar } from '../cookie/cookieJar.js'

const url = 'http://example.com/index.html'

describe('Same-Site Cookies', function () {
  let cookieJar: CookieJar
  let garbage: Cookie
  let strict: Cookie
  let lax: Cookie
  let normal: Cookie

  const parse = (cookieString: string): Cookie => {
    const result = Cookie.parse(cookieString)
    if (!result) {
      throw new Error('This should not be undefined')
    }
    return result
  }

  beforeEach(() => {
    cookieJar = new CookieJar()
    garbage = parse('garbageIn=treatedAsNone; SameSite=garbage')
    strict = parse('strict=authorized; SameSite=sTrIcT')
    lax = parse('lax=okay; SameSite=lax')
    normal = parse('normal=whatever')
  })

  describe('Retrieval', () => {
    beforeEach(async () => {
      await cookieJar.setCookie('strict=authorized; SameSite=strict', url)
      await cookieJar.setCookie('lax=okay; SameSite=lax', url)
      await cookieJar.setCookie('normal=whatever', url)
    })

    it('should return all cookies when making a "strict" same-site request', async () => {
      const cookies = await cookieJar.getCookies(url, {
        sameSiteContext: 'strict',
      })
      expect(cookies).toEqual([
        expect.objectContaining({
          key: 'strict',
          value: 'authorized',
          sameSite: 'strict',
        }),
        expect.objectContaining({
          key: 'lax',
          value: 'okay',
          sameSite: 'lax',
        }),
        expect.objectContaining({
          key: 'normal',
          value: 'whatever',
        }),
      ])
    })

    it('should return no "strict" cookies when making a "lax" same-site request', async () => {
      const cookies = await cookieJar.getCookies(url, {
        sameSiteContext: 'lax',
      })
      expect(cookies).toEqual([
        expect.objectContaining({
          key: 'lax',
          value: 'okay',
          sameSite: 'lax',
        }),
        expect.objectContaining({
          key: 'normal',
          value: 'whatever',
        }),
      ])
    })

    it('should return only the "none" cookie when making a cross-origin request', async () => {
      const cookies = await cookieJar.getCookies(url, {
        sameSiteContext: 'none',
      })
      expect(cookies).toEqual([
        expect.objectContaining({
          key: 'normal',
          value: 'whatever',
        }),
      ])
    })

    it('should return all cookies when making an unqualified request', async () => {
      const cookies = await cookieJar.getCookies(url, {
        sameSiteContext: undefined,
      })
      expect(cookies).toEqual([
        expect.objectContaining({
          key: 'strict',
          value: 'authorized',
          sameSite: 'strict',
        }),
        expect.objectContaining({
          key: 'lax',
          value: 'okay',
          sameSite: 'lax',
        }),
        expect.objectContaining({
          key: 'normal',
          value: 'whatever',
        }),
      ])
    })
  })

  describe('Setting', () => {
    describe('from same-site context', () => {
      it('should treat the garbage cookie as sameSite=none', async () => {
        await cookieJar.setCookie(garbage, url, { sameSiteContext: 'strict' })
        expect(garbage.sameSite).toBeUndefined()
      })

      it('should treat the strict cookie as sameSite=strict', async () => {
        await cookieJar.setCookie(strict, url, { sameSiteContext: 'strict' })
        expect(strict.sameSite).toBe('strict')
      })

      it('should treat the lax cookie as sameSite=lax', async () => {
        await cookieJar.setCookie(lax, url, { sameSiteContext: 'strict' })
        expect(lax.sameSite).toBe('lax')
      })

      it('should treat the normal cookie as sameSite=none', async () => {
        await cookieJar.setCookie(normal, url, { sameSiteContext: 'strict' })
        expect(normal.sameSite).toBeUndefined()
      })
    })

    describe('from a cross-origin context', () => {
      it('should treat the garbage cookie as sameSite=none', async () => {
        await cookieJar.setCookie(garbage, url, { sameSiteContext: 'none' })
        expect(garbage.sameSite).toBeUndefined()
      })

      it('should not allow strict cookie to be set', async () => {
        await expect(
          cookieJar.setCookie(strict, url, { sameSiteContext: 'none' }),
        ).rejects.toThrow(
          'Cookie is SameSite but this is a cross-origin request',
        )
      })

      it('should not allow lax cookie to be set', async () => {
        await expect(
          cookieJar.setCookie(lax, url, { sameSiteContext: 'none' }),
        ).rejects.toThrow(
          'Cookie is SameSite but this is a cross-origin request',
        )
      })

      it('should treat the normal cookie as sameSite=none', async () => {
        await cookieJar.setCookie(normal, url, { sameSiteContext: 'none' })
        expect(normal.sameSite).toBeUndefined()
      })
    })

    describe('from an undefined context', () => {
      it('should treat the garbage cookie as sameSite=none', async () => {
        await cookieJar.setCookie(garbage, url)
        expect(garbage.sameSite).toBeUndefined()
      })

      it('should treat the strict cookie as sameSite=strict', async () => {
        await cookieJar.setCookie(strict, url)
        expect(strict.sameSite).toBe('strict')
      })

      it('should treat the lax cookie as sameSite=lax', async () => {
        await cookieJar.setCookie(lax, url)
        expect(lax.sameSite).toBe('lax')
      })

      it('should treat the normal cookie as sameSite=none', async () => {
        await cookieJar.setCookie(normal, url)
        expect(normal.sameSite).toBeUndefined()
      })
    })
  })

  describe('Canonicalized Strings', () => {
    it('garbage in = garbage out', () => {
      // @ts-expect-error deliberately test invalid input from JavaScript callers
      garbage.sameSite = 'GaRbAGe'
      expect(garbage.toString()).toBe(
        'garbageIn=treatedAsNone; SameSite=GaRbAGe',
      )
    })

    it('turn strict to "Strict"', () => {
      expect(strict.toString()).toBe('strict=authorized; SameSite=Strict')
    })

    it('turn lax to "Lax"', () => {
      expect(lax.toString()).toBe('lax=okay; SameSite=Lax')
    })

    it('preserves explicit SameSite=None when parsing and serializing', () => {
      const cookie = parse('cross=allowed; Secure; SameSite=nOnE')
      const serialized = cookie.toString()
      expect(serialized).toBe('cross=allowed; Secure; SameSite=None')
      expect(parse(serialized).sameSite).toBe('none')
    })

    it.each(['none', 'None', 'NONE', 'nOnE'])(
      'canonicalizes an explicitly constructed SameSite=%s cookie',
      (sameSite) => {
        const cookie = new Cookie({
          key: 'cross',
          value: 'allowed',
          secure: true,
          sameSite,
        })
        expect(cookie.toString()).toBe('cross=allowed; Secure; SameSite=None')
      },
    )

    it('preserves explicit SameSite=None in CookieJar Set-Cookie headers', async () => {
      const secureUrl = 'https://example.com/'
      await cookieJar.setCookie(
        'cross=allowed; Path=/; Secure; SameSite=None',
        secureUrl,
      )
      expect(await cookieJar.getSetCookieStrings(secureUrl)).toEqual([
        'cross=allowed; Path=/; Secure; SameSite=None',
      ])
    })

    it('omit if same-site was not specified', () => {
      expect(normal.toString()).toBe('normal=whatever')
    })
  })
})
