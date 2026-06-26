// Shared between the CookiePath.match spec and the deprecated `pathMatch`
// wrapper spec so both are verified against the same corpus.
export const pathMatchCases: [string, string, boolean][] = [
  // [requestPath, cookiePath, expectedMatch]
  ['/', '/', true],
  ['/dir', '/dir', true],
  ['/dir', '/', true],
  ['/', '/dir', false],
  ['/dir/', '/dir/', true],
  ['/dir/file', '/dir/', true],
  ['/dir/file', '/dir', true],
  ['/directory', '/dir', false],
]
