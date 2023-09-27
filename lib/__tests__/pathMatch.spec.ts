import { pathMatch } from '../pathMatch'

// port of tests/domain_and_path_test.js (path match tests)
describe('pathMatch', () => {
  it.each([
    // request, cookie, match
    ['/', '/', true],
    ['/dir', '/', true],
    ['/', '/dir', false],
    ['/dir/', '/dir/', true],
    ['/dir/file', '/dir/', true],
    ['/dir/file', '/dir', true],
    ['/directory', '/dir', false],
  ])(
    'pathMatch("%s", "%s") => %s',
    (requestPath, cookiePath, expectedValue) => {
      expect(pathMatch(requestPath, cookiePath)).toBe(expectedValue)
    },
  )
})
