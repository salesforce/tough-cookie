import {defaultPath} from "../cookie";

describe('defaultPath', () => {
  it.each([
    {
      input: null,
      output: '/'
    },
    {
      input: '/',
      output: '/'
    },
    {
      input: '/file',
      output: '/'
    },
    {
      input: '/dir/file',
      output: '/dir'
    },
    {
      input: 'noslash',
      output: '/'
    },
  ])('defaultPath("$input") => $output', ({ input, output }) => {
    // @ts-ignore
    expect(defaultPath(input)).toBe(output)
  })
})
