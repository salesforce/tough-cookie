import { describe, expect, it } from 'vitest'
import { version } from '../version.js'

describe('version file', () => {
  it('should have a valid semver version', () => {
    expect(typeof version).toBe('string')
    expect(version).toMatch(/^\d+?\.\d+?\.\d+?(?:-[\w.]+?)?$/)
  })
})
