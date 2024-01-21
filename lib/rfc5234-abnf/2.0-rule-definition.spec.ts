import { terminal } from './2.0-rule-definition'
import { expectRuleSpec } from './expect-rule.spec'

it('should be able to match text', () => {
  const rule = terminal('dog')
  expectRuleSpec(rule, 'dog').ok({
    remaining: '',
    result: 'dog',
  })
})

it('should be able to match text (case-insensitive', () => {
  const rule = terminal('DoG')
  expectRuleSpec(rule, 'dog').ok({
    remaining: '',
    result: 'dog',
  })
})

it('should not be able to match text', () => {
  const rule = terminal('cat')
  expectRuleSpec(rule, 'dog').fail({
    remaining: 'dog',
  })
})

it('should be able to match a numeric character', () => {
  const rule = terminal('%x0A')
  expectRuleSpec(rule, '\nhi').ok({
    remaining: 'hi',
    result: '\n',
  })
})

it('should not be able to match a terminal', () => {
  const rule = terminal('%x0A')
  expectRuleSpec(rule, 'hi').fail({
    remaining: 'hi',
  })
})
