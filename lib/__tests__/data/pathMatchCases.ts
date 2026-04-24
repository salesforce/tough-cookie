export const pathMatchCases: [string, string, boolean][] = [
  // [requestPath, cookiePath, expectedMatch]
  ['/', '/', true],
  ['/dir', '/', true],
  ['/', '/dir', false],
  ['/dir/', '/dir/', true],
  ['/dir/file', '/dir/', true],
  ['/dir/file', '/dir', true],
  ['/directory', '/dir', false],
]
