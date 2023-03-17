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

import {Cookie, CookieJar, MemoryCookieStore, ParameterError, SerializedCookieJar} from '../cookie'

const { objectContaining, assertions } = expect
jest.useFakeTimers()

describe('CookieJar', () => {
  let cookieJar: CookieJar

  beforeEach(() => {
    cookieJar = new CookieJar()
  })

  describe('setCookie', () => {
    let cookie: Cookie

    apiVariants('should resolve to a Cookie', {
      callbackStyle (done) {
        cookieJar.setCookie("foo=bar", "http://example.com", (_error, result) => {
          if (result == null) {
            throw new Error('should not be null')
          }
          cookie = result
          done()
        })
      },
      async asyncStyle () {
        cookie = await cookieJar.setCookie("foo=bar", "http://example.com")
      },
      syncStyle () {
        // @ts-ignore
        cookie = cookieJar.setCookieSync("foo=bar", "http://example.com")
      }
    }, async () => {
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
      expect(cookie).toEqual(objectContaining({
        key: 'near',
        value: 'expiry'
      }))
      jest.advanceTimersByTime(1)
      const cookies = await cookieJar.getCookies("http://www.example.com", {
        http: true,
        expire: false
      })
      expect(cookies).toHaveLength(1)
      expect(cookies[0]).toEqual(objectContaining({
        key: 'near',
        value: 'expiry'
      }))
    })

    describe('the "loose" option', () => {
      it('should allow keyless cookie to be accepted when loose: true', async () => {
        const cookie = await cookieJar.setCookie("=b", "http://example.com/index.html", {
          loose: true
        })
        expect(cookie).toEqual(objectContaining({
          key: '',
          value: 'b'
        }))
      })

      it('should not allow keyless cookie to be accepted when loose: false', async () => {
        assertions(1)
        await expect(cookieJar.setCookie("=b", "http://example.com/index.html", {
          loose: false
        })).rejects.toThrowError('Cookie failed to parse')
      })

      it('should not default to loose: true when using map', () => {
        const cookies = [
          "=a;domain=example.com",
          "=b;domain=example.com",
          "c=d;domain=example.com"
        ].map(Cookie.parse);
        expect(cookies).toEqual([
          undefined,
          undefined,
          objectContaining({
            key: 'c',
            value: 'd'
          })
        ])
      })
    })

    it('should set a timestamp when storing a cookie', async () => {
      // @ts-ignore
      cookie = Cookie.parse("a=b; Domain=example.com; Path=/")
      const t0 = new Date()

      expect(cookie).toEqual(objectContaining({
        hostOnly: null,
        creation: t0,
        lastAccessed: null
      }))

      jest.advanceTimersByTime(10000)
      const t1 = new Date()
      cookie = await cookieJar.setCookie(cookie, "http://example.com/index.html")

      expect(cookie).toEqual(objectContaining({
        hostOnly: false,
        creation: t1,
        lastAccessed: t1
      }))
      expect(cookie.TTL()).toBe(Infinity)
      expect(cookie.isPersistent()).toBe(false)
    })

    it('should be able to set a no-path cookie', async () => {
      cookie = await cookieJar.setCookie("a=b; Domain=example.com", "http://example.com/index.html")
      expect(cookie).toEqual(objectContaining({
        domain: 'example.com',
        path: '/',
        pathIsDefault: true
      }))
    })

    it('should be able to set a cookie already marked as host-only', async () => {
      cookie = await cookieJar.setCookie(
        createCookie("a=b; Domain=example.com", {
          hostOnly: true
        }),
        "http://example.com/index.html"
      )
      expect(cookie).toEqual(objectContaining({
        domain: 'example.com',
        hostOnly: true
      }))
    })

    it('should be able to set a session cookie', async () => {
      cookie = createCookie("a=b")
      expect(cookie.path).toBeNull()
      cookie = await cookieJar.setCookie(cookie, "http://www.example.com/dir/index.html")
      expect(cookie).toEqual(objectContaining({
        domain: 'www.example.com',
        path: '/dir',
        hostOnly: true
      }))
    })

    it('should fail when the cookie domain does not match the provided domain', async () => {
      assertions(1)
      await expect(cookieJar.setCookie(
        "a=b; Domain=fooxample.com; Path=/",
        "http://example.com/index.html"
      )).rejects.toThrowError("Cookie not in this host's domain. Cookie:fooxample.com Request:example.com")
    })

    it('should fail when the cookie has a sub-domain but the provided domain is the root', async () => {
      assertions(1)
      await expect(cookieJar.setCookie(
        "a=b; Domain=www.example.com; Path=/",
        "http://example.com/index.html"
      )).rejects.toThrowError("Cookie not in this host's domain. Cookie:www.example.com Request:example.com")
    })

    it('should allow for a cookie with a root domain to be stored under a super-domain', async () => {
      cookie = await cookieJar.setCookie(
        "a=b; Domain=example.com; Path=/",
        "http://www.app.example.com/index.html"
      )
      expect(cookie.domain).toBe('example.com')
    })

    it('should allow a sub-path cookie on a super-domain', async () => {
      cookie = await cookieJar.setCookie(
        "a=b; Domain=example.com; Path=/subpath",
        "http://www.example.com/index.html"
      )
      expect(cookie).toEqual(objectContaining({
        domain: 'example.com',
        path: '/subpath',
        pathIsDefault: null
      }))
    })

    it('should fail when using an httpOnly cookie when using a non-HTTP API', async () => {
      assertions(1)
      await expect(cookieJar.setCookie(
        "a=b; Domain=example.com; Path=/; HttpOnly",
        "http://example.com/index.html",
        { http: false }
      )).rejects.toThrowError("Cookie is HttpOnly and this isn't an HTTP API")
    })

    it('should not fail when using an httpOnly cookie when using a non-HTTP API', async () => {
      assertions(1)
      await cookieJar.setCookie(
        "OptionsTest=FooBar; expires=Wed, 13-Jan-2051 22:23:01 GMT; path=/TestPath; HttpOnly",
        "https://127.0.0.1/TestPath/somewhere",
      )
      const cookies = await cookieJar.getCookies("https://127.0.0.1/TestPath/somewhere")
      expect(cookies).not.toHaveLength(0)
    })

    it('should not fail when using an httpOnly cookie when using a non-HTTP API (setCookieSync)', () => {
      assertions(1)
      cookieJar.setCookieSync(
        "OptionsTest=FooBar; expires=Wed, 13-Jan-2051 22:23:01 GMT; path=/TestPath; HttpOnly",
        "https://127.0.0.1/TestPath/somewhere",
      )
      const cookies = cookieJar.getCookiesSync("https://127.0.0.1/TestPath/somewhere")
      expect(cookies).not.toHaveLength(0)
    })

    it.each([
      { testCase: 'basic', IPv6: '[::1]' },
      { testCase: 'prefix', IPv6: '[::ffff:127.0.0.1]' },
      { testCase: 'classic', IPv6: '[2001:4860:4860::8888]' },
      { testCase: 'short', IPv6: '[2600::]' }
    ])('should store a $testCase IPv6', async (test) => {
      cookie = await cookieJar.setCookie(
        `a=b; Domain=${test.IPv6}; Path=/`,
        `http://${test.IPv6}/`
      )
      expect(cookie).toEqual(objectContaining({
        creation: new Date(),
        lastAccessed: new Date(),
      }))
      expect(cookie.TTL()).toBe(Infinity)
      expect(cookie.isPersistent()).toBe(false)
    })
  })

  describe('getCookies', () => {
    describe('api', () => {
      let cookies: Cookie[] | undefined

      beforeEach(async () => {
        await cookieJar.setCookie("foo=bar", "http://example.com")
      })

      apiVariants('resolves to an array of cookies', {
        callbackStyle(done) {
          cookieJar.getCookies("http://example.com", (_error, result) => {
            cookies = result
            done()
          })
        },
        async asyncStyle() {
          cookies = await cookieJar.getCookies("http://example.com")
        },
        syncStyle() {
          cookies = cookieJar.getCookiesSync("http://example.com")
        }
      }, async () => {
        expect(cookies).toEqual([
          objectContaining({
            key: 'foo',
            value: 'bar'
          })
        ])
      })
    })

    describe('the "allPaths" option',  () => {
      beforeEach(async () => {
        await cookieJar.removeAllCookies()
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
        for await (let [url, cookies] of Object.entries(cookiesByUrl)) {
          for await (let cookie of cookies) {
            await cookieJar.setCookie(cookie, url)
          }
        }
      })

      it('should set all the cookies', async () => {
        const { cookies } = await cookieJar.serialize()
        expect(cookies).toHaveLength(6)
      })

      it('should scope cookies by path as the default behavior', async () => {
        const cookies = await cookieJar.getCookies("http://www.example.com/")
        expect(cookies).toHaveLength(2)

        const allHaveRootPath = cookies.every(cookie => cookie.path === '/')
        expect(allHaveRootPath).toBe(true)

        // @ts-ignore
        const noCookiesWithAnOtherKeyRetrieved = cookies.every(cookie => !/^other/.test(cookie.key))
        expect(noCookiesWithAnOtherKeyRetrieved).toBe(true)
      })

      it('should scope cookies by path when reading from the /foo path', async () => {
        const cookies = await cookieJar.getCookies("http://www.example.com/foo")
        expect(cookies).toHaveLength(4)

        // @ts-ignore
        const noCookiesWithAnOtherKeyRetrieved = cookies.every(cookie => !/^other/.test(cookie.key))
        expect(noCookiesWithAnOtherKeyRetrieved).toBe(true)
      })

      it('should not scope cookies by path when using allPaths: true', async () => {
        const cookies = await cookieJar.getCookies("http://www.example.com/", {
          allPaths: true
        })
        expect(cookies).toHaveLength(4)

        // @ts-ignore
        const noCookiesWithAnOtherKeyRetrieved = cookies.every(cookie => !/^other/.test(cookie.key))
        expect(noCookiesWithAnOtherKeyRetrieved).toBe(true)
      })
    })

    describe('retrieving cookies', () => {
      beforeEach(async () => {
        const url = "http://example.com/index.html"

        const cookies = await Promise.all([
          cookieJar.setCookie("a=1; Domain=example.com; Path=/", url, at(0)),
          cookieJar.setCookie("b=2; Domain=example.com; Path=/; HttpOnly", url, at(1000)),
          cookieJar.setCookie("c=3; Domain=example.com; Path=/; Secure", url, at(2000)),
          // path
          cookieJar.setCookie("d=4; Domain=example.com; Path=/foo", url, at(3000)),
          // host only
          cookieJar.setCookie("e=5", url, at(4000)),
          // other domain
          cookieJar.setCookie("f=6; Domain=nodejs.org; Path=/", "http://nodejs.org", at(5000)),
          // expired
          cookieJar.setCookie("g=7; Domain=example.com; Path=/; Expires=Tue, 18 Oct 2011 00:00:00 GMT", url, at(6000)),
          // expired via Max-Age
          cookieJar.setCookie("h=8; Domain=example.com; Path=/; Max-Age=1", url),
        ])

        jest.advanceTimersByTime(2000) // so that 'h=8' expires

        expect(cookies).toHaveLength(8)
      })

      it('should be able to get the cookies for http://nodejs.org', async () => {
        const cookies = await cookieJar.getCookies("http://nodejs.org")
        expect(cookies).toEqual([
          objectContaining({
            key: 'f',
            value: '6',
            path: '/',
            domain: 'nodejs.org'
          })
        ])
      })

      it('should be able to get the cookies for https://example.com', async () => {
        const cookies = await cookieJar.getCookies("https://example.com")
        expect(cookies).toEqual([
          objectContaining({
            key: 'a',
            value: '1',
            path: '/',
            domain: 'example.com'
          }),
          objectContaining({
            key: 'b',
            value: '2',
            path: '/',
            domain: 'example.com',
            httpOnly: true
          }),
          objectContaining({
            key: 'c',
            value: '3',
            path: '/',
            domain: 'example.com',
            secure: true
          }),
          objectContaining({
            key: 'e',
            value: '5',
            path: '/',
            domain: 'example.com'
          })
        ])
      })

      it('should be able to get the cookies for https://example.com with the secure: true option', async () => {
        const cookies = await cookieJar.getCookies("https://example.com", {
          secure: true
        })
        expect(cookies).toEqual([
          objectContaining({
            key: 'a',
            value: '1',
            path: '/',
            domain: 'example.com'
          }),
          objectContaining({
            key: 'b',
            value: '2',
            path: '/',
            domain: 'example.com',
            httpOnly: true
          }),
          objectContaining({
            key: 'c',
            value: '3',
            path: '/',
            domain: 'example.com',
            secure: true
          }),
          objectContaining({
            key: 'e',
            value: '5',
            path: '/',
            domain: 'example.com'
          })
        ])
      })

      it('should be able to get the cookies for http://example.com', async () => {
        const cookies = await cookieJar.getCookies("http://example.com")
        expect(cookies).toEqual([
          objectContaining({
            key: 'a',
            value: '1',
            path: '/',
            domain: 'example.com'
          }),
          objectContaining({
            key: 'b',
            value: '2',
            path: '/',
            domain: 'example.com',
            httpOnly: true
          }),
          objectContaining({
            key: 'e',
            value: '5',
            path: '/',
            domain: 'example.com'
          })
        ])
      })

      it('should be able to get the cookies for http://EXAMPlE.com (case-insensitive)', async () => {
        const cookies = await cookieJar.getCookies("http://EXAMPlE.com")
        expect(cookies).toEqual([
          objectContaining({
            key: 'a',
            value: '1',
            path: '/',
            domain: 'example.com'
          }),
          objectContaining({
            key: 'b',
            value: '2',
            path: '/',
            domain: 'example.com',
            httpOnly: true
          }),
          objectContaining({
            key: 'e',
            value: '5',
            path: '/',
            domain: 'example.com'
          })
        ])
      })

      it('should be able to get the cookies for http://example.com with the http: false option', async () => {
        const cookies = await cookieJar.getCookies("http://example.com", {
          http: false
        })
        expect(cookies).toEqual([
          objectContaining({
            key: 'a',
            value: '1',
            path: '/',
            domain: 'example.com'
          }),
          objectContaining({
            key: 'e',
            value: '5',
            path: '/',
            domain: 'example.com'
          })
        ])
      })

      it('should be able to get the cookies for http://example.com/foo/bar', async () => {
        const cookies = await cookieJar.getCookies("http://example.com/foo/bar")
        expect(cookies).toEqual([
          objectContaining({
            key: 'd',
            value: '4',
            path: '/foo',
            domain: 'example.com'
          }),
          objectContaining({
            key: 'a',
            value: '1',
            path: '/',
            domain: 'example.com'
          }),
          objectContaining({
            key: 'b',
            value: '2',
            path: '/',
            domain: 'example.com',
            httpOnly: true
          }),
          objectContaining({
            key: 'e',
            value: '5',
            path: '/',
            domain: 'example.com'
          })
        ])
      })

      it('should be able to get the cookies for http://www.example.com/foo/bar', async () => {
        const cookies = await cookieJar.getCookies("http://www.example.com/foo/bar")
        expect(cookies).toEqual([
          objectContaining({
            key: 'd',
            value: '4',
            path: '/foo',
            domain: 'example.com'
          }),
          objectContaining({
            key: 'a',
            value: '1',
            path: '/',
            domain: 'example.com'
          }),
          objectContaining({
            key: 'b',
            value: '2',
            path: '/',
            domain: 'example.com',
            httpOnly: true
          })
        ])
      })
    })
  })

  describe('getCookieString', () => {
    let cookieString: string

    describe('api', () => {
      beforeEach(async () => {
        await cookieJar.setCookie("foo=bar", "http://example.com")
      })

      apiVariants('resolves to a string', {
        callbackStyle(done) {
          cookieJar.getCookieString("http://example.com", (_err, result) => {
            cookieString = result
            done()
          })
        },
        async asyncStyle() {
          cookieString = await cookieJar.getCookieString("http://example.com")
        },
        syncStyle() {
          cookieString = cookieJar.getCookieStringSync("http://example.com")
        }
      }, async () => {
        expect(cookieString).toBe('foo=bar')
      })
    })

    describe('retrieving cookie strings', () => {
      beforeEach(async () => {
        const url = "http://example.com/index.html"
        // @ts-ignore
        const at = (timeFromNow) => ({now: new Date(Date.now() + timeFromNow)})

        const cookies = await Promise.all([
          cookieJar.setCookie("a=1; Domain=example.com; Path=/", url, at(0)),
          cookieJar.setCookie("b=2; Domain=example.com; Path=/; HttpOnly", url, at(1000)),
          cookieJar.setCookie("c=3; Domain=example.com; Path=/; Secure", url, at(2000)),
          // path
          cookieJar.setCookie("d=4; Domain=example.com; Path=/foo", url, at(3000)),
          // host only
          cookieJar.setCookie("e=5", url, at(4000)),
          // other domain
          cookieJar.setCookie("f=6; Domain=nodejs.org; Path=/", "http://nodejs.org", at(5000)),
          // expired
          cookieJar.setCookie("g=7; Domain=example.com; Path=/; Expires=Tue, 18 Oct 2011 00:00:00 GMT", url, at(6000)),
          // expired via Max-Age
          cookieJar.setCookie("h=8; Domain=example.com; Path=/; Max-Age=1", url),
        ])

        jest.advanceTimersByTime(2000) // so that 'h=8' expires

        expect(cookies).toHaveLength(8)
      })

      it('be able to get the cookie string for http://example.com', async () => {
        cookieString = await cookieJar.getCookieString("http://example.com")
        expect(cookieString).toBe("a=1; b=2; e=5")
      })

      it('be able to get the cookie string for http://example.com', async () => {
        cookieString = await cookieJar.getCookieString("http://example.com")
        expect(cookieString).toBe("a=1; b=2; e=5")
      })
    })
  })

  describe('getSetCookieStrings', () => {
    let cookieHeaders: string[]

    describe('api', () => {
      beforeEach(async () => {
        await cookieJar.setCookie("foo=bar", "http://example.com")
      })

      apiVariants('resolves to an array of strings', {
        callbackStyle(done) {
          cookieJar.getSetCookieStrings("http://example.com", (_error, result) => {
            // @ts-ignore
            cookieHeaders = result
            done()
          })
        },
        async asyncStyle() {
          cookieHeaders = await cookieJar.getSetCookieStrings("http://example.com")
        },
        syncStyle() {
          cookieHeaders = cookieJar.getSetCookieStringsSync("http://example.com")
        }
      }, async () => {
        expect(cookieHeaders).toEqual(['foo=bar; Path=/'])
      })
    })

    describe('retrieving cookie strings', () => {
      beforeEach(async () => {
        const url = "http://example.com/index.html"
        // @ts-ignore
        const at = (timeFromNow) => ({now: new Date(Date.now() + timeFromNow)})

        const cookies = await Promise.all([
          cookieJar.setCookie("a=1; Domain=example.com; Path=/", url, at(0)),
          cookieJar.setCookie("b=2; Domain=example.com; Path=/; HttpOnly", url, at(1000)),
          cookieJar.setCookie("c=3; Domain=example.com; Path=/; Secure", url, at(2000)),
          // path
          cookieJar.setCookie("d=4; Domain=example.com; Path=/foo", url, at(3000)),
          // host only
          cookieJar.setCookie("e=5", url, at(4000)),
          // other domain
          cookieJar.setCookie("f=6; Domain=nodejs.org; Path=/", "http://nodejs.org", at(5000)),
          // expired
          cookieJar.setCookie("g=7; Domain=example.com; Path=/; Expires=Tue, 18 Oct 2011 00:00:00 GMT", url, at(6000)),
          // expired via Max-Age
          cookieJar.setCookie("h=8; Domain=example.com; Path=/; Max-Age=1", url),
        ])

        jest.advanceTimersByTime(2000) // so that 'h=8' expires

        expect(cookies).toHaveLength(8)
      })

      it('be able to get the set-cookie header strings for http://example.com', async () => {
        cookieHeaders = await cookieJar.getSetCookieStrings("http://example.com")
        expect(cookieHeaders).toEqual([
          "a=1; Domain=example.com; Path=/",
          "b=2; Domain=example.com; Path=/; HttpOnly",
          "e=5; Path=/"
        ])
      })
    })
  })

  describe('removeAllCookies', () => {
    beforeEach(async () => {
      await cookieJar.setCookie("a=b", "http://example.com")
      await cookieJar.setCookie("c=d", "http://example.com")
      expect(await cookieJar.getCookies("http://example.com")).toHaveLength(2)
    })

    apiVariants('should remove all the stored cookies', {
      callbackStyle(done) {
        cookieJar.removeAllCookies(() => done())
      },
      async asyncStyle() {
        await cookieJar.removeAllCookies()
      },
      syncStyle() {
        cookieJar.removeAllCookiesSync()
      }
    }, async () => {
      expect(await cookieJar.getCookies("http://example.com")).toHaveLength(0)
    })
  })

  describe('serialize', () => {
    let data: SerializedCookieJar
    let now: string

    beforeEach(async () => {
      now = new Date().toISOString()
      await cookieJar.setCookie("foo=bar", "http://example.com")
    })

    apiVariants('resolves to an array of strings', {
      callbackStyle(done) {
        cookieJar.serialize((_error, result) => {
          // @ts-ignore
          data = result
          done()
        })
      },
      async asyncStyle() {
        data = await cookieJar.serialize()
      },
      syncStyle() {
        // @ts-ignore
        data = cookieJar.serializeSync()
      }
    }, async () => {
      const expected: SerializedCookieJar = {
        "allowSpecialUseDomain": true,
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
        "version": "tough-cookie@4.1.2"
      }
      expect(data).toEqual(expected)
    })
  })

  describe('remove cookies', () => {
    beforeEach(async () => {
      const cookiesByDomain = {
        "http://example.com/index.html": [
          Cookie.parse("a=b; Domain=example.com; Path=/")
        ],
        "http://foo.com/index.html": [
          Cookie.parse("a=b; Domain=foo.com; Path=/"),
          Cookie.parse("foo=bar; Domain=foo.com; Path=/")
        ]
      }
      for await (let [path, cookies] of Object.entries(cookiesByDomain)) {
        for await (let cookie of cookies) {
          // @ts-ignore
          await cookieJar.setCookie(cookie, path)
        }
      }
    })

    it('should remove all from matching domain', async () => {
      // @ts-ignore
      await cookieJar.store.removeCookies("example.com", null)

      const exampleCookies = await cookieJar.store.findCookies("example.com", null)
      expect(exampleCookies).toHaveLength(0)

      const fooCookies = await cookieJar.store.findCookies("foo.com", null)
      expect(fooCookies).toHaveLength(2)
    })

    it('should remove all with matching domain and key', async () => {
      await cookieJar.store.removeCookie("foo.com", "/", "foo")
      const cookies = await cookieJar.store.findCookies("foo.com", null)
      expect(cookies).toEqual([
        objectContaining({
          key: 'a'
        })
      ])
    })
  })
})

