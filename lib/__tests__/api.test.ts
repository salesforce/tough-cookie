/*!
 * Copyright (c) 2015, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of Salesforce.com nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

import {Cookie, CookieJar, SerializedCookieJar, version} from '../cookie'
import packageJson from '../../package.json'

jest.useFakeTimers()

describe('API', () => {
  it('should define Cookie', () => {
    expect(Cookie).not.toBeUndefined()
  })

  it('should define CookieJar', () => {
    expect(CookieJar).not.toBeUndefined()
  })

  it('should define the version that matches the package metadata', () => {
    expect(version).toBe(packageJson.version)
  })

  describe('Cookie', () => {
    let cookie: Cookie

    describe('constructor', () => {
      beforeEach(() => {
        cookie = new Cookie({
          key: "test",
          value: "b",
          maxAge: 60
        })
      })

      it("should check for key property", () => {
        expect(cookie.key).toEqual('test')
      })

      it('should check for value property', () => {
        expect(cookie.value).toBe("b");
      })

      it("should check for maxAge", () => {
        expect(cookie.maxAge).toBe(60);
      })

      it("should check for default values for unspecified properties", () => {
        expect(cookie.expires).toBe('Infinity')
        expect(cookie.secure).toBe(false)
        expect(cookie.httpOnly).toBe(false)
      })
    })
  })

  describe('CookieJar Promises', () => {
    let cookieJar: CookieJar

    beforeEach(() => {
      cookieJar = new CookieJar()
    })

    describe('setCookie', () => {
      it('should resolve to a Cookie', async () => {
        const cookie = await cookieJar.setCookie("foo=bar", "http://example.com")
        expect(cookie).toBeInstanceOf(Cookie)
        expect(cookie.key).toBe('foo')
        expect(cookie.value).toBe('bar')
      })

      it('supports the "expiry" option', async () => {
        const cookie = await cookieJar.setCookie(
          "near=expiry; Domain=example.com; Path=/; Max-Age=1",
          "http://www.example.com",
          { now: new Date(Date.now() - 1) }
        )
        expect(cookie).toEqual(expect.objectContaining({
          key: 'near',
          value: 'expiry'
        }))
        jest.advanceTimersByTime(1)
        const cookies = await cookieJar.getCookies("http://www.example.com", {
          http: true,
          expire: false
        })
        expect(cookies).toHaveLength(1)
        expect(cookies[0]).toEqual(expect.objectContaining({
          key: 'near',
          value: 'expiry'
        }))
      })

      it('supports the "allPaths" option', async () => {
        const cookiesByUrl = {
          "http://example.com": [
            "nopath_dom=qq; Path=/; Domain=example.com",
            "path_dom=qq; Path=/foo; Domain=example.com"
          ],
          "http://www.example.com": [
            "nopath_host=qq; Path=/",
            "path_host=qq; Path=/foo"
          ],
          "http://other.example.com": [
            "other=qq; Path=/"
          ],
          "http://other.example.com/foo": [
            "other2=qq; Path=/foo"
          ]
        }
        const allCookiesSet = []
        for await (let [url, cookies] of Object.entries(cookiesByUrl)) {
          for await (let cookie of cookies) {
            const setCookie = await cookieJar.setCookie(cookie, url)
            if (setCookie) {
              allCookiesSet.push(setCookie)
            }
          }
        }
        expect(allCookiesSet).toHaveLength(6)

        const cookies = await cookieJar.getCookies("http://www.example.com/")
        expect(cookies).toHaveLength(2)
        expect(cookies.every(cookie => cookie.path === '/')).toBe(true)
        expect(cookies.every(cookie => !/^other/.test(cookie.key))).toBe(true)

        const fooCookies = await cookieJar.getCookies("http://www.example.com/foo")
        expect(fooCookies).toHaveLength(4)
        expect(fooCookies.every(cookie => !/^other/.test(cookie.key))).toBe(true)
      })
    })

    describe('getCookies', () => {
      it('resolves to an array of cookies', async () => {
        await cookieJar.setCookie("foo=bar", "http://example.com")
        const cookies = await cookieJar.getCookies("http://example.com")
        expect(cookies).toEqual([
          expect.objectContaining({
            key: 'foo',
            value: 'bar'
          })
        ])
      })
    })

    describe('getCookieString', () => {
      it('resolves to a string', async () => {
        await cookieJar.setCookie("foo=bar", "http://example.com")
        const cookieString = await cookieJar.getCookieString("http://example.com")
        expect(cookieString).toBe('foo=bar')
      })
    })

    describe('getSetCookieStrings', () => {
      it('resolves to an array of strings', async () => {
        await cookieJar.setCookie("foo=bar", "http://example.com")
        const cookieString = await cookieJar.getSetCookieStrings("http://example.com")
        expect(cookieString).toEqual(['foo=bar; Path=/'])
      })
    })

    describe('removeAllCookies', () => {
      it('resolves to an array of strings', async () => {
        await cookieJar.setCookie("foo=bar", "http://example.com")
        expect(await cookieJar.getCookies("http://example.com")).toHaveLength(1)
        await cookieJar.removeAllCookies()
        expect(await cookieJar.getCookies("http://example.com")).toHaveLength(0)
      })
    })

    describe('serialize', () => {
      it('resolves to an array of strings', async () => {
        const now = new Date().toISOString()

        await cookieJar.setCookie("foo=bar", "http://example.com")
        const data = await cookieJar.serialize()
        const expected: SerializedCookieJar = {
          "allowSpecialUseDomain": false,
          "cookies": [
            {
              "creation": now,
              "domain": "example.com",
              "hostOnly": true,
              "key": "foo",
              "lastAccessed": now,
              "path": "/",
              "pathIsDefault": true,
              "value": "bar"
            }
          ],
          "enableLooseMode": false,
          "prefixSecurity": "silent",
          "rejectPublicSuffixes": true,
          "storeType": "MemoryCookieStore",
          "version": "tough-cookie@4.0.0"
        }
        expect(data).toEqual(expected)
      })
    })
  })
})
