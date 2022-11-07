import {Cookie} from "../cookie";

jest.useFakeTimers()

describe('Cookie.toJSON()', () => {
  it('should serialize a cookie to JSON', () => {
    const cookie = Cookie.parse("alpha=beta; Domain=example.com; Path=/foo; Expires=Tue, 19 Jan 2038 03:14:07 GMT; HttpOnly")
    // @ts-ignore
    expect(cookie.toJSON()).toEqual({
      "creation": new Date().toISOString(),
      "domain": "example.com",
      "expires": "2038-01-19T03:14:07.000Z",
      "httpOnly": true,
      "key": "alpha",
      "path": "/foo",
      "value": "beta",
    })
  })
})

describe('Cookie.fromJSON()', () => {
  it('should deserialize a cookie from JSON', () => {
    const json = JSON.stringify({
      "key": "alpha",
      "value": "beta",
      "domain": "example.com",
      "path": "/foo",
      "expires": "2038-01-19T03:14:07.000Z",
      "httpOnly": true,
      "lastAccessed": 2000000000123
    })
    expect(Cookie.fromJSON(json)).toEqual(new Cookie({
      "creation": new Date(),
      "domain": "example.com",
      "expires": new Date(Date.parse("2038-01-19T03:14:07.000Z")),
      "httpOnly": true,
      "key": "alpha",
      "path": "/foo",
      "value": "beta",
      "lastAccessed": new Date(2000000000123)
    }))
  })

  it('should be able to handle a null value deserialization', () => {
    expect(Cookie.fromJSON(null)).toBeNull()
  })

  it('should be able to handle expiry, creation, or lastAccessed with Infinity during deserialization', () => {
    const json = JSON.stringify({
      "expires": "Infinity",
      "creation": "Infinity",
      "lastAccessed": "Infinity",
    })
    // @ts-ignore
    expect(Cookie.fromJSON(json).expires).toBe("Infinity")
    // @ts-ignore
    expect(Cookie.fromJSON(json).creation).toBe("Infinity")
    // @ts-ignore
    expect(Cookie.fromJSON(json).lastAccessed).toBe("Infinity")
  })
})
