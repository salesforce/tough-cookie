// Shared between the CookiePath.defaultPath spec and the deprecated
// `defaultPath` wrapper spec so both are verified against the same corpus.
export const defaultPathCases = [
  { input: null, expected: '/' },
  { input: '/', expected: '/' },
  { input: '/file', expected: '/' },
  { input: '/dir/file', expected: '/dir' },
  { input: 'noslash', expected: '/' },
] as const
