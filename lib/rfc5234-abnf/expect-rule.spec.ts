import type { Rule } from './2.0-rule-definition'

type ExpectedOkResult<T> = {
  remaining: string | Uint8Array
  result: T
}

type ExpectedFailResult = {
  remaining: string | Uint8Array
  reason?: string
}

export function expectRuleSpec<T>(rule: Rule<T>, input: string) {
  const ruleMatch = rule(input)
  return {
    ok(expectedValue: ExpectedOkResult<T>) {
      const okType = 'ok'
      if (ruleMatch.type === okType) {
        expect(ruleMatch.remaining).toEqual(expectedValue.remaining)
        expect(ruleMatch.result).toEqual(expectedValue.result)
      } else {
        expect(ruleMatch.type).toBe(okType)
      }
    },
    fail(expectedValue: ExpectedFailResult) {
      const failType = 'fail'
      if (ruleMatch.type === failType) {
        expect(ruleMatch.remaining).toEqual(expectedValue.remaining)
      } else {
        expect(ruleMatch.type).toBe(failType)
      }
    },
  }
}
