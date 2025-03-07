import { describe, expect, it } from 'vitest'
import { pathMatch } from '../pathMatch.js'

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
