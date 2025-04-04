import { describe, expect, it } from 'vitest'
import { Cookie } from '../cookie/cookie.js'

describe('Cookie.toJSON()', () => {
  it('should serialize a cookie to JSON', () => {
    const start = new Date().toISOString()
    const cookie = Cookie.parse(
      'alpha=beta; Domain=example.com; Path=/foo; Expires=Tue, 19 Jan 2038 03:14:07 GMT; HttpOnly',
    )
    const finish = new Date().toISOString()
    if (!cookie) {
      throw new Error('This should not be undefined')
    }
    expect(cookie.toJSON()).toEqual({
      // Sometimes we roll over a millisecond, so we need to check both
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      creation: expect.toBeOneOf([start, finish]),
      domain: 'example.com',
      expires: '2038-01-19T03:14:07.000Z',
      httpOnly: true,
      key: 'alpha',
      path: '/foo',
      value: 'beta',
    })
  })
})

describe('Cookie.fromJSON()', () => {
  it('should deserialize a cookie from JSON', () => {
    const json = JSON.stringify({
      key: 'alpha',
      value: 'beta',
      domain: 'example.com',
      path: '/foo',
      expires: '2038-01-19T03:14:07.000Z',
      httpOnly: true,
      lastAccessed: 2000000000123,
    })
    const cookie = Cookie.fromJSON(json)
    expect(cookie).toEqual(
      expect.objectContaining({
        creation: new Date(),
        domain: 'example.com',
        expires: new Date(Date.parse('2038-01-19T03:14:07.000Z')),
        httpOnly: true,
        key: 'alpha',
        path: '/foo',
        value: 'beta',
        lastAccessed: new Date(2000000000123),
      }),
    )
  })

  it('should be able to handle a null value deserialization', () => {
    expect(Cookie.fromJSON(null)).toBeUndefined()
  })

  it('should be able to handle expiry, creation, or lastAccessed with Infinity during deserialization', () => {
    const json = JSON.stringify({
      expires: 'Infinity',
      creation: 'Infinity',
      lastAccessed: 'Infinity',
    })
    const cookie = Cookie.fromJSON(json)
    if (!cookie) {
      throw new Error('This should not be null')
    }
    expect(cookie.expires).toBe('Infinity')
    expect(cookie.creation).toBe('Infinity')
    expect(cookie.lastAccessed).toBe('Infinity')
  })
})
