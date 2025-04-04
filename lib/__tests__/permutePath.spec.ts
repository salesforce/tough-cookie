import { describe, expect, it } from 'vitest'
import { permutePath } from '../cookie/permutePath.js'
import { pathMatch } from '../pathMatch.js'

describe('permutePath', () => {
  it.each([
    {
      path: '/',
      permutations: ['/'],
    },
    {
      path: '/foo',
      permutations: ['/foo', '/'],
    },
    {
      path: '/foo/bar',
      permutations: ['/foo/bar', '/foo', '/'],
    },
    {
      path: '/foo/bar/',
      permutations: ['/foo/bar/', '/foo/bar', '/foo', '/'],
    },
  ])('permuteDomain("%s", %s") => %o', ({ path, permutations }) => {
    expect(permutePath(path)).toEqual(permutations)
    permutations.forEach((permutation) => {
      expect(pathMatch(path, permutation)).toBe(true)
    })
  })
})