it('should allow cookies with the same name under different domains and/or paths', async () => {
  const cookieJar = new CookieJar()
  const url = "http://www.example.com/"
  await Promise.all([
    cookieJar.setCookie("aaaa=xxxx", url, at(0)),
    cookieJar.setCookie("aaaa=1111; Domain=www.example.com", url, at(1000)),
    cookieJar.setCookie("aaaa=2222; Domain=example.com", url, at(2000)),
    cookieJar.setCookie("aaaa=3333; Domain=www.example.com; Path=/pathA", url, at(3000)),
  ])
  const cookies = await cookieJar.getCookies("http://www.example.com/pathA")
  expect(cookies).toEqual([
    objectContaining({value: '3333'}),
    objectContaining({value: '1111'}),
    objectContaining({value: '2222'}),
  ])
})

describe('setCookie errors', () => {
  it('should throw an error if domain is set to a public suffix', async () => {
    const cookieJar = new CookieJar()
    await expect(cookieJar.setCookie(
      "i=9; Domain=kyoto.jp; Path=/",
      "kyoto.jp"
    )).rejects.toThrowError("Cookie has domain set to a public suffix")
  })

  it('should throw an error if domains do not match', async () => {
    const cookieJar = new CookieJar()
    await expect(cookieJar.setCookie(
      "j=10; Domain=google.com; Path=/",
      "http://google.ca"
    )).rejects.toThrowError(`Cookie not in this host's domain. Cookie:google.com Request:google.ca`)
  })

  it('should throw an error if trying to overwrite an http cookie with a non-http one', async () => {
    const cookieJar = new CookieJar()
    const httpCookie = await cookieJar.setCookie(
      "k=11; Domain=example.ca; Path=/; HttpOnly",
      "http://example.ca",
      { http: true }
    )
    await expect(cookieJar.setCookie(
      "k=12; Domain=example.ca; Path=/",
      "http://example.ca",
      { http: false }
    )).rejects.toThrowError("old Cookie is HttpOnly and this isn't an HTTP API")

    const cookies = await cookieJar.getCookies("http://example.ca", { http: true })
    expect(cookies).toEqual([httpCookie])
  })
})

