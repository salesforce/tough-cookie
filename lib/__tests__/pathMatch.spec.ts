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

  describe('invalid input fallback', () => {
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
  })
})
