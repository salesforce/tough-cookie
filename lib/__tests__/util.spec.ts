import { safeToString } from '../utils'

describe('safeToString', () => {
  const recursiveArray: unknown[] = [1]
  recursiveArray.push([[recursiveArray], 2, [[recursiveArray]]], 3)
  const testCases = [
    [undefined, 'undefined'],
    [null, 'null'],
    [true, 'true'],
    ['string', 'string'],
    [123, '123'],
    [321n, '321'],
    [{ object: 'yes' }, '[object Object]'],
    [(a: number, b: number): number => a + b, '(a, b) => a + b'],
    [Symbol('safeToString'), 'Symbol(safeToString)'],
    [Object.create(null), '[object Object]'],
    // eslint-disable-next-line no-sparse-arrays
    [[1, 'hello', , undefined, , true, null], '1,hello,,,,true,'],
    [
      [Object.create(null), Symbol('safeToString')],
      '[object Object],Symbol(safeToString)',
    ],
    [recursiveArray, '1,,2,,3'],
  ]

  it.each(testCases)('works on %s', (input, output) => {
    expect(safeToString(input)).toBe(String(output))
  })
})