describe('loose mode', () => {
  it('should accept a cookie in loose mode', async () => {
    const cookieJar = new CookieJar(null, { looseMode: true })
    await cookieJar.setCookie(
      "FooBar",
      "http://www.foonet.net"
    )
    const cookies = await cookieJar.getCookies("http://www.foonet.net")
    expect(cookies).toEqual([
      objectContaining({
        key: "",
        value: "FooBar"
      })
    ])
  })

  it('should retain loose mode when cloning cookie store with loose mode enabled', async () => {
    const cookieJar = new CookieJar(null, { looseMode: true })
    // @ts-ignore
    const clonedCookieJar = CookieJar.fromJSON(cookieJar.toJSON())
    await clonedCookieJar.setCookie(
      "FooBar",
      "http://www.foonet.net"
    )
    const cookies = await clonedCookieJar.getCookies("http://www.foonet.net")
    expect(cookies).toEqual([
      objectContaining({
        key: "",
        value: "FooBar"
      })
    ])
  })
})

it('should fix issue #132', async () => {
  const cookieJar = new CookieJar()
  await expect(cookieJar.setCookie(
    // @ts-ignore
    { key: "x", value: "y" },
    "http://example.com/"
  )).rejects.toThrowError("First argument to setCookie must be a Cookie object or string")
})

