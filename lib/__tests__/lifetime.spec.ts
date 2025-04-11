import { describe, expect, it } from 'vitest'
import { Cookie } from '../cookie/cookie.js'

describe('Lifetime', () => {
  it('should be able to set a TTL using max-age', () => {
    const cookie = new Cookie()
    cookie.maxAge = 123
    expect(cookie.TTL()).toBe(123_000)
    expect(cookie.expiryTime(new Date(9_000_000))).toBe(9_123_000)
  })

  it('should be treat a TTL with zero max-age as "earliest representable"', () => {
    const cookie = new Cookie({ key: 'a', value: 'b', maxAge: 0 })
    expect(cookie.TTL()).toBe(0)
    expect(cookie.expiryTime(new Date(9_000_000))).toBe(-Infinity)
    expect(cookie.validate()).toBe(false)
  })

  it('should be treat a TTL with negative max-age as "earliest representable"', () => {
    const cookie = new Cookie({ key: 'a', value: 'b', maxAge: -1 })
    expect(cookie.TTL()).toBe(0)
    expect(cookie.expiryTime(new Date(9_000_000))).toBe(-Infinity)
    expect(cookie.validate()).toBe(false)
  })

  it('should be able control the TTL with max-age and expiry in the future', () => {
    const cookie = new Cookie({
      key: 'a',
      value: 'b',
      maxAge: 123,
      expires: new Date(Date.now() + 9_000),
    })
    expect(cookie.TTL()).toBe(123_000)
    expect(cookie.isPersistent()).toBe(true)
  })

  it('should be able control the TTL with expiry in the future', () => {
    const cookie = new Cookie({
      key: 'a',
      value: 'b',
      expires: new Date(Date.now() + 9_000),
    })
    expect(cookie.TTL()).toBe(9_000)
    expect(cookie.expiryTime()).toEqual((cookie.expires as Date).getTime())
  })

  it('should be able control the TTL with expiry in the past', () => {
    const cookie = new Cookie({ key: 'a', value: 'b' })
    cookie.setExpires('17 Oct 2010 00:00:00 GMT')
    expect(cookie.TTL()).toBeLessThan(0)
    expect(cookie.isPersistent()).toBe(true)
  })

  it('should have a default TTL', () => {
    const cookie = new Cookie()
    expect(cookie.TTL()).toBe(Infinity)
    expect(cookie.isPersistent()).toBe(false)
  })
})
