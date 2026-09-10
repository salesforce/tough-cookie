/* eslint-disable @typescript-eslint/no-deprecated */
import { describe, expect, it } from 'vitest'
import { permutePath } from '../cookie/permutePath.js'
import { pathMatch } from '../pathMatch.js'
import { permutePathCases } from './data/permutePathCases.js'

describe('permutePath', () => {
  it.each(permutePathCases)(
    'permutePath("$path") => $permutations',
    ({ path, permutations }) => {
      expect(permutePath(path)).toEqual([...permutations])
      permutations.forEach((permutation) => {
        expect(pathMatch(path, permutation)).toBe(true)
      })
    },
  )

  // LEGACY BEHAVIOR — DO NOT EXTEND.
  // RFC 6265 cookie-paths always start with "/", so a path without a leading
  // "/" is out of spec. Earlier versions still peeled it down character by
  // character, and direct callers may rely on it. permutePath is deprecated;
  // once it is removed this test should be deleted along with the fallback.
  it('preserves legacy behavior for non-RFC-compliant input (pending removal)', () => {
    expect(permutePath('noslash')).toEqual([
      'noslash',
      'noslas',
      'nosla',
      'nosl',
      'nos',
      'no',
      'n',
      '/',
    ])
  })
})