it('should fix issue #144', async () => {
  const cookieJar = new CookieJar()
  const cookieString = `AWSELB=69b2c0038b16e8e27056d1178e0d556c;
          Path=/, jses_WS41=5f8dc2f6-ea37-49de-8dfa-b58336c2d9ce; path=/;
          Secure; HttpOnly, AuthToken=EFKFFFCH@K@GHIHEJCJMMGJM>CDHDEK>CFGK?MHJ
          >>JI@B??@CAEHBJH@H@A@GCFDLIMLJEEJEIFGALA?BIM?@G@DEDI@JE?I?HKJBIDDHJMEFEFM
          >G@J?I??B@C>>LAH?GCGJ@FMEGHBGAF; expires=Sun, 31-Jan-9021 02:39:04 GMT;
          path=/; Secure; HttpOnly, FirstReferrer=; expires=Fri, 31-Jan-9020 20:50:44
          GMT; path=/`
  await cookieJar.setCookie(cookieString, "https://google.com")
  const cookies = await cookieJar.getCookies("https://google.com")
  expect(cookies).toEqual([
    objectContaining({
      secure: true
    })
  ])
})

it('should fix issue #145', async () => {
  assertions(1)
  const cookieJar = new CookieJar()
  try {
    // @ts-ignore
    await cookieJar.setCookie("x=y; Domain=example.com; Path=/")
  } catch(e) {
    expect(e).toBeInstanceOf(ParameterError)
  }
})

