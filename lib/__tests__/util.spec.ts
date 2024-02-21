import { safeToString } from '../utils'

describe('safeToString', () => {
  const basic = [
    undefined,
    null,
    true,
    'string',
    123,
    321n,
    { object: 'yes' },
    [1, 'hello', true, null],
    (a: number, b: number) => a + b,
    Symbol('safeToString'),
  ]
  const testCases = [
    ...basic.map((input) => [input, String(input)]),
    [Object.create(null), '[object Object]'],
    [
      [Object.create(null), Symbol('safeToString')],
      '[object Object],Symbol(safeToString)',
    ],
  ]

  it.each(testCases)('works on %s', (input, output) => {
    expect(safeToString(input)).toBe(String(output))
  })
})
