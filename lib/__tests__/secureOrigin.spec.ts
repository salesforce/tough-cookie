import { describe, expect, it } from 'vitest'
import { Cookie } from '../cookie/cookie.js'
import { CookieJar } from '../cookie/cookieJar.js'

// Provenance: https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.7-3.13.1
describe('Secure-cookie setting origin', () => {
  const cookies = [
    'SID=12345; Secure',
    '__Secure-SID=12345; Secure',
    '__Host-SID=12345; Secure; Path=/',
  ]

  for (const prefixSecurity of [
    'silent',
    'strict',
    'unsafe-disabled',
  ] as const) {
    describe(`prefixSecurity: ${prefixSecurity}`, () => {
      it.each(cookies)(
        'rejects %s over remote HTTP without storing it',
        async (cookie) => {
          const jar = new CookieJar(null, { prefixSecurity })
          await expect(
            jar.setCookie(cookie, 'http://example.com/'),
          ).rejects.toThrow(
            'Cookie is Secure but this is not a secure connection',
          )
          expect(await jar.getCookies('https://example.com/')).toEqual([])
        },
      )

      it.each(cookies)(
        'ignoreError drops %s without storing it',
        async (cookie) => {
          const jar = new CookieJar(null, { prefixSecurity })
          expect(
            await jar.setCookie(cookie, 'http://example.com/', {
              ignoreError: true,
            }),
          ).toBeUndefined()
          expect(await jar.getCookies('https://example.com/')).toEqual([])
        },
      )
    })
  }

  it.each([
    'https://example.com/',
    'wss://example.com/',
    'http://localhost/',
    'http://sub.localhost/',
    'http://127.0.0.1/',
    'http://[::1]/',
  ])('stores and retrieves Secure cookies on trustworthy %s', async (url) => {
    for (const cookie of cookies) {
      const jar = new CookieJar(null, { prefixSecurity: 'strict' })
      const stored = await jar.setCookie(cookie, url)
      expect(await jar.getCookies(url)).toEqual([stored])
    }
  })

  it.each([
    'http://localhost/',
    'http://sub.localhost/',
    'http://127.0.0.1/',
    'http://[::1]/',
  ])('allowSecureOnLocal=false rejects %s', async (url) => {
    const jar = new CookieJar(null, { allowSecureOnLocal: false })
    for (const cookie of cookies) {
      await expect(jar.setCookie(cookie, url)).rejects.toThrow(
        'Cookie is Secure but this is not a secure connection',
      )
    }
    expect(await jar.getCookies(url.replace('http:', 'https:'))).toEqual([])
  })

  it('does not overwrite an existing HTTPS cookie from HTTP', async () => {
    const jar = new CookieJar()
    await jar.setCookie('SID=original; Secure', 'https://example.com/')
    await jar.setCookie('SID=attacker; Secure', 'http://example.com/', {
      ignoreError: true,
    })
    expect(await jar.getCookieString('https://example.com/')).toBe(
      'SID=original',
    )
  })

  it('accepts URL and Cookie objects and rejects insecure URL objects', async () => {
    const jar = new CookieJar()
    await expect(
      jar.setCookie(
        new Cookie({ key: 'SID', value: '12345', secure: true }),
        new URL('http://example.com/'),
      ),
    ).rejects.toThrow('Cookie is Secure but this is not a secure connection')
    expect(
      await jar.setCookie('SID=12345; Secure', new URL('https://example.com/')),
    ).toBeDefined()
  })

  it('applies to synchronous and callback APIs', async () => {
    const jar = new CookieJar()
    expect(() =>
      jar.setCookieSync('SID=12345; Secure', 'http://example.com/'),
    ).toThrow('Cookie is Secure but this is not a secure connection')
    expect(
      jar.setCookieSync('SID=12345; Secure', 'http://example.com/', {
        ignoreError: true,
      }),
    ).toBeUndefined()
    await new Promise<void>((resolve, reject) => {
      jar.setCookie(
        'SID=12345; Secure',
        'http://example.com/',
        (error, cookie) => {
          try {
            expect(error?.message).toBe(
              'Cookie is Secure but this is not a secure connection',
            )
            expect(cookie).toBeUndefined()
            resolve()
          } catch (failure) {
            reject(
              failure instanceof Error ? failure : new Error(String(failure)),
            )
          }
        },
      )
    })
    expect(await jar.getCookies('https://example.com/')).toEqual([])
  })

  it('allows ordinary non-Secure cookies over HTTP', async () => {
    const jar = new CookieJar()
    await jar.setCookie('SID=12345', 'http://example.com/')
    expect(await jar.getCookieString('http://example.com/')).toBe('SID=12345')
  })

  describe('enforceSecureOrigin: false', () => {
    for (const prefixSecurity of [
      'silent',
      'strict',
      'unsafe-disabled',
    ] as const) {
      it.each(cookies)(
        `stores %s over remote HTTP with prefixSecurity: ${prefixSecurity}`,
        async (cookie) => {
          const jar = new CookieJar(null, {
            prefixSecurity,
            enforceSecureOrigin: false,
          })
          const stored = await jar.setCookie(cookie, 'http://example.com/')
          expect(await jar.getCookies('https://example.com/')).toEqual([stored])
        },
      )
    }

    it('still withholds Secure cookies on insecure retrieval', async () => {
      const jar = new CookieJar(null, { enforceSecureOrigin: false })
      await jar.setCookie('SID=12345; Secure', 'http://example.com/')
      expect(await jar.getCookies('http://example.com/')).toEqual([])
    })

    it('still applies prefix checks', async () => {
      const jar = new CookieJar(null, {
        prefixSecurity: 'strict',
        enforceSecureOrigin: false,
      })
      await expect(
        jar.setCookie('__Secure-SID=12345', 'http://example.com/'),
      ).rejects.toThrow(
        'Cookie has __Secure prefix but Secure attribute is not set',
      )
    })
  })

  it('does not carry a remote HTTP-set Secure cookie into WSS', async () => {
    const jar = new CookieJar()
    await jar.setCookie('SID=12345; Secure', 'http://example.com/', {
      ignoreError: true,
    })
    expect(await jar.getCookies('wss://example.com/')).toEqual([])
    await jar.setCookie('SID=12345; Secure', 'https://example.com/')
    expect(await jar.getCookieString('wss://example.com/')).toBe('SID=12345')
  })
})
