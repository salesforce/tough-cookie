import {Cookie} from "../cookie";

describe('Cookie.toString()', () => {
  it('should produce a string from a simple cookie', () => {
    expect(Cookie.parse("a=b").toString()).toBe('a=b')
  })

  it('should trim spaces from the cookie value', () => {
    expect(Cookie.parse("a= b ").toString()).toBe('a=b')
  })

  it('should produce a string with an empty value and an attribute', () => {
    expect(Cookie.parse("a=;HttpOnly").toString()).toBe('a=; HttpOnly')
  })

  it('should produce a string from a cookie with several attributes', () => {
    expect(
      Cookie.parse("a=b;Expires=Tue, 18 Oct 2011 07:05:03 GMT;Max-Age=12345;Domain=example.com;Path=/foo;Secure;HttpOnly;MyExtension").toString()
    ).toBe('a=b; Expires=Tue, 18 Oct 2011 07:05:03 GMT; Max-Age=12345; Domain=example.com; Path=/foo; Secure; HttpOnly; MyExtension')
  })

  it('should not include the domain on a host-only cookie', () => {
    const cookie = new Cookie({
      key: "a",
      value: "b",
      hostOnly: true,
      domain: "shouldnt-stringify.example.com",
      path: "/should-stringify"
    })
    expect(cookie.toString()).toBe('a=b; Path=/should-stringify')
  })

  it('should output the right expires date when minutes are 10', () => {
    const cookie = new Cookie({
      key: "a",
      value: "b",
      expires: new Date(1284113410000)
    })
    expect(cookie.toString()).toBe('a=b; Expires=Fri, 10 Sep 2010 10:10:10 GMT')
  })
})
