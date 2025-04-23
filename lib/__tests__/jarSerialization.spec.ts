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

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { Cookie } from '../cookie/cookie.js'
import { CookieJar } from '../cookie/cookieJar.js'
import type {
  SerializedCookie,
  SerializedCookieJar,
} from '../cookie/constants.js'
import { MemoryCookieStore } from '../memstore.js'
import { Store } from '../store.js'
import { version } from '../version.js'

beforeAll(() => vi.useFakeTimers())
afterAll(() => vi.useRealTimers())

describe('cookieJar serialization', () => {
  it('should provide the list of serialized properties available for a Cookie with `Cookie.serializableProperties`', () => {
    expect(Cookie.serializableProperties).toEqual([
      'key',
      'value',
      'expires',
      'maxAge',
      'domain',
      'path',
      'secure',
      'httpOnly',
      'extensions',
      'hostOnly',
      'pathIsDefault',
      'creation',
      'lastAccessed',
      'sameSite',
    ])
  })

  describe('a store without `getAllCookies`', () => {
    it('cannot call toJSON', () => {
      const store = new Store()
      store.synchronous = true

      const jar = new CookieJar(store)
      expect(() => jar.toJSON()).toThrow(
        'getAllCookies is not implemented (therefore jar cannot be serialized)',
      )
    })
  })

  describe('for async stores', () => {
    it('cannot call toJSON', () => {
      const store = new MemoryCookieStore()
      store.synchronous = false
      const jar = new CookieJar(store)
      expect(() => jar.toJSON()).toThrow(
        'CookieJar store is not synchronous; use async API instead.',
      )
    })
  })

  describe('with a small store', () => {
    let jar: CookieJar

    beforeEach(async () => {
      jar = new CookieJar()

      // domain cookie with custom extension
      await jar.setCookie(
        'sid=one; domain=example.com; path=/; fubar',
        'http://example.com/',
      )

      await jar.setCookie(
        'sid=two; domain=example.net; path=/; fubar',
        'http://example.net/',
      )
    })

    it('should serialize synchronously', () => {
      const serializedJar = jar.serializeSync()
      if (!serializedJar) {
        throw new Error('This should not be undefined')
      }
      expectDataToMatchSerializationSchema(serializedJar)
      expect(serializedJar.cookies.length).toBe(2)
    })

    it('should deserialize synchronously', () => {
      const serializedJar = jar.serializeSync()
      if (!serializedJar) {
        throw new Error('This should not be undefined')
      }
      const deserializedJar = CookieJar.deserializeSync(serializedJar)
      expect(jar.store).toEqual(deserializedJar.store)
    })

    it('should serialize asynchronously', async () => {
      const serializedJar = await jar.serialize()
      expectDataToMatchSerializationSchema(serializedJar)
      expect(serializedJar.cookies.length).toBe(2)
    })

    it('should deserialize asynchronously', async () => {
      const serializedJar = await jar.serialize()
      const deserializedJar = await CookieJar.deserialize(serializedJar)
      expect(jar.store).toEqual(deserializedJar.store)
    })
  })

  describe('with a small store for cloning', () => {
    let jar: CookieJar

    beforeEach(async () => {
      jar = new CookieJar()

      // domain cookie with custom extension
      await jar.setCookie(
        'sid=three; domain=example.com; path=/; cloner',
        'http://example.com/',
      )

      await jar.setCookie(
        'sid=four; domain=example.net; path=/; cloner',
        'http://example.net/',
      )
    })

    it('should contain the same contents when cloned asynchronously', async () => {
      const clonedJar = await jar.clone(new MemoryCookieStore())
      expect(clonedJar.store).toEqual(jar.store)
    })

    it('should contain the same contents when cloned synchronously', () => {
      const clonedJar = jar.cloneSync(new MemoryCookieStore())
      if (!clonedJar) {
        throw new Error('This should not be undefined')
      }
      expect(clonedJar.store).toEqual(jar.store)
    })

    it('should raise an error when attempting to synchronously clone to an async store', () => {
      const newStore = new MemoryCookieStore()
      newStore.synchronous = false
      expect(() => jar.cloneSync(newStore)).toThrow(
        'CookieJar clone destination store is not synchronous; use async API instead.',
      )
    })
  })

  describe('with a moderately-sized store', () => {
    let jar: CookieJar
    let expires: Date

    beforeEach(async () => {
      expires = new Date(Date.now() + 86400000)
      jar = new CookieJar()

      // Do paths first since the MemoryCookieStore index is domain at the top
      // level. This should cause the preservation of creation order in
      // getAllCookies to be exercised.
      const paths = ['/', '/foo', '/foo/bar']
      const domains = ['example.com', 'www.example.com', 'example.net']
      for (const path of paths) {
        for (const domain of domains) {
          const key = 'key'
          const value = JSON.stringify({ path, domain })
          const cookie = new Cookie({ expires, domain, path, key, value })
          await jar.setCookie(cookie, `http://${domain}/`)
        }
      }

      // corner cases
      const cornerCases = [
        { expires: 'Infinity', key: 'infExp', value: 'infExp' },
        { maxAge: 3600, key: 'max', value: 'max' },
        {
          expires,
          key: 'flags',
          value: 'flags',
          secure: true,
          httpOnly: true,
        },
        {
          expires,
          key: 'honly',
          value: 'honly',
          hostOnly: true,
          domain: 'www.example.org',
        },
      ] as const

      for (const cornerCase of cornerCases) {
        const domain =
          'domain' in cornerCase ? cornerCase.domain : 'example.org'
        const path = '/'
        const cookie = new Cookie({ ...cornerCase, domain, path })
        await jar.setCookie(cookie, 'https://www.example.org/', {
          ignoreError: true,
        })
      }
    })

    it('should have the expected metadata', async () => {
      const serializedJar = await jar.serialize()
      expect(serializedJar.version).toBe(`tough-cookie@${version}`)
      expect(serializedJar.rejectPublicSuffixes).toBe(true)
      expect(serializedJar.storeType).toBe('MemoryCookieStore')
    })

    it('should contain the expected serialized cookies', async () => {
      const serializedJar = await jar.serialize()
      expect(serializedJar.cookies.length).toBe(13)
      expectDataToMatchSerializationSchema(serializedJar)
      serializedJar.cookies.forEach((serializedCookie) => {
        if (serializedCookie.key === 'key') {
          const parsedValue = JSON.parse(serializedCookie.value ?? '{}') as {
            domain?: string
            path?: string
          }
          expect(typeof parsedValue.domain).toBe('string')
          expect(typeof parsedValue.path).toBe('string')
        }

        if (
          serializedCookie.key === 'infExp' ||
          serializedCookie.key === 'max'
        ) {
          expect(serializedCookie.expires).toBeFalsy()
        } else {
          expect(serializedCookie.expires).toBe(expires.toISOString())
        }

        if (serializedCookie.key === 'max') {
          expect(serializedCookie.maxAge).toBe(3600)
        } else {
          expect(serializedCookie.maxAge).toBeUndefined()
        }

        if (serializedCookie.key === 'flags') {
          expect(serializedCookie.secure).toBe(true)
          expect(serializedCookie.httpOnly).toBe(true)
        } else {
          expect(serializedCookie.secure).toBeUndefined()
          expect(serializedCookie.httpOnly).toBeUndefined()
        }

        expect(serializedCookie.hostOnly).toBe(serializedCookie.key === 'honly')

        // Sometimes we roll over a millisecond, so we check both timestamps
        expect(serializedCookie.creation).toBe(new Date().toISOString())
        expect(serializedCookie.lastAccessed).toBe(new Date().toISOString())
      })
    })

    it('should be the same when deserialized', async () => {
      const serializedJar = await jar.serialize()
      const deserializedJar = await CookieJar.deserialize(serializedJar)
      expect(deserializedJar.store).toEqual(jar.store)

      const cookies = await deserializedJar.getCookies('http://example.org/')
      expect(cookies).toEqual([
        expect.objectContaining({
          key: 'infExp',
          expires: 'Infinity',
        }),
        expect.objectContaining({
          key: 'max',
        }),
      ])
      expect((cookies[0] as Cookie).TTL(Date.now())).toBe(Infinity)
      expect((cookies[1] as Cookie).TTL(Date.now())).toBe(3_600_000)
    })
  })
})

