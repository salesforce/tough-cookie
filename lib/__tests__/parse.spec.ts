import {Cookie} from "../cookie";
import {performance} from 'node:perf_hooks'

describe('Cookie.parse', () => {
  it.each([
    {
      input: 'a=bcd; Expires=Tue, 18 Oct 2011 07:05:03 GMT',
      output: {
        key: 'a',
        value: 'bcd',
        expires: new Date(Date.parse('Tue, 18 Oct 2011 07:05:03 GMT'))
      }
    },
    {
      input: 'abc="xyzzy!"; Expires=Tue, 18 Oct 2011 07:05:03 GMT; Path=/aBc',
      output: {
        key: 'abc',
        value: '"xyzzy!"',
        expires: new Date(Date.parse('Tue, 18 Oct 2011 07:05:03 GMT')),
        path: '/aBc',
        httpOnly: false,
        secure: false
      }
    },
    {
      input: 'abc="xyzzy!"; Expires=Tue, 18 Oct 2011 07:05:03 GMT; Path=/aBc; Domain=example.com; Secure; HTTPOnly; Max-Age=1234; Foo=Bar; Baz',
      output: {
        key: 'abc',
        value: '"xyzzy!"',
        expires: new Date(Date.parse('Tue, 18 Oct 2011 07:05:03 GMT')),
        path: '/aBc',
        domain: 'example.com',
        secure: true,
        httpOnly: true,
        maxAge: 1234,
        sameSite: 'none',
        extensions: ['Foo=Bar', 'Baz']
      }
    },
    {
      input: 'a=b; Expires=xyzzy',
      output: {
        key: 'a',
        value: 'b',
        expires: "Infinity"
      }
    },
    {
      input: 'a=b; Max-Age=0',
      output: {
        key: 'a',
        value: 'b',
        maxAge: 0
      }
    },
    {
      input: 'a=b; Max-Age=-1',
      output: {
        key: 'a',
        value: 'b',
        maxAge: -1
      }
    },
    {
      input: 'a=b; domain=',
      output: {
        key: 'a',
        value: 'b',
        domain: null
      }
    },
    {
      input: 'a=b; domain=.',
      output: {
        key: 'a',
        value: 'b',
        domain: null
      }
    },
    {
      input: 'a=b; domain=EXAMPLE.COM',
      output: {
        key: 'a',
        value: 'b',
        domain: "example.com"
      }
    },
    {
      input: 'a=b; Domain=example.com.',
      output: {
        key: 'a',
        value: 'b',
        domain: "example.com."
      }
    },
    {
      input: 'a=b; path=',
      output: {
        key: 'a',
        value: 'b',
        path: null
      }
    },
    {
      input: 'a=b; path=xyzzy',
      output: {
        key: 'a',
        value: 'b',
        path: null
      }
    },
    {
      input: 'a=b; path=/;',
      output: {
        key: 'a',
        value: 'b',
        path: '/'
      }
    },
    {
      input: 'c=d;;;;',
      output: {
        key: 'c',
        value: 'd',
        path: null
      }
    },
    {
      input: 'a=b; Secure=xyzzy',
      output: {
        key: 'a',
        value: 'b',
        secure: true
      }
    },
    {
      input: 'a=b; HttpOnly=xyzzy',
      output: {
        key: 'a',
        value: 'b',
        httpOnly: true
      }
    },
    {
      input: '\x08',
      output: undefined
    },
    {
      input: 'a=b; domain=kyoto.jp',
      output: {
        key: 'a',
        value: 'b',
        domain: 'kyoto.jp'
      },
    },
    {
      input: 'a=b; domain=foonet.net',
      output: {
        key: 'a',
        value: 'b',
        domain: 'foonet.net'
      },
    },
    {
      input: 'a=b; domain=www.foonet.net',
      output: {
        key: 'a',
        value: 'b',
        domain: 'www.foonet.net'
      },
    },
    {
      input: 'a=b; domain=.foonet.net',
      output: {
        key: 'a',
        value: 'b',
        domain: 'foonet.net'
      },
    },
    {
      input: 'GAPS=1:A1aaaaAaAAa1aaAaAaaAAAaaa1a11a:aaaAaAaAa-aaaA1-;Path=/;Expires=Thu, 17-Apr-2014 02:12:29 GMT;Secure;HttpOnly',
      output: {
        key: 'GAPS',
        value: '1:A1aaaaAaAAa1aaAaAaaAAAaaa1a11a:aaaAaAaAa-aaaA1-',
        path: '/',
        expires: new Date(Date.parse('Thu, 17-Apr-2014 02:12:29 GMT')),
        secure: true,
        httpOnly: true
      },
    },
    {
      input: 'queryPref=b=c&d=e; Path=/f=g; Expires=Thu, 17 Apr 2014 02:12:29 GMT; HttpOnly',
      output: {
        key: 'queryPref',
        value: 'b=c&d=e',
        path: '/f=g',
        expires: new Date(Date.parse('Thu, 17 Apr 2014 02:12:29 GMT')),
        httpOnly: true
      },
    },
    {
      input: 'a=one two three',
      output: {
        key: 'a',
        value: 'one two three',
        path: null,
        domain: null,
        extensions: null
      },
    },
    {
      input: 'a="one two three"',
      output: {
        key: 'a',
        value: '"one two three"',
        path: null,
        domain: null,
        extensions: null
      },
    },
    {
      input: 'farbe=weiß',
      output: {
        key: 'farbe',
        value: 'weiß',
        path: null,
        domain: null,
        extensions: null
      },
    },
    {
      input: '=abc',
      output: {
        key: '',
        value: 'abc',
        path: null,
        domain: null,
        extensions: null
      },
      parseOptions: { loose: true }
    },
    {
      input: 'abc',
      output: {
        key: '',
        value: 'abc',
        path: null,
        domain: null,
        extensions: null
      },
      parseOptions: { loose: true }
    },
    {
      input: '=foo=bar',
      output: {
        key: 'foo',
        value: 'bar',
        path: null,
        domain: null,
        extensions: null
      },
      parseOptions: { loose: true }
    },
    {
      input: `foo=bar${";".repeat(65535)} domain=example.com`,
      output: {
        key: 'foo',
        value: 'bar',
        path: null,
        domain: 'example.com',
        extensions: null
      }
    },
    {
      input: `x x`,
      output: undefined
    },
    {
      input: `x${" ".repeat(65535)}x`,
      output: undefined
    },
    {
      input: `abc=xyzzy; SameSite=Lax`,
      output: {
        key: 'abc',
        value: 'xyzzy',
        sameSite: 'lax',
        extensions: null
      }
    },
    {
      input: `abc=xyzzy; SameSite=StRiCt`,
      output: {
        key: 'abc',
        value: 'xyzzy',
        sameSite: 'strict',
        extensions: null
      }
    },
    {
      input: `abc=xyzzy; SameSite=example.com`,
      output: {
        key: 'abc',
        value: 'xyzzy',
        sameSite: 'none',
        extensions: null
      }
    },
    {
      input: ``,
      output: null
    },
    {
      input: undefined,
      output: null
    },
    {
      input: new String(''),
      output: null
    },
    {
      input: new String(),
      output: null
    }
  ])('Cookie.parse("$input")', ({input, output, parseOptions = {}}) => {
    const value = input === undefined ? undefined : input.valueOf()
    // @ts-ignore
    const cookie = Cookie.parse(value, parseOptions)
    if (output !== undefined) {
      expect(cookie).toEqual(expect.objectContaining(output))
    } else {
      expect(cookie).toBe(output)
    }
  })

  it.each([
    {
      shortVersion: 'x x',
      longVersion: `x${" ".repeat(65535)}x`,
    },
    {
      shortVersion: 'x x',
      longVersion: `x${" ".repeat(65535)}x`,
      parseOptions: { loose: true }
    },
    {
      shortVersion: 'x =x',
      longVersion: `x${" ".repeat(65535)}=x`
    },
    {
      shortVersion: 'x =x',
      longVersion: `x${" ".repeat(65535)}=x`,
      parseOptions: { loose: true }
    },
  ])('Cookie.parse("$shortVersion") should not take significantly longer to run than Cookie.parse("$longVersion")', ({ shortVersion, longVersion , parseOptions = {}}) => {
    const startShortVersionParse = performance.now()
    Cookie.parse(shortVersion, parseOptions)
    const endShortVersionParse = performance.now()

    const startLongVersionParse = performance.now()
    Cookie.parse(longVersion, parseOptions)
    const endLongVersionParse = performance.now()

    const ratio = (endLongVersionParse - startLongVersionParse) / (endShortVersionParse - startShortVersionParse)
    expect(ratio).toBeLessThan(250) // if broken this ratio goes 2000-4000x higher
  })
})


it('should parse a long cookie string with spaces in roughly the same amount of time as one with short spaces', () => {
  const longCookie = `x${" ".repeat(65535)}x`
  const shortCookie = `x x`

  const startLongCookieParse = performance.now()
  Cookie.parse(longCookie)
  const endLongCookieParse = performance.now()

  const startShortCookieParse = performance.now()
  Cookie.parse(shortCookie)
  const endShortCookieParse = performance.now()

  const ratio = (endLongCookieParse - startLongCookieParse) / (endShortCookieParse - startShortCookieParse)
  expect(ratio).toBeLessThan(250) // if broken this ratio goes 2000-4000x higher
})
