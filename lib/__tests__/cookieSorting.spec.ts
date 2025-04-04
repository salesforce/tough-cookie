import { describe, expect, it } from 'vitest'
import { Cookie } from '../cookie/cookie.js'
import { cookieCompare } from '../cookie/cookieCompare.js'
import { CookieJar } from '../cookie/cookieJar.js'

describe('Cookie sorting', () => {
  describe('assumptions', () => {
    it('should set the creation index during construction', () => {
      const cookie1 = new Cookie()
      const cookie2 = new Cookie()
      expect(typeof cookie1.creationIndex).toBe('number')
      expect(typeof cookie2.creationIndex).toBe('number')
      expect(cookie1.creationIndex).toBeLessThan(cookie2.creationIndex)
    })

    it('should set the creation index during construction when creation time is provided', () => {
      const now = new Date()
      const cookie1 = new Cookie({ creation: now })
      const cookie2 = new Cookie({ creation: now })
      expect(cookie1.creation).toEqual(cookie2.creation)
      expect(typeof cookie1.creationIndex).toBe('number')
      expect(typeof cookie2.creationIndex).toBe('number')
      expect(cookie1.creationIndex).toBeLessThan(cookie2.creationIndex)
    })

    it('should leave the creation index alone during setCookie', async () => {
      const cookieJar = new CookieJar()
      const cookie = new Cookie({ key: 'k', value: 'v', domain: 'example.com' })
      const { creationIndex } = cookie
      await cookieJar.setCookie(cookie, 'http://example.com/')
      expect(cookie.creationIndex).toBe(creationIndex)
    })

    it('should preserve the creation index during update with setCookie', async () => {
      const cookieJar = new CookieJar()
      const cookie = new Cookie({
        key: 'k',
        value: 'v1',
        domain: 'example.com',
      })
      const { creationIndex } = cookie
      await cookieJar.setCookie(cookie, 'http://example.com/')
      expect(cookie.creationIndex).toBe(creationIndex)

      const updatedCookie = new Cookie({
        key: 'k',
        value: 'v2',
        domain: 'example.com',
      })
      await cookieJar.setCookie(updatedCookie, 'http://example.com/')
      expect(cookie.creationIndex).toBe(updatedCookie.creationIndex)
    })
  })

  it('should sort an array of cookies accordingly by path length (desc), creation time (asc), creation index (asc)', () => {
    const cookies = [
      new Cookie({ key: 'a', value: '' }),
      new Cookie({ key: 'b', value: '' }),
      new Cookie({ key: 'c', value: '', path: '/path' }),
      new Cookie({ key: 'd', value: '', path: '/path' }),
      new Cookie({
        key: 'e',
        value: '',
        path: '/longer/path',
        creation: new Date(Date.now() + 1),
      }),
      new Cookie({
        key: 'f',
        value: '',
        path: '/longer/path',
        creation: new Date(Date.now() + 2),
      }),
    ].sort(cookieCompare)
    expect(cookies.map((cookie) => cookie.key)).toEqual([
      'e',
      'f',
      'c',
      'd',
      'a',
      'b',
    ])
  })
})
