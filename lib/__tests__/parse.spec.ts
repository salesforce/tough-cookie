import { Cookie } from "../cookie";
import { performance } from "node:perf_hooks";

describe('Cookie.parse', () => {
  it.each([
    // simple
    {
      input: 'a=bcd',
      output: {
        key: 'a',
        value: 'bcd',
      },
    },
    // with expiry
    {
      input: 'a=bcd; Expires=Tue, 18 Oct 2011 07:05:03 GMT',
      output: {
        key: 'a',
        value: 'bcd',
        expires: new Date(Date.parse('Tue, 18 Oct 2011 07:05:03 GMT')),
      },
    },
    // with expiry and path
    {
      input: 'abc="xyzzy!"; Expires=Tue, 18 Oct 2011 07:05:03 GMT; Path=/aBc',
      output: {
        key: 'abc',
        value: '"xyzzy!"',
        expires: new Date(Date.parse('Tue, 18 Oct 2011 07:05:03 GMT')),
        path: '/aBc',
        httpOnly: false,
        secure: false,
      },
    },
    // with most things
    {
      input:
        'abc="xyzzy!"; Expires=Tue, 18 Oct 2011 07:05:03 GMT; Path=/aBc; Domain=example.com; Secure; HTTPOnly; Max-Age=1234; Foo=Bar; Baz',
      output: {
        key: 'abc',
        value: '"xyzzy!"',
        expires: new Date(Date.parse('Tue, 18 Oct 2011 07:05:03 GMT')),
        path: '/aBc',
        domain: 'example.com',
        secure: true,
        httpOnly: true,
        maxAge: 1234,
        extensions: ['Foo=Bar', 'Baz'],
      },
    },
    // invalid expires
    {
      input: 'a=b; Expires=xyzzy',
      output: {
        key: 'a',
        value: 'b',
        expires: 'Infinity',
      },
    },
    // zero max-age
    {
      input: 'a=b; Max-Age=0',
      output: {
        key: 'a',
        value: 'b',
        maxAge: 0,
      },
    },
    // negative max-age
    {
      input: 'a=b; Max-Age=-1',
      output: {
        key: 'a',
        value: 'b',
        maxAge: -1,
      },
    },
    // empty domain
    {
      input: 'a=b; domain=',
      output: {
        key: 'a',
        value: 'b',
        domain: null,
      },
    },
    // dot domain
    {
      input: 'a=b; domain=.',
      output: {
        key: 'a',
        value: 'b',
        domain: null,
      },
    },
    // uppercase domain
    {
      input: 'a=b; domain=EXAMPLE.COM',
      output: {
        key: 'a',
        value: 'b',
        domain: 'example.com',
      },
    },
    // trailing dot in domain
    {
      input: 'a=b; Domain=example.com.',
      output: {
        key: 'a',
        value: 'b',
        domain: 'example.com.',
      },
      assertValidateReturns: false,
    },
    // empty path
    {
      input: 'a=b; path=',
      output: {
        key: 'a',
        value: 'b',
        path: null,
      },
    },
    // no-slash path
    {
      input: 'a=b; path=xyzzy',
      output: {
        key: 'a',
        value: 'b',
        path: null,
      },
    },
    // trailing semi-colons after path #1
    {
      input: 'a=b; path=/;',
      output: {
        key: 'a',
        value: 'b',
        path: '/',
      },
    },
    // trailing semi-colons after path #2
    {
      input: 'c=d;;;;',
      output: {
        key: 'c',
        value: 'd',
        path: null,
      },
    },
    // secure-with-value
    {
      input: 'a=b; Secure=xyzzy',
      output: {
        key: 'a',
        value: 'b',
        secure: true,
      },
    },
    // httponly-with-value
    {
      input: 'a=b; HttpOnly=xyzzy',
      output: {
        key: 'a',
        value: 'b',
        httpOnly: true,
      },
    },
    // garbage
    {
      input: '\x08',
      output: undefined,
    },
    // public suffix domain
    {
      input: 'a=b; domain=kyoto.jp',
      output: {
        key: 'a',
        value: 'b',
        domain: 'kyoto.jp',
      },
      assertValidateReturns: false,
    },
    // public suffix foonet.net - top level
    {
      input: 'a=b; domain=foonet.net',
      output: {
        key: 'a',
        value: 'b',
        domain: 'foonet.net',
      },
      assertValidateReturns: true,
    },
    // public suffix foonet.net - www
    {
      input: 'a=b; domain=www.foonet.net',
      output: {
        key: 'a',
        value: 'b',
        domain: 'www.foonet.net',
      },
      assertValidateReturns: true,
    },
    // public suffix foonet.net - with a dot
    {
      input: 'a=b; domain=.foonet.net',
      output: {
        key: 'a',
        value: 'b',
        domain: 'foonet.net',
      },
      assertValidateReturns: true,
    },
    // Ironically, Google 'GAPS' cookie has very little whitespace
    {
      input:
        'GAPS=1:A1aaaaAaAAa1aaAaAaaAAAaaa1a11a:aaaAaAaAa-aaaA1-;Path=/;Expires=Thu, 17-Apr-2014 02:12:29 GMT;Secure;HttpOnly',
      output: {
        key: 'GAPS',
        value: '1:A1aaaaAaAAa1aaAaAaaAAAaaa1a11a:aaaAaAaAa-aaaA1-',
        path: '/',
        expires: new Date(Date.parse('Thu, 17-Apr-2014 02:12:29 GMT')),
        secure: true,
        httpOnly: true,
      },
    },
    // lots of equal signs
    {
      input:
        'queryPref=b=c&d=e; Path=/f=g; Expires=Thu, 17 Apr 2014 02:12:29 GMT; HttpOnly',
      output: {
        key: 'queryPref',
        value: 'b=c&d=e',
        path: '/f=g',
        expires: new Date(Date.parse('Thu, 17 Apr 2014 02:12:29 GMT')),
        httpOnly: true,
      },
    },
    // spaces in value
    {
      input: 'a=one two three',
      output: {
        key: 'a',
        value: 'one two three',
        path: null,
        domain: null,
        extensions: null,
      },
    },
    // quoted spaces in value
    {
      input: 'a="one two three"',
      output: {
        key: 'a',
        value: '"one two three"',
        path: null,
        domain: null,
        extensions: null,
      },
    },
    // non-ASCII in value
    {
      input: 'farbe=weiß',
      output: {
        key: 'farbe',
        value: 'weiß',
        path: null,
        domain: null,
        extensions: null,
      },
    },
    // empty key
    {
      input: '=abc',
      output: {
        key: '',
        value: 'abc',
        path: null,
        domain: null,
        extensions: null,
      },
      parseOptions: { loose: true },
    },
    // non-existent key
    {
      input: 'abc',
      output: {
        key: '',
        value: 'abc',
        path: null,
        domain: null,
        extensions: null,
      },
      parseOptions: { loose: true },
    },
    // weird format
    {
      input: '=foo=bar',
      output: {
        key: 'foo',
        value: 'bar',
        path: null,
        domain: null,
        extensions: null,
      },
      parseOptions: { loose: true },
    },
    // way too many semicolons followed by non-semicolon
    {
      input: `foo=bar${';'.repeat(65535)} domain=example.com`,
      output: {
        key: 'foo',
        value: 'bar',
        path: null,
        domain: 'example.com',
        extensions: null,
      },
    },
    // way too many spaces - small one doesn't parse
    {
      input: `x x`,
      output: undefined,
    },
    // way too many spaces - large one doesn't parse
    {
      input: `x${' '.repeat(65535)}x`,
      output: undefined,
    },
    // same-site - lax
    {
      input: `abc=xyzzy; SameSite=Lax`,
      output: {
        key: 'abc',
        value: 'xyzzy',
        sameSite: 'lax',
        extensions: null,
      },
    },
    // same-site - strict
    {
      input: `abc=xyzzy; SameSite=StRiCt`,
      output: {
        key: 'abc',
        value: 'xyzzy',
        sameSite: 'strict',
        extensions: null,
      },
    },
    // same-site - none
    {
      input: `abc=xyzzy; SameSite=NoNe`,
      output: {
        key: 'abc',
        value: 'xyzzy',
        sameSite: 'none',
        extensions: null,
      },
    },
    // same-site - bad
    {
      input: `abc=xyzzy; SameSite=example.com`,
      output: {
        key: 'abc',
        value: 'xyzzy',
        sameSite: undefined,
        extensions: null,
      },
    },
    // same-site - absent
    {
      input: `abc=xyzzy;`,
      output: {
        key: 'abc',
        value: 'xyzzy',
        sameSite: undefined,
        extensions: null,
      },
    },
    // empty string
    {
      input: ``,
      output: null,
    },
    // missing string
    {
      input: undefined,
      output: null,
    },
    // some string object
    {
      input: new String(''),
      output: null,
    },
    // some empty string object
    {
      input: new String(),
      output: null,
    },
  ])('Cookie.parse("$input")', (testCase) => {
    const { input, output } = testCase
    const parseOptions = testCase.parseOptions || {}

    const value = input === undefined ? undefined : input.valueOf()
    const cookie = Cookie.parse(value as string, parseOptions)
    if (output !== undefined) {
      expect(cookie).toEqual(expect.objectContaining(output))
    } else {
      expect(cookie).toBe(output)
    }

    if (cookie && typeof testCase.assertValidateReturns === 'boolean') {
      expect(cookie.validate()).toBe(testCase.assertValidateReturns)
    }
  })

  // perf cases for:
  // - way too many spaces (loose mode)
  // - way too many spaces (strict mode)
  // - way too many spaces with value (loose mode)
  // - way too many spaces with value (strict mode)
  it.each([
    {
      shortVersion: 'x x',
      longVersion: `x${' '.repeat(65535)}x`,
    },
    {
      shortVersion: 'x x',
      longVersion: `x${' '.repeat(65535)}x`,
      parseOptions: { loose: true },
    },
    {
      shortVersion: 'x =x',
      longVersion: `x${' '.repeat(65535)}=x`,
    },
    {
      shortVersion: 'x =x',
      longVersion: `x${' '.repeat(65535)}=x`,
      parseOptions: { loose: true },
    },
  ])(
    'Cookie.parse("$shortVersion") should not take significantly longer to run than Cookie.parse("$longVersion")',
    ({ shortVersion, longVersion, parseOptions = {} }) => {
      const startShortVersionParse = performance.now()
      Cookie.parse(shortVersion, parseOptions)
      const endShortVersionParse = performance.now()

      const startLongVersionParse = performance.now()
      Cookie.parse(longVersion, parseOptions)
      const endLongVersionParse = performance.now()

      const ratio =
        (endLongVersionParse - startLongVersionParse) /
        (endShortVersionParse - startShortVersionParse)
      expect(ratio).toBeLessThan(250) // if broken this ratio goes 2000-4000x higher
    },
  )
})

// way too many spaces - takes about the same time for each
it('should parse a long cookie string with spaces in roughly the same amount of time as one with short spaces', () => {
  const longCookie = `x${' '.repeat(65535)}x`
  const shortCookie = `x x`

  const startLongCookieParse = performance.now()
  Cookie.parse(longCookie)
  const endLongCookieParse = performance.now()

  const startShortCookieParse = performance.now()
  Cookie.parse(shortCookie)
  const endShortCookieParse = performance.now()

  const ratio =
    (endLongCookieParse - startLongCookieParse) /
    (endShortCookieParse - startShortCookieParse)
  expect(ratio).toBeLessThan(250) // if broken this ratio goes 2000-4000x higher
})
