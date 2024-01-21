import { alt, map, opt, range, repeat, seq } from './3.0-operators'
import { expectRuleSpec } from './expect-rule.spec'

describe('seq', () => {
  it('should work with exact', () => {
    const rule = seq(['a', 'b', 'c'])
    expectRuleSpec(rule, 'abc').ok({
      remaining: '',
      result: ['a', 'b', 'c'],
    })
  })

  it('should work if starts with', () => {
    const rule = seq(['a', 'b', 'c'])
    expectRuleSpec(rule, 'abcdef').ok({
      remaining: 'def',
      result: ['a', 'b', 'c'],
    })
  })

  it('should fail if too short', () => {
    const rule = seq(['a', 'b', 'c'])
    expectRuleSpec(rule, 'ab').fail({
      remaining: 'ab',
    })
  })

  it('should fail if not a match', () => {
    const rule = seq(['a', 'b', 'c'])
    expectRuleSpec(rule, 'acbd').fail({
      remaining: 'acbd',
    })
  })
})

describe('alt', () => {
  it('should work with first', () => {
    const rule = alt(['a', 'b', 'c'])
    expectRuleSpec(rule, 'abc').ok({
      remaining: 'bc',
      result: 'a',
    })
  })

  it('should work with second', () => {
    const rule = alt(['a', 'b', 'c'])
    expectRuleSpec(rule, 'bca').ok({
      remaining: 'ca',
      result: 'b',
    })
  })

  it('should work with third', () => {
    const rule = alt(['a', 'b', 'c'])
    expectRuleSpec(rule, 'cab').ok({
      remaining: 'ab',
      result: 'c',
    })
  })

  it('should not work if no match', () => {
    const rule = alt(['a', 'b', 'c'])
    expectRuleSpec(rule, 'def').fail({
      remaining: 'def',
    })
  })
})

describe('range', () => {
  it('should not match outside the lower boundary of the range', () => {
    const rule = range('%x62-64') // (b-d)
    expectRuleSpec(rule, 'a').fail({
      remaining: 'a',
    })
  })

  it('should match the lower boundary of the range', () => {
    const rule = range('%x62-64') // (b-d)
    expectRuleSpec(rule, 'b').ok({
      remaining: '',
      result: 'b',
    })
  })

  it('should match the boundaries of the range', () => {
    const rule = range('%x62-64') // (b-d)
    expectRuleSpec(rule, 'c').ok({
      remaining: '',
      result: 'c',
    })
  })

  it('should match the upper boundary of the range', () => {
    const rule = range('%x62-64') // (b-d)
    expectRuleSpec(rule, 'd').ok({
      remaining: '',
      result: 'd',
    })
  })

  it('should not match outside the upper boundary of the range', () => {
    const rule = range('%x62-64') // (b-d)
    expectRuleSpec(rule, 'e').fail({
      remaining: 'e',
    })
  })
})

describe('repeat', () => {
  it('should work with a min match', () => {
    const rule = repeat('3*4', 'a')
    expectRuleSpec(rule, 'aaab').ok({
      remaining: 'b',
      result: ['a', 'a', 'a'],
    })
  })

  it('should work with max match', () => {
    const rule = repeat('3*4', 'a')
    expectRuleSpec(rule, 'aaaaa').ok({
      remaining: 'a',
      result: ['a', 'a', 'a', 'a'],
    })
  })

  it('should fail if less than the min', () => {
    const rule = repeat(2, 'a')
    expectRuleSpec(rule, 'a').fail({
      remaining: 'a',
    })
  })

  it('should work if unbounded', () => {
    const rule = repeat('*', 'a')
    expectRuleSpec(rule, 'aaaaab').ok({
      remaining: 'b',
      result: ['a', 'a', 'a', 'a', 'a'],
    })
  })
})

describe('opt', () => {
  it('should work if value is present', () => {
    const rule = opt(' ')
    expectRuleSpec(rule, ' hi').ok({
      remaining: 'hi',
      result: ' ',
    })
  })

  it('should work if no value is present', () => {
    const rule = opt(' ')
    expectRuleSpec(rule, 'hi').ok({
      remaining: 'hi',
      result: undefined,
    })
  })
})

describe('map', () => {
  it('should map some values', () => {
    const rule = map(seq(['a', 'b']), ([a, b]) => {
      return { a, b }
    })
    expectRuleSpec(rule, 'ab').ok({
      remaining: '',
      result: { a: 'a', b: 'b' },
    })
  })

  it('should fail to map some values', () => {
    const rule = map(seq(['a', 'b']), ([a, b]) => {
      return { a, b }
    })
    expectRuleSpec(rule, 'cd').fail({
      remaining: 'cd',
    })
  })

  it('should map different types of values', () => {
    const rule = map(
      seq([map(seq(['a']), () => 0), map(seq(['b']), () => 'a')]),
      ([a, b]) => {
        return `${a}${b}`
      },
    )
    expectRuleSpec(rule, 'abcd').ok({
      remaining: 'cd',
      result: '0a',
    })
  })
})
