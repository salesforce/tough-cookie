/* eslint-disable @typescript-eslint/no-deprecated */
import { describe, expect, it } from 'vitest'
import { defaultPath } from '../cookie/defaultPath.js'
import { defaultPathCases } from './data/defaultPathCases.js'

describe('defaultPath', () => {
  it.each([...defaultPathCases])(
    'defaultPath("$input") => $expected',
    ({ input, expected }) => {
      expect(defaultPath(input)).toBe(expected)
    },
  )
})