function expectDataToMatchSerializationSchema(
  serializedJar: SerializedCookieJar,
): void {
  expect(serializedJar).not.toBeNull()
  expect(serializedJar).toBeInstanceOf(Object)
  expect(serializedJar.version).toBe(`tough-cookie@${version}`)
  expect(serializedJar.storeType).toBe('MemoryCookieStore')
  expect(serializedJar.rejectPublicSuffixes).toBe(true)
  expect(serializedJar.cookies).toBeInstanceOf(Array)
  serializedJar.cookies.forEach((cookie) => {
    validateSerializedCookie(cookie)
  })
}

const serializedCookiePropTypes: { [key: string]: string } = {
  key: 'string',
  value: 'string',
  expires: 'isoDate', // if "Infinity" it's supposed to be missing
  maxAge: 'intOrInf',
  domain: 'string',
  path: 'string',
  secure: 'boolean',
  httpOnly: 'boolean',
  extensions: 'array', // of strings, technically
  hostOnly: 'boolean',
  pathIsDefault: 'boolean',
  creation: 'isoDate',
  lastAccessed: 'isoDate',
  sameSite: 'string',
}

function validateSerializedCookie(cookie: SerializedCookie): void {
  expect(typeof cookie).toBe('object')
  expect(cookie).not.toBeInstanceOf(Cookie)

  Object.keys(cookie).forEach((prop) => {
    const type = serializedCookiePropTypes[prop]
    switch (type) {
      case 'string':
      case 'boolean':
      case 'number':
        expect(typeof cookie[prop]).toBe(type)
        break

      case 'array':
        expect(Array.isArray(cookie[prop])).toBe(true)
        break

      case 'intOrInf':
        if (cookie[prop] !== 'Infinity' && cookie[prop] !== '-Infinity') {
          expect(Number.isInteger(cookie[prop])).toBe(true)
        }
        break

      case 'isoDate':
        if (cookie[prop] != null) {
          const parsed = new Date(Date.parse(cookie[prop] as string))
          expect(cookie[prop]).toBe(parsed.toISOString())
        }
        break

      default:
        throw new Error(`unexpected serialized property: ${prop}`)
    }
  })
}
