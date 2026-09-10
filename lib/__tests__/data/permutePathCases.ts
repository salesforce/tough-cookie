// Shared between the CookiePath.permute spec and the deprecated
// `permutePath` wrapper spec so both are verified against the same corpus.
export const permutePathCases = [
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
] as const
