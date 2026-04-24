import { describe, expect, it } from 'vitest'
import { CookiePath } from '../cookie/cookiePath.js'
import { defaultPathCases } from './data/defaultPathCases.js'

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

  describe('parentPath', () => {
    it.each([
      { input: '/foo/bar/baz', expected: '/foo/bar' },
      { input: '/foo/bar', expected: '/foo' },
      { input: '/foo/bar/', expected: '/foo/bar' },
      { input: '/foo', expected: '/' },
    ])(
      'parentPath of "$input" is "$expected"',
      ({ input, expected }) => {
        expect(CookiePath.parentPath(CookiePath.parse(input)!)).toBe(expected)
      },
    )

    it('returns undefined for ROOT', () => {
      expect(CookiePath.parentPath(CookiePath.ROOT)).toBeUndefined()
    })
  })

  describe('defaultPath', () => {
    it.each([...defaultPathCases])(
      'defaultPath($input) => "$expected"',
      ({ input, expected }) => {
        expect(CookiePath.defaultPath(input)).toBe(expected)
      },
    )
  })
})
