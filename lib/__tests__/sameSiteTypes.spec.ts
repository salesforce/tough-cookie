import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  Cookie,
  type CreateCookieOptions,
  type GetCookiesOptions,
  type SameSiteLevel,
  type SetCookieOptions,
} from '../cookie/index.js'

describe('SameSite types', () => {
  // eslint-disable-next-line vitest/expect-expect -- expectTypeOf assertions are checked by _lint:types
  it('shares the public type between cookies and request contexts', () => {
    expectTypeOf<SameSiteLevel>().toEqualTypeOf<'strict' | 'lax' | 'none'>()
    expectTypeOf<Cookie['sameSite']>().toEqualTypeOf<
      SameSiteLevel | undefined
    >()
    expectTypeOf<CreateCookieOptions['sameSite']>().toEqualTypeOf<
      SameSiteLevel | undefined
    >()
    expectTypeOf<GetCookiesOptions['sameSiteContext']>().toEqualTypeOf<
      SameSiteLevel | undefined
    >()
    expectTypeOf<SetCookieOptions['sameSiteContext']>().toEqualTypeOf<
      SameSiteLevel | undefined
    >()
  })

  it.each<SameSiteLevel>(['strict', 'lax', 'none'])(
    'accepts and round-trips %s',
    (sameSite) => {
      const cookie = new Cookie({ key: 'session', value: 'value', sameSite })
      expect(Cookie.fromJSON(cookie.toJSON())?.sameSite).toBe(sameSite)
    },
  )

  it('rejects invalid constructor values and property assignments', () => {
    // @ts-expect-error only the three lowercase SameSite values are valid
    const cookie = new Cookie({ sameSite: 'invalid' })
    // @ts-expect-error header casing must be normalized before assignment
    cookie.sameSite = 'Strict'
    // Type narrowing does not add runtime validation for JavaScript callers.
    expect(cookie.sameSite).toBe('Strict')
  })

  it('preserves legacy serialized values at runtime', () => {
    const cookie = Cookie.fromJSON({
      key: 'session',
      value: 'value',
      sameSite: 'GaRbAGe',
    })
    expect(cookie?.sameSite).toBe('GaRbAGe')
    expect(cookie?.toString()).toBe('session=value; SameSite=GaRbAGe')
  })
})
