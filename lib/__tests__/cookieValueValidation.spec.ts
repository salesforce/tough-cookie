import { describe, expect, expectTypeOf, it } from 'vitest'
import { CookieValue } from '../cookie/cookieValue.js'
import { Cookie } from '../cookie/cookie.js'
import { CookieJar } from '../cookie/cookieJar.js'

// RFC 6265 Section 4.1.1:
// cookie-octet = %x21 / %x23-2B / %x2D-3A / %x3C-5B / %x5D-7E
// (excludes CTLs, whitespace, DQUOTE, comma, semicolon, backslash)
const validOctets =
  "!#$%&'()*+-./0123456789:<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstuvwxyz{|}~"

const invalidCharacters = Array.from({ length: 128 }, (_, code) =>
  String.fromCharCode(code),
).filter((character) => !validOctets.includes(character))

describe('Cookie value validation', () => {
  it.each(Array.from(validOctets))(
    'accepts the cookie-octet character %j',
    (char) => {
      expect(
        new Cookie({ key: 'name', value: `val${char}ue` }).validate(),
      ).toBe(true)
    },
  )

  it('accepts a value made of every cookie-octet character', () => {
    expect(new Cookie({ key: 'name', value: validOctets }).validate()).toBe(
      true,
    )
  })

  it.each(invalidCharacters)(
    'rejects the non-cookie-octet character %j',
    (character) => {
      expect(
        new Cookie({ key: 'name', value: `val${character}ue` }).validate(),
      ).toBe(false)
    },
  )

  it.each([
    'val\nue',
    'val\r\nue',
    'café',
    '値',
    'val ue',
    'val,ue',
    'val;ue',
    'val\\ue',
    'val"ue',
    '\x7f',
    '\x80',
    '\xa0',
    '\xff',
    '🍪',
    '\ud800',
  ])('rejects the invalid value %j', (value) => {
    expect(new Cookie({ key: 'name', value }).validate()).toBe(false)
  })

  it('does not tighten the permissive Set-Cookie parser', () => {
    const cookie = Cookie.parse('name=val ue')
    expect(cookie?.value).toBe('val ue')
    expect(cookie?.validate()).toBe(false)
  })

  it('does not reject values with non-standard characters when storing or retrieving cookies', async () => {
    const jar = new CookieJar()
    const cookie = await jar.setCookie('name=val ue', 'https://example.com/')
    expect(cookie?.value).toBe('val ue')
    expect(cookie?.validate()).toBe(false)
    expect(await jar.getCookieString('https://example.com/')).toBe(
      'name=val ue',
    )
  })
})

describe('CookieValue.parse', () => {
  it('returns a valid cookie value unchanged with a distinct nominal type', () => {
    const val = CookieValue.parse(validOctets)
    expect(val).toBe(validOctets)
    expectTypeOf(val).toEqualTypeOf<CookieValue | undefined>()
    expectTypeOf<string>().not.toExtend<CookieValue>()
    expectTypeOf<CookieValue>().toExtend<string>()
  })

  it('accepts empty string as valid *cookie-octet', () => {
    const empty = CookieValue.parse('')
    expect(empty).toBe('')
    expectTypeOf(empty).toEqualTypeOf<CookieValue | undefined>()
  })

  it.each([
    'val\nue',
    'val\r\nue',
    'café',
    'val ue',
    'val,ue',
    'val;ue',
    'val\\ue',
    'val"ue',
  ])('does not construct a CookieValue from %j', (value) => {
    expect(CookieValue.parse(value)).toBeUndefined()
  })
})
