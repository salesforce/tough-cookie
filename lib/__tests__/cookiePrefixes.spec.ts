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
