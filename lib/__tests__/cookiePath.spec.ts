import { describe, expect, it } from 'vitest'
import { CookiePath } from '../cookie/cookiePath.js'

describe('CookiePath', () => {
  describe('ROOT', () => {
    it('equals "/"', () => {
      expect(CookiePath.ROOT).toBe('/')
    })
  })

  describe('parse', () => {
    it.each([
      { input: '/', expected: '/' },
      { input: '/foo', expected: '/foo' },
      { input: '/foo/bar', expected: '/foo/bar' },
      { input: '/foo/bar/', expected: '/foo/bar/' },
    ])('returns CookiePath for valid input "$input"', ({ input, expected }) => {
      expect(CookiePath.parse(input)).toBe(expected)
    })

    it.each([
      { input: '', description: 'empty string' },
      { input: 'foo', description: 'no leading slash' },
      { input: 'bar/baz', description: 'relative path' },
    ])('returns undefined for $description', ({ input }) => {
      expect(CookiePath.parse(input)).toBeUndefined()
    })
  })
})
