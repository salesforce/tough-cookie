import { inspect } from 'node:util'
import { Cookie } from '../cookie/cookie'

describe('Cookie utils', () => {
  describe('custom inspect', () => {
    it('should be a readable string', () => {
      const cookie = new Cookie({
        key: 'test',
        value: 'b',
        maxAge: 60,
      })
      expect(inspect(cookie)).toBe(
        'Cookie="test=b; Max-Age=60; hostOnly=?; aAge=?; cAge=0ms"',
      )
    })
  })
})
