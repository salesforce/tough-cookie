import { version } from '../version'

describe('version file', () => {
  it('should have a valid semver version', () => {
    expect(typeof version).toBe('string')
    expect(version).toMatch(/^\d+?\.\d+?\.\d+?(?:-[\w.]+?)?$/)
  })
})
