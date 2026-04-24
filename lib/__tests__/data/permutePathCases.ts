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
