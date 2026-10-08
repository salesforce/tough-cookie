import { describe, expect, expectTypeOf, it } from 'vitest'
import { CookieName } from '../cookie/cookieName.js'
import { Cookie } from '../cookie/cookie.js'
import { CookieJar } from '../cookie/cookieJar.js'

const validName =
  "!#$%&'*+-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ^_`abcdefghijklmnopqrstuvwxyz|~"

describe('Cookie name validation', () => {
  it('accepts every ASCII token character', () => {
    for (const key of validName) {
      expect(new Cookie({ key, value: 'value' }).validate()).toBe(true)
    }
    expect(new Cookie({ key: validName, value: 'value' }).validate()).toBe(true)
  })

  it('rejects every ASCII character outside the token grammar', () => {
    const invalidCharacters = Array.from({ length: 128 }, (_, code) =>
      String.fromCharCode(code),
    ).filter((character) => !validName.includes(character))
    for (const character of invalidCharacters) {
      expect(
        new Cookie({ key: `a${character}b`, value: 'value' }).validate(),
      ).toBe(false)
    }
  })

  it.each(['', 'name\n', 'name\r\n', 'café', '名前', 'a=b', 'a;b', 'a b'])(
    'rejects the invalid name %j',
    (key) => {
      expect(new Cookie({ key, value: 'value' }).validate()).toBe(false)
    },
  )

  it('does not tighten the permissive Set-Cookie parser', () => {
    const cookie = Cookie.parse('a b=value')
    expect(cookie?.key).toBe('a b')
    expect(cookie?.validate()).toBe(false)
  })

  it('does not reject legacy names when storing or retrieving cookies', async () => {
    const jar = new CookieJar()
    const cookie = await jar.setCookie('a b=value', 'https://example.com/')
    expect(cookie?.key).toBe('a b')
    expect(cookie?.validate()).toBe(false)
    expect(await jar.getCookieString('https://example.com/')).toBe('a b=value')
  })

  it('keeps nameless cookies usable in loose mode', async () => {
    const jar = new CookieJar(null, { looseMode: true })
    const cookie = await jar.setCookie('value', 'https://example.com/')
    expect(cookie?.key).toBe('')
    expect(cookie?.validate()).toBe(false)
    expect(await jar.getCookieString('https://example.com/')).toBe('value')
  })
})

describe('CookieName.parse', () => {
  it('returns a valid token unchanged with a distinct type', () => {
    const name = CookieName.parse(validName)
    expect(name).toBe(validName)
    expectTypeOf(name).toEqualTypeOf<CookieName | undefined>()
    expectTypeOf<string>().not.toExtend<CookieName>()
    expectTypeOf<CookieName>().toExtend<string>()
  })

  it.each(['', 'name\n', 'name\r\n', 'café', 'a=b', 'a b'])(
    'does not construct a name from %j',
    (name) => {
      expect(CookieName.parse(name)).toBeUndefined()
    },
  )
})
