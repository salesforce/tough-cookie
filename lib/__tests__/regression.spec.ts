import { describe, expect, it } from 'vitest'
import type { Cookie } from '../cookie/cookie.js'
import { CookieJar } from '../cookie/cookieJar.js'

const url = 'http://www.example.com'

describe('Regression Tests', () => {
  it('should handle trailing semi-colons', async () => {
    const cookieJar = new CookieJar()
    await cookieJar.setCookie('broken_path=testme; path=/;', url)
    await cookieJar.setCookie('b=2; Path=/;;;;', url)
    const cookies = await cookieJar.getCookies(url)
    expect(cookies).toEqual([
      expect.objectContaining({
        key: 'broken_path',
        value: 'testme',
        path: '/',
      }),
      expect.objectContaining({
        key: 'b',
        value: '2',
        path: '/',
      }),
    ])
  })

  it('should not throw exception on malformed URI (GH-32)', async () => {
    const malformedUri = `${url}/?test=100%`
    const cookieJar = new CookieJar()
    await cookieJar.setCookie('Test=Test', malformedUri)
    await expect(cookieJar.getCookieString(malformedUri)).resolves.toBe(
      'Test=Test',
    )
  })

  it('should allow setCookie (without options) callback works even if it is not instanceof Function (GH-158/GH-175)', () => {
    expect.assertions(2)
    const cookieJar = new CookieJar()

    const callback = function (err: null, cookie: Cookie): void {
      expect(err).toBeNull()
      expect(cookie).toEqual(
        expect.objectContaining({
          key: 'a',
          value: 'b',
        }),
      )
    }

    Object.setPrototypeOf(callback, null)
    if (callback instanceof Function) {
      throw new Error('clearing callback prototype chain failed')
    }

    cookieJar.setCookie('a=b', url, callback)
  })

  it('getCookies (without options) callback works even if it is not instanceof Function (GH-175)', async () => {
    expect.assertions(2)
    const cookieJar = new CookieJar()

    const callback = function (err: null, cookie: Cookie): void {
      expect(err).toBeNull()
      expect(cookie).toEqual([
        expect.objectContaining({
          key: 'a',
          value: 'b',
        }),
      ])
    }

    Object.setPrototypeOf(callback, null)
    if (callback instanceof Function) {
      throw new Error('clearing callback prototype chain failed')
    }

    await cookieJar.setCookie('a=b', url)
    cookieJar.getCookies(url, callback)
  })

  it('should allow setCookie with localhost (GH-215)', async () => {
    const cookieJar = new CookieJar()
    await expect(
      cookieJar.setCookie('a=b; Domain=localhost', 'http://localhost'),
    ).resolves.toEqual(
      expect.objectContaining({
        key: 'a',
        value: 'b',
        domain: 'localhost',
      }),
    )
  })

  it('should allow setCookie with localhost and null domain (GH-215)', async () => {
    const cookieJar = new CookieJar()
    await expect(
      cookieJar.setCookie('a=b; Domain=', 'http://localhost'),
    ).resolves.toEqual(
      expect.objectContaining({
        key: 'a',
        value: 'b',
        domain: 'localhost',
      }),
    )
  })

  it('setCookie with localhost (.localhost domain), (GH-215)', async () => {
    const cookieJar = new CookieJar()
    await expect(
      cookieJar.setCookie('a=b; Domain=.localhost', 'http://localhost'),
    ).resolves.toEqual(
      expect.objectContaining({
        key: 'a',
        value: 'b',
        domain: 'localhost',
      }),
    )
  })
})