it('should fix issue #197', async () => {
  const cookieJar = new CookieJar()
  await expect(cookieJar.setCookie(
    "",
    "https://google.com"
  )).rejects.toThrowError('Cookie failed to parse')
})

// special use domains under a sub-domain
describe.each([
  "local",
  "example",
  "invalid",
  "localhost",
  "test"
])('when special use domain is dev.%s', (specialUseDomain) => {
  it('should allow special domain cookies if allowSpecialUseDomain is set to the default value', async () => {
    const cookieJar = new CookieJar()
    const cookie = await cookieJar.setCookie(
      `settingThisShouldPass=true; Domain=dev.${specialUseDomain}; Path=/;`,
      `http://dev.${specialUseDomain}`
    )
    expect(cookie).toEqual(objectContaining({
      key: 'settingThisShouldPass',
      value: 'true',
      domain: `dev.${specialUseDomain}`
    }))
    const cookies = await cookieJar.getCookies(`http://dev.${specialUseDomain}`, {
      http: true
    })
    expect(cookies).toEqual([cookie])
  })

  it('should allow special domain cookies if allowSpecialUseDomain: true', async () => {
    const cookieJar = new CookieJar(new MemoryCookieStore(), {
      rejectPublicSuffixes: true,
      allowSpecialUseDomain: true
    })
    const cookie = await cookieJar.setCookie(
      `settingThisShouldPass=true; Domain=dev.${specialUseDomain}; Path=/;`,
      `http://dev.${specialUseDomain}`
    )
    expect(cookie).toEqual(objectContaining({
      key: 'settingThisShouldPass',
      value: 'true',
      domain: `dev.${specialUseDomain}`
    }))
    const cookies = await cookieJar.getCookies(`http://dev.${specialUseDomain}`, {
      http: true
    })
    expect(cookies).toEqual([cookie])
  })

  it('should reject special domain cookies if allowSpecialUseDomain: false', async () => {
    assertions(1)
    const cookieJar = new CookieJar(new MemoryCookieStore(), {
      rejectPublicSuffixes: true,
      allowSpecialUseDomain: false
    })
    try {
      await cookieJar.setCookie(
        `settingThisShouldPass=true; Domain=dev.${specialUseDomain}; Path=/;`,
        `http://dev.${specialUseDomain}`
      )
    } catch(e) {
      // @ts-ignore
      expect(e.message).toBe(`Cookie has domain set to the public suffix "${specialUseDomain}" which is a special use domain. To allow this, configure your CookieJar with {allowSpecialUseDomain:true, rejectPublicSuffixes: false}.`)
    }
  })
})

