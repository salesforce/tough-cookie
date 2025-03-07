import { describe, expect, it } from 'vitest'
import { defaultPath } from '../cookie/defaultPath.js'

describe('defaultPath', () => {
  it.each([
    {
      input: null,
      output: '/',
    },
    {
      input: '/',
      output: '/',
    },
    {
      input: '/file',
      output: '/',
    },
    {
      input: '/dir/file',
      output: '/dir',
    },
    {
      input: 'noslash',
      output: '/',
    },
  ])('defaultPath("$input") => $output', ({ input, output }) => {
    expect(defaultPath(input)).toBe(output)
  })
})
