import { describe, expect, it } from 'vitest'
import { pathMatch } from '../pathMatch.js'
import { pathMatchCases } from './data/pathMatchCases.js'

describe('pathMatch', () => {
  it.each(pathMatchCases)(
    'pathMatch("%s", "%s") => %s',
    (requestPath, cookiePath, expectedValue) => {
      expect(pathMatch(requestPath, cookiePath)).toBe(expectedValue)
    },
  )

  // LEGACY BEHAVIOR — DO NOT EXTEND.
  // These cases pin pre-deprecation behavior for non-RFC-compliant inputs
  // (paths not starting with "/"). RFC 6265 cookie-paths always start with "/",
  // so these inputs are out of spec, but earlier versions still prefix-matched
  // them and direct callers may rely on it. pathMatch is deprecated; once it is
  // removed these tests should be deleted along with the fallback they cover.
  describe('non-RFC-compliant input fallback (legacy, pending removal)', () => {
    it('returns true when both invalid inputs are equal', () => {
      expect(pathMatch('foo', 'foo')).toBe(true)
    })

    it('returns false when invalid inputs differ', () => {
      expect(pathMatch('foo', 'bar')).toBe(false)
    })

    it('returns false when only reqPath is invalid', () => {
      expect(pathMatch('foo', '/bar')).toBe(false)
    })

    it('returns false when only cookiePath is invalid', () => {
      expect(pathMatch('/foo', 'bar')).toBe(false)
    })

    it('matches when the invalid cookiePath is a prefix ending in "/"', () => {
      expect(pathMatch('foo/bar', 'foo/')).toBe(true)
    })

    it('matches when the invalid cookiePath is a prefix at a "/" boundary', () => {
      expect(pathMatch('foo/bar', 'foo')).toBe(true)
    })

    it('does not match when the invalid prefix is not at a "/" boundary', () => {
      expect(pathMatch('foobar', 'foo')).toBe(false)
    })
  })
})
