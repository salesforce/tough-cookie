import { pathMatch, permutePath } from '../cookie'

// port of tests/domain_and_path_test.js (permute path tests)
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
