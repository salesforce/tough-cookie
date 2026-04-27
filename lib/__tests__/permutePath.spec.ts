/* eslint-disable @typescript-eslint/no-deprecated */
import { describe, expect, it } from 'vitest'
import { permutePath } from '../cookie/permutePath.js'
import { pathMatch } from '../pathMatch.js'
import { permutePathCases } from './data/permutePathCases.js'

describe('permutePath', () => {
  it.each([...permutePathCases])(
    'permutePath("$path") => $permutations',
    ({ path, permutations }) => {
      expect(permutePath(path)).toEqual([...permutations])
      permutations.forEach((permutation) => {
        expect(pathMatch(path, permutation)).toBe(true)
      })
    },
  )

  it('returns ["/"] for invalid input', () => {
    expect(permutePath('noslash')).toEqual(['/'])
  })
})
