import { beforeEach, describe, expect, expectTypeOf, it } from 'vitest'
import {
  PrefixSecurityEnum,
  type PrefixSecurityMode,
} from '../cookie/constants.js'
import { CookieJar } from '../cookie/cookieJar.js'

let cookieJar: CookieJar
const insecureUrl = 'http://www.example.com'
const secureUrl = 'https://www.example.com'

/* eslint vitest/no-standalone-expect: [error, {additionalTestBlockFunctions: [beforeEach]}]*/

describe('When `prefixSecurity` is enabled for `CookieJar`', () => {
  describe('silent', () => {
    beforeEach(() => {
      cookieJar = new CookieJar(null, {
        prefixSecurity: 'silent',
      })
      expect(cookieJar.prefixSecurity).toBe(PrefixSecurityEnum.SILENT)
    })

    describe('__Secure prefix', () => {
      it('should fail silently with no Secure attribute', async () => {
        await cookieJar.setCookie(
          '__Secure-SID=12345; Domain=example.com',
          insecureUrl,
          {},
        )
        const cookies = await cookieJar.getCookies(insecureUrl)
        expect(cookies).toEqual([])
      })

      it('should work if cookie has Secure attribute and domain is https', async () => {
        await cookieJar.setCookie(
          '__Secure-SID=12345; Domain=example.com; Secure',
          secureUrl,
          {},
        )
        const cookies = await cookieJar.getCookies(secureUrl)
        expect(cookies).toEqual([
          expect.objectContaining({
            key: '__Secure-SID',
            value: '12345',
          }),
        ])
      })

      it('should reject a valid __Secure- cookie set over an insecure origin', async () => {
        await expect(
          cookieJar.setCookie(
            '__Secure-SID=12345; Secure; Domain=example.com',
            insecureUrl,
            {},
          ),
        ).rejects.toThrow(
          'Cookie is Secure but this is not a secure connection',
        )
      })
    })

    describe('__Host prefix', () => {
      it('should fail silently when no Secure attribute, Domain, or Path', async () => {
        await cookieJar.setCookie('__Host-SID=12345', insecureUrl, {})
        const cookies = await cookieJar.getCookies(insecureUrl)
        expect(cookies).toEqual([])
      })

      it('should fail silently when no Domain or Path', async () => {
        await cookieJar.setCookie('__Host-SID=12345; Secure', secureUrl, {})
        const cookies = await cookieJar.getCookies(insecureUrl)
        expect(cookies).toEqual([])
      })

      it('should fail silently when no Path', async () => {
        await cookieJar.setCookie(
          '__Host-SID=12345; Secure; Domain=example.com',
          secureUrl,
          {},
        )
        const cookies = await cookieJar.getCookies(secureUrl)
        expect(cookies).toEqual([])
      })

      it('should fail silently with Domain', async () => {
        await cookieJar.setCookie(
          '__Host-SID=12345; Secure; Domain=example.com; Path=/',
          secureUrl,
          {},
        )
        const cookies = await cookieJar.getCookies(secureUrl)
        expect(cookies).toEqual([])
      })

      it('should work with Secure and Path but no Domain over https', async () => {
        await cookieJar.setCookie(
          '__Host-SID=12345; Secure; Path=/',
          secureUrl,
          {},
        )
        const cookies = await cookieJar.getCookies(secureUrl)
        expect(cookies).toEqual([
          expect.objectContaining({
            key: '__Host-SID',
            value: '12345',
          }),
        ])
      })

      it('should reject a valid __Host- cookie set over an insecure origin', async () => {
        await expect(
          cookieJar.setCookie(
            '__Host-SID=12345; Secure; Path=/',
            insecureUrl,
            {},
          ),
        ).rejects.toThrow(
          'Cookie is Secure but this is not a secure connection',
        )
      })
    })
  })

  describe('strict', () => {
    beforeEach(() => {
      cookieJar = new CookieJar(null, {
        prefixSecurity: 'strict',
      })
      expect(cookieJar.prefixSecurity).toBe(PrefixSecurityEnum.STRICT)
    })

    describe('__Secure prefix', () => {
      it('should work for a valid cookie', async () => {
        await cookieJar.setCookie(
          '__Secure-SID=12345; Secure; Domain=example.com',
          secureUrl,
          {},
        )
        const cookies = await cookieJar.getCookies(secureUrl)
        expect(cookies).toEqual([
          expect.objectContaining({
            key: '__Secure-SID',
            value: '12345',
          }),
        ])
      })

      it('should error for an invalid cookie', async () => {
        await expect(
          cookieJar.setCookie(
            '__Secure-SID=12345; Domain=example.com',
            insecureUrl,
            {},
          ),
        ).rejects.toThrow(
          'Cookie has __Secure prefix but Secure attribute is not set',
        )
      })

      it('should reject a valid __Secure- cookie set over an insecure origin', async () => {
        await expect(
          cookieJar.setCookie(
            '__Secure-SID=12345; Secure; Domain=example.com',
            insecureUrl,
            {},
          ),
        ).rejects.toThrow(
          'Cookie is Secure but this is not a secure connection',
        )
      })
    })

    describe('__Host prefix', () => {
      it('should work for a valid cookie', async () => {
        await cookieJar.setCookie(
          '___Host-SID=12345; Secure; Path=/',
          secureUrl,
          {},
        )
        const cookies = await cookieJar.getCookies(secureUrl)
        expect(cookies).toEqual([
          expect.objectContaining({
            key: '___Host-SID',
            value: '12345',
          }),
        ])
      })

      it('should error for an invalid cookie', async () => {
        await expect(
          cookieJar.setCookie(
            '__Host-SID=12345; Secure; Domain=example.com',
            secureUrl,
            {},
          ),
        ).rejects.toThrow(
          `Cookie has __Host prefix but either Secure or HostOnly attribute is not set or Path is not '/'`,
        )
      })

      it('should error when there is no explicit Path attribute', async () => {
        await expect(
          cookieJar.setCookie('__Host-SID=12345; Secure', secureUrl, {}),
        ).rejects.toThrow(
          `Cookie has __Host prefix but either Secure or HostOnly attribute is not set or Path is not '/'`,
        )
      })

      it('should work with an explicit Path of /', async () => {
        await cookieJar.setCookie(
          '__Host-SID=12345; Secure; Path=/',
          secureUrl,
          {},
        )
        const cookies = await cookieJar.getCookies(secureUrl)
        expect(cookies).toEqual([
          expect.objectContaining({
            key: '__Host-SID',
            value: '12345',
          }),
        ])
      })

      it('should reject a valid __Host- cookie set over an insecure origin', async () => {
        await expect(
          cookieJar.setCookie(
            '__Host-SID=12345; Secure; Path=/',
            insecureUrl,
            {},
          ),
        ).rejects.toThrow(
          'Cookie is Secure but this is not a secure connection',
        )
      })
    })

    describe('non-prefixed Secure cookie', () => {
      it('should reject a plain Secure cookie set over an insecure origin', async () => {
        await expect(
          cookieJar.setCookie('SID=12345; Secure', insecureUrl, {}),
        ).rejects.toThrow(
          'Cookie is Secure but this is not a secure connection',
        )
      })
    })
  })

  describe('disabled', () => {
    beforeEach(() => {
      cookieJar = new CookieJar(null, {
        prefixSecurity: 'unsafe-disabled',
      })
      expect(cookieJar.prefixSecurity).toBe(PrefixSecurityEnum.DISABLED)
    })

    describe('__Secure prefix', () => {
      it('does not fail', async () => {
        await cookieJar.setCookie(
          '__Secure-SID=12345; Domain=example.com',
          insecureUrl,
          {},
        )
        const cookies = await cookieJar.getCookies(insecureUrl)
        expect(cookies).toEqual([
          expect.objectContaining({
            key: '__Secure-SID',
            value: '12345',
          }),
        ])
      })
    })

    describe('__Host prefix', () => {
      it('does not fail', async () => {
        await cookieJar.setCookie(
          '__Host-SID=12345; Domain=example.com',
          insecureUrl,
          {},
        )
        const cookies = await cookieJar.getCookies(insecureUrl)
        expect(cookies).toEqual([
          expect.objectContaining({
            key: '__Host-SID',
            value: '12345',
          }),
        ])
      })
    })

    describe('non-prefixed Secure cookie', () => {
      it('still rejects a Secure cookie set over an insecure origin', async () => {
        // unsafe-disabled bypasses the prefix-attribute checks only; the
        // origin check runs before the prefixSecurity block and is gated
        // solely on `ignoreError`, so it still applies here.
        await expect(
          cookieJar.setCookie('SID=12345; Secure', insecureUrl, {}),
        ).rejects.toThrow(
          'Cookie is Secure but this is not a secure connection',
        )
      })
    })
  })

  describe('prefixed cookie over http://localhost', () => {
    const localhostUrl = 'http://localhost/'

    it('is stored when allowSecureOnLocal is true (default)', async () => {
      const jar = new CookieJar(null, {
        prefixSecurity: 'strict',
        allowSecureOnLocal: true,
      })
      await jar.setCookie('__Secure-SID=12345; Secure', localhostUrl, {})
      const cookies = await jar.getCookies(localhostUrl)
      expect(cookies).toEqual([
        expect.objectContaining({ key: '__Secure-SID', value: '12345' }),
      ])
    })

    it('is rejected when allowSecureOnLocal is false', async () => {
      const jar = new CookieJar(null, {
        prefixSecurity: 'strict',
        allowSecureOnLocal: false,
      })
      await expect(
        jar.setCookie('__Secure-SID=12345; Secure', localhostUrl, {}),
      ).rejects.toThrow('Cookie is Secure but this is not a secure connection')
    })

    it('rejects a __Host- cookie when allowSecureOnLocal is false', async () => {
      const jar = new CookieJar(null, {
        prefixSecurity: 'strict',
        allowSecureOnLocal: false,
      })
      await expect(
        jar.setCookie('__Host-SID=12345; Secure; Path=/', localhostUrl, {}),
      ).rejects.toThrow('Cookie is Secure but this is not a secure connection')
    })

    it('is silenced by ignoreError, not by silent mode', async () => {
      const jar = new CookieJar(null, {
        prefixSecurity: 'silent',
        allowSecureOnLocal: false,
      })
      // The S5.7 step-13 origin check gates on ignoreError, not prefixSecurity mode.
      await jar.setCookie('__Secure-SID=12345; Secure', localhostUrl, {
        ignoreError: true,
      })
      const cookies = await jar.getCookies(localhostUrl)
      expect(cookies).toEqual([])
    })
  })

  describe('prefix matching is case-insensitive', () => {
    describe.each(['__Secure-', '__SECURE-', '__secure-', '__sEcUrE-'])(
      '%s',
      (prefix) => {
        it('is rejected in strict mode without the Secure attribute', async () => {
          const jar = new CookieJar(null, { prefixSecurity: 'strict' })
          await expect(
            jar.setCookie(`${prefix}SID=12345`, insecureUrl, {}),
          ).rejects.toThrow(
            'Cookie has __Secure prefix but Secure attribute is not set',
          )
        })

        it('is silently dropped in silent mode without the Secure attribute', async () => {
          const jar = new CookieJar(null, { prefixSecurity: 'silent' })
          await jar.setCookie(`${prefix}SID=12345`, insecureUrl, {})
          expect(await jar.getCookies(secureUrl)).toEqual([])
        })

        it('is stored with the Secure attribute over https', async () => {
          const jar = new CookieJar(null, { prefixSecurity: 'strict' })
          await jar.setCookie(`${prefix}SID=12345; Secure`, secureUrl, {})
          expect(await jar.getCookies(secureUrl)).toEqual([
            expect.objectContaining({ key: `${prefix}SID`, value: '12345' }),
          ])
        })
      },
    )

    describe.each(['__Host-', '__HOST-', '__host-', '__hOsT-'])(
      '%s',
      (prefix) => {
        it('is rejected in strict mode with a Domain attribute', async () => {
          const jar = new CookieJar(null, { prefixSecurity: 'strict' })
          await expect(
            jar.setCookie(
              `${prefix}SID=12345; Secure; Path=/; Domain=example.com`,
              secureUrl,
              {},
            ),
          ).rejects.toThrow(
            `Cookie has __Host prefix but either Secure or HostOnly attribute is not set or Path is not '/'`,
          )
        })

        it('is silently dropped in silent mode with a Domain attribute', async () => {
          const jar = new CookieJar(null, { prefixSecurity: 'silent' })
          await jar.setCookie(
            `${prefix}SID=12345; Secure; Path=/; Domain=example.com`,
            secureUrl,
            {},
          )
          expect(await jar.getCookies(secureUrl)).toEqual([])
        })

        it('is silently dropped in silent mode when set over http', async () => {
          const jar = new CookieJar(null, { prefixSecurity: 'silent' })
          await jar.setCookie(
            `${prefix}SID=12345; Domain=example.com`,
            'http://example.com/',
            {},
          )
          expect(await jar.getCookies('https://example.com/')).toEqual([])
        })

        it('is stored with Secure, Path=/ and no Domain over https', async () => {
          const jar = new CookieJar(null, { prefixSecurity: 'strict' })
          await jar.setCookie(
            `${prefix}SID=12345; Secure; Path=/`,
            secureUrl,
            {},
          )
          expect(await jar.getCookies(secureUrl)).toEqual([
            expect.objectContaining({ key: `${prefix}SID`, value: '12345' }),
          ])
        })
      },
    )

    it('drops mixed-case prefixed cookies set over http with the default mode', async () => {
      const jar = new CookieJar()
      await jar.setCookie('__SECURE-a=1', 'http://example.com/')
      await jar.setCookie(
        '__host-b=2; Domain=example.com',
        'http://example.com/',
      )
      expect(await jar.getCookieString('https://example.com/')).toBe('')
      expect(await jar.getCookieString('https://www.example.com/')).toBe('')
    })

    it('does not enforce mixed-case prefixes when unsafe-disabled', async () => {
      const jar = new CookieJar(null, { prefixSecurity: 'unsafe-disabled' })
      await jar.setCookie('__SECURE-a=1', 'http://example.com/')
      await jar.setCookie(
        '__host-b=2; Domain=example.com',
        'http://example.com/',
      )
      expect(await jar.getCookieString('http://example.com/')).toBe(
        '__SECURE-a=1; __host-b=2',
      )
    })
  })

  describe('PrefixSecurityMode type and configuration', () => {
    it('types CookieJar.prefixSecurity as PrefixSecurityMode', () => {
      const jar = new CookieJar()
      expect(jar.prefixSecurity).toBe('silent')
      expectTypeOf(jar.prefixSecurity).toEqualTypeOf<string>()
      expectTypeOf<PrefixSecurityMode>().toEqualTypeOf<
        'silent' | 'strict' | 'unsafe-disabled'
      >()
    })

    it('defaults to silent mode when option is omitted', () => {
      const jar = new CookieJar()
      expect(jar.prefixSecurity).toBe('silent')
    })

    it('normalizes valid PrefixSecurityMode options case-insensitively', () => {
      const strictJar = new CookieJar(null, { prefixSecurity: 'strict' })
      expect(strictJar.prefixSecurity).toBe('strict')

      const disabledJar = new CookieJar(null, {
        prefixSecurity: 'unsafe-disabled',
      })
      expect(disabledJar.prefixSecurity).toBe('unsafe-disabled')
    })

    it('falls back to silent mode for unrecognized string values', () => {
      const jar = new CookieJar(null, {
        prefixSecurity: 'unknown-mode' as PrefixSecurityMode,
      })
      expect(jar.prefixSecurity).toBe('silent')
    })
  })
})