// special use domains under the top-level domain
describe.each([
  "local",
  "example",
  "invalid",
  "localhost",
  "test"
])('when special use domain is %s', (specialUseDomain) => {
  // the restriction on special use domains at the top-level is loosened for
  // the following domains due to legacy behavior
  const isAllowed = ['localhost', 'invalid'].includes(specialUseDomain)

  if (isAllowed) {
    it('should allow special domain cookies if allowSpecialUseDomain is set to the default value', async () => {
      const cookieJar = new CookieJar()
      const cookie = await cookieJar.setCookie(
        `settingThisShouldPass=true; Domain=${specialUseDomain}; Path=/;`,
        `http://${specialUseDomain}`
      )
      expect(cookie).toEqual(objectContaining({
        key: 'settingThisShouldPass',
        value: 'true',
        domain: `${specialUseDomain}`
      }))
      const cookies = await cookieJar.getCookies(`http://${specialUseDomain}`, {
        http: true
      })
      expect(cookies).toEqual([cookie])
    })
  } else {
    it('should reject special domain cookies if allowSpecialUseDomain is set to the default value', async () => {
      assertions(1)
      const cookieJar = new CookieJar()
      try {
        await cookieJar.setCookie(
          `settingThisShouldPass=true; Domain=${specialUseDomain}; Path=/;`,
          `http://${specialUseDomain}`
        )
      } catch(e) {
        // @ts-ignore
        expect(e.message).toBe(`Cookie has domain set to the public suffix "${specialUseDomain}" which is a special use domain. To allow this, configure your CookieJar with {allowSpecialUseDomain:true, rejectPublicSuffixes: false}.`)
      }
    })
  }

  if (isAllowed) {
    it('should allow special domain cookies if allowSpecialUseDomain: true', async () => {
      const cookieJar = new CookieJar(new MemoryCookieStore(), {
        rejectPublicSuffixes: true,
        allowSpecialUseDomain: true
      })
      const cookie = await cookieJar.setCookie(
        `settingThisShouldPass=true; Domain=${specialUseDomain}; Path=/;`,
        `http://${specialUseDomain}`
      )
      expect(cookie).toEqual(objectContaining({
        key: 'settingThisShouldPass',
        value: 'true',
        domain: `${specialUseDomain}`
      }))
      const cookies = await cookieJar.getCookies(`http://${specialUseDomain}`, {
        http: true
      })
      expect(cookies).toEqual([cookie])
    })
  } else {
    it('should reject special domain cookies if allowSpecialUseDomain: true', async () => {
      assertions(1)
      const cookieJar = new CookieJar(new MemoryCookieStore(), {
        rejectPublicSuffixes: true,
        allowSpecialUseDomain: true
      })
      try {
        await cookieJar.setCookie(
          `settingThisShouldPass=true; Domain=${specialUseDomain}; Path=/;`,
          `http://${specialUseDomain}`
        )
      } catch(e) {
        // @ts-ignore
        expect(e.message).toBe(`Cookie has domain set to the public suffix "${specialUseDomain}" which is a special use domain. To allow this, configure your CookieJar with {allowSpecialUseDomain:true, rejectPublicSuffixes: false}.`)
      }
    })
  }

  it('should reject special domain cookies if allowSpecialUseDomain: true', async () => {
    assertions(1)
    const cookieJar = new CookieJar(new MemoryCookieStore(), {
      rejectPublicSuffixes: true,
      allowSpecialUseDomain: false
    })
    try {
      await cookieJar.setCookie(
        `settingThisShouldPass=true; Domain=${specialUseDomain}; Path=/;`,
        `http://${specialUseDomain}`
      )
    } catch(e) {
      // @ts-ignore
      expect(e.message).toBe(`Cookie has domain set to the public suffix "${specialUseDomain}" which is a special use domain. To allow this, configure your CookieJar with {allowSpecialUseDomain:true, rejectPublicSuffixes: false}.`)
    }
  })
})

function createCookie(
  cookieString: string,
  options: {
    hostOnly?: boolean;
  } = {}
): Cookie {
  const cookie = Cookie.parse(cookieString)
  if (options?.hostOnly) {
    // @ts-ignore
    cookie.hostOnly = options.hostOnly
  }
  // @ts-ignore
  return cookie
}

function apiVariants (testName: string, apiVariants: ApiVariants, assertions: () => Promise<void>) {
  it(`${testName} (callback)`, async () => {
    await new Promise(resolve => apiVariants.callbackStyle(() => resolve(undefined)))
    await assertions()
  })

  it(`${testName} (async)`, async () => {
    await apiVariants.asyncStyle()
    await assertions()
  })

  it(`${testName} (sync)`, async () => {
    apiVariants.syncStyle()
    await assertions()
  })
}

type CallbackApiVariant = (done: () => void) => void
type PromiseApiVariant = () => Promise<void>
type SyncApiVariant = () => void

interface ApiVariants {
  callbackStyle: CallbackApiVariant,
  asyncStyle: PromiseApiVariant,
  syncStyle: SyncApiVariant
}

function at (timeFromNow: number) {
  return {
    now: new Date(Date.now() + timeFromNow)
  }
}
