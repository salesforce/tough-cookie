import { beforeEach, describe, expect, it } from 'vitest'
import { PrefixSecurityEnum } from '../cookie/constants.js'
import { CookieJar } from '../cookie/cookieJar.js'

let cookieJar: CookieJar
const insecureUrl = 'http://www.example.com'
const secureUrl = 'https://www.example.com'

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

      it('should throw if cookie has Secure attribute but domain is http', async () => {
        await expect(
          cookieJar.setCookie(
            '__Secure-SID=12345; Domain=example.com; Secure',
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
})
