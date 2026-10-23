import { describe, expect, expectTypeOf, it } from 'vitest'
import { Cookie } from '../cookie/cookie.js'
import { MaxAgeSeconds } from '../cookie/maxAgeSeconds.js'

describe('MaxAgeSeconds', () => {
  it.each([0, -0, -1, 1, 1.25, 34_560_000, 34_560_001, Number.MAX_VALUE])(
    'preserves finite seconds: %s',
    (input) => {
      const seconds = MaxAgeSeconds.parse(input)
      expect(seconds).toBe(input)
      expect(seconds).not.toBeUndefined()
      if (seconds === undefined) throw new Error('Expected finite seconds')
      expect(MaxAgeSeconds.toMilliseconds(seconds)).toBe(input * 1000)
    },
  )

  it.each([Infinity, -Infinity, NaN])(
    'rejects non-finite values: %s',
    (input) => {
      expect(MaxAgeSeconds.parse(input)).toBeUndefined()
    },
  )

  it('distinguishes seconds from plain numbers without changing the public API', () => {
    expect(MaxAgeSeconds.parse(1)).toBe(1)
    expectTypeOf<MaxAgeSeconds>().toExtend<number>()
    expectTypeOf<number>().not.toExtend<MaxAgeSeconds>()
    expectTypeOf<typeof MaxAgeSeconds.parse>().returns.toEqualTypeOf<
      MaxAgeSeconds | undefined
    >()
    expectTypeOf<typeof MaxAgeSeconds.toMilliseconds>()
      .parameter(0)
      .toEqualTypeOf<MaxAgeSeconds>()
    expectTypeOf<Cookie['maxAge']>().toEqualTypeOf<
      number | 'Infinity' | '-Infinity' | null
    >()
    expectTypeOf<Cookie['setMaxAge']>().parameter(0).toEqualTypeOf<number>()
  })

  it('exposes the recommended bound without clamping larger values', () => {
    expect(MaxAgeSeconds.MAX_RECOMMENDED).toBe(400 * 24 * 60 * 60)
    const cookie = new Cookie({ maxAge: MaxAgeSeconds.MAX_RECOMMENDED + 1 })
    expect(cookie.TTL()).toBe(34_560_001_000)
    expect(cookie.expiryTime(new Date(1000))).toBe(34_560_001_000 + 1000)
  })
})

describe('Cookie lifetime compatibility', () => {
  const now = new Date(9_000_000)

  it.each([
    0,
    -0,
    -1,
    1,
    1.25,
    34_560_001,
    Number.MAX_VALUE,
    Infinity,
    -Infinity,
    NaN,
  ])('preserves numeric maxAge calculations: %s', (maxAge) => {
    const cookie = new Cookie({ maxAge, expires: new Date(1) })
    expect(cookie.TTL(now.getTime())).toBe(maxAge <= 0 ? 0 : maxAge * 1000)
    expect(cookie.expiryTime(now)).toBe(
      now.getTime() + (maxAge <= 0 ? -Infinity : maxAge * 1000),
    )
  })

  it.each(['Infinity', '-Infinity'] as const)(
    'preserves serialized sentinel calculations: %s',
    (maxAge) => {
      const cookie = new Cookie({ maxAge, expires: new Date(1) })
      // TTL historically falls back to Expires for string sentinels.
      expect(cookie.TTL(now.getTime())).toBe(1 - now.getTime())
      expect(cookie.expiryTime(now)).toBe(
        maxAge === 'Infinity' ? Infinity : -Infinity,
      )
      const restored = Cookie.fromJSON(JSON.stringify(cookie))
      expect(restored?.maxAge).toBe(maxAge)
      expect(restored?.TTL(now.getTime())).toBe(cookie.TTL(now.getTime()))
      expect(restored?.expiryTime(now)).toBe(cookie.expiryTime(now))
    },
  )

  it.each([1.25, Infinity, -Infinity])(
    'preserves setMaxAge and JSON: %s',
    (age) => {
      const cookie = new Cookie({ key: 'a', value: 'b' })
      cookie.setMaxAge(age)
      expect(cookie.maxAge).toBe(Number.isFinite(age) ? age : String(age))
      const restored = Cookie.fromJSON(JSON.stringify(cookie))
      expect(restored?.maxAge).toBe(cookie.maxAge)
      expect(restored?.TTL()).toBe(cookie.TTL())
      expect(restored?.expiryTime(now)).toBe(cookie.expiryTime(now))
    },
  )

  it('keeps session and Expires fallbacks unchanged', () => {
    const session = new Cookie()
    expect(session.TTL(now.getTime())).toBe(Infinity)
    expect(session.expiryTime(now)).toBe(Infinity)
    expect(session.isPersistent()).toBe(false)
    const expires = new Cookie({ expires: new Date(9_001_000) })
    expect(expires.TTL(now.getTime())).toBe(1000)
    expect(expires.expiryTime(now)).toBe(9_001_000)
  })

  it('keeps the lastAccessed offset and infinite relative date unchanged', () => {
    const cookie = new Cookie({ maxAge: 1.25, lastAccessed: now })
    expect(cookie.expiryTime()).toBe(9_001_250)
    cookie.lastAccessed = 'Infinity'
    expect(cookie.expiryTime()).toBe(Infinity)
  })
})
