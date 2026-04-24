export const defaultPathCases = [
  { input: null, expected: '/' },
  { input: '/', expected: '/' },
  { input: '/file', expected: '/' },
  { input: '/dir/file', expected: '/dir' },
  { input: 'noslash', expected: '/' },
] as const
