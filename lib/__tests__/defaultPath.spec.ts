import { defaultPath } from '../cookie/defaultPath'

// port of tests/domain_and_path_test.js (default path tests)
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
