import { describe, expect, it } from 'vitest'
import { safeToString } from '../utils.js'

describe('safeToString', () => {
  const recursiveArray: unknown[] = [1]
  recursiveArray.push([[recursiveArray], 2, [[recursiveArray]]], 3)

  const testCases = [
    ['undefined', undefined, 'undefined'],
    ['null', null, 'null'],
    ['boolean', true, 'true'],
    ['string', 'string', 'string'],
    ['number', 123, '123'],
    ['bigint', 321n, '321'],
    ['object', { object: 'yes' }, '[object Object]'],
    ['function', (a: number, b: number): number => a + b, '(a, b) => a + b'],
    ['symbol', Symbol('safeToString'), 'Symbol(safeToString)'],
    ['null object', Object.create(null), '[object Object]'],
    [
      'array with primitives',
      // eslint-disable-next-line no-sparse-arrays
      [1, 'hello', , undefined, , true, null],
      '1,hello,,,,true,',
    ],
    [
      'array with object/symbol',
      [Object.create(null), Symbol('safeToString')],
      '[object Object],Symbol(safeToString)',
    ],
    ['recursive array', recursiveArray, '1,,2,,3'],
  ]

  it.each(testCases)('works on %s', (_label, input, output) => {
    expect(safeToString(input)).toBe(output)
  })
})
