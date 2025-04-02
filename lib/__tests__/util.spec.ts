import { describe, expect, it } from 'vitest'
import { safeToString } from '../utils.js'

describe('safeToString', () => {
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
  ]

  it.each(testCases)('works on %s', (input, output) => {
    expect(safeToString(input)).toBe(String(output))
  })

  it('works on recursive array', () => {
    const recursiveArray: unknown[] = [1]
    recursiveArray.push([[recursiveArray], 2, [[recursiveArray]]], 3)
    expect(safeToString(recursiveArray)).toBe('1,,2,,3')
  })
})
