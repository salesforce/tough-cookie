// 3.1. Concatenation:  Rule1 Rule2
import type { Digit, HexDigit, HexTerminal, Rule } from './2.0-rule-definition'
import { ruleMatchFail, ruleMatchOk, terminal } from './2.0-rule-definition'

type SeqRules = readonly (Rule<unknown> | string | HexTerminal | HexRange)[]

type SeqValues<T> = T extends [infer headType, ...infer tailType]
  ? [RuleOutput<headType>, ...SeqValues<tailType>]
  : []

export function seq<T extends SeqRules | []>(rules: T): Rule<SeqValues<T>> {
  const seqRules = rules.map(convertToRule)
  return (input) => {
    const originalInput = input
    const results = []
    for (const rule of seqRules) {
      const ruleMatch = rule(input)
      input = ruleMatch.remaining
      switch (ruleMatch.type) {
        case 'ok':
          results.push(ruleMatch.result)
          break
        case 'fail':
          return ruleMatchFail(originalInput)
      }
    }
    return ruleMatchOk(input, results as SeqValues<T>)
  }
}

type AltRules = readonly (Rule<unknown> | string | HexTerminal | HexRange)[]

type AltValue<T> = T extends [infer headType, ...infer tailType]
  ? RuleOutput<headType> | AltValue<tailType>
  : never

// 3.2.  Alternatives:  Rule1 / Rule2
export function alt<T extends AltRules | []>(rules: T): Rule<AltValue<T>> {
  const altRules = rules.map(convertToRule)
  return (input) => {
    for (const rule of altRules) {
      const ruleMatch = rule(input)
      if (ruleMatch.type === 'ok') {
        return ruleMatch as AltValue<T>
      }
    }
    return ruleMatchFail(input)
  }
}

// 3.4.  Value Range Alternatives:  %c##-##
export type HexRange = `${HexTerminal}-${HexDigit}${HexDigit}`

function isHexRange(value: string): value is HexRange {
  return /^%x[0-9a-fA-F]{2}-[0-9a-fA-F]{2}$/.test(value)
}

export function range(value: HexRange): Rule<string> {
  const rangeAsRegExp = value.replace('%x', '\\x').replace('-', '-\\x')
  const matcher = new RegExp(`^([${rangeAsRegExp}])`)
  return (input) => {
    const match = matcher.exec(input)
    if (match && match[1]) {
      return ruleMatchOk(input.substring(match[1].length), match[1])
    }
    return ruleMatchFail(input)
  }
}

export type VariableRepetition =
  | `*`
  | `*${Digit}`
  | `${Digit}*`
  | `${Digit}*${Digit}`

function repetitionToRange(
  repetition: number | VariableRepetition,
): [number, number] {
  if (typeof repetition === 'number') {
    return [repetition, repetition]
  } else {
    const variableMatch = /^(\d*)\*(\d*)$/.exec(repetition)
    if (variableMatch) {
      const min = variableMatch[1] ? parseInt(variableMatch[1], 10) : 0
      const max = variableMatch[2]
        ? parseInt(variableMatch[2], 10)
        : Number.MAX_SAFE_INTEGER
      return [min, max]
    }
  }
  throw new Error('unreachable')
}

// 3.6.  Variable Repetition:  *Rule
export function repeat<
  T extends Rule<unknown> | string | HexTerminal | HexRange,
  U extends RuleOutput<T>,
>(repetition: number | VariableRepetition, rule: T): Rule<U[]> {
  const [min, max] = repetitionToRange(repetition)
  const repeatRule = convertToRule(rule)
  return (input) => {
    const originalInput = input
    const results: U[] = []
    let loop = true
    while (loop && results.length <= max) {
      if (input.length === 0) {
        loop = false
        continue
      }
      const matchResult = repeatRule(input)
      input = matchResult.remaining
      switch (matchResult.type) {
        case 'ok':
          results.push(matchResult.result as U)
          break
        case 'fail':
          loop = false
          break
      }
    }
    if (results.length >= min && results.length <= max) {
      return ruleMatchOk(input, results)
    }
    return ruleMatchFail(originalInput)
  }
}

// 3.8.  Optional Sequence:  [RULE]
export function opt<
  T extends Rule<unknown> | string | HexTerminal | HexRange,
  U extends RuleOutput<T>,
>(rule: T): Rule<U | undefined> {
  const optionalRepeat = repeat('0*1', rule)
  return (input) => {
    const matchResult = optionalRepeat(input)
    switch (matchResult.type) {
      case 'ok':
        return ruleMatchOk(
          matchResult.remaining,
          matchResult.result[0] as U | undefined,
        )
      case 'fail':
        return matchResult
    }
  }
}

export function map<T, U>(rule: Rule<T>, mapFn: (result: T) => U): Rule<U> {
  return (input) => {
    const matchResult = rule(input)
    switch (matchResult.type) {
      case 'ok':
        return ruleMatchOk(matchResult.remaining, mapFn(matchResult.result))
      case 'fail':
        return matchResult
    }
  }
}

type RuleOutput<T> = T extends Rule<infer outputType>
  ? outputType
  : T extends string
  ? string
  : never

// this is just a helper for defining rules lazily
export function rule<
  T extends Rule<unknown> | string | HexTerminal | HexRange,
  U extends RuleOutput<T>,
>(definition: () => T): Rule<U> {
  let evaluatedRule: Rule<U>
  return (input) => {
    const definitionResult = definition()
    if (typeof definitionResult === 'string') {
      if (/%x[0-9a-fA-F]{2}-[0-9a-fA-F]{2}/.test(definitionResult)) {
        evaluatedRule = range(definitionResult as HexRange) as Rule<U>
      } else {
        evaluatedRule = terminal(definitionResult) as Rule<U>
      }
    } else {
      evaluatedRule = definitionResult as Rule<U>
    }
    return evaluatedRule(input)
  }
}

function convertToRule<
  T extends Rule<unknown> | string | HexTerminal | HexRange,
  U extends RuleOutput<T>,
>(value: T): Rule<U> {
  if (typeof value === 'string') {
    return (isHexRange(value) ? range(value) : terminal(value)) as Rule<U>
  }
  return value as Rule<U>
}
