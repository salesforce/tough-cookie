export type Rule<T> = (input: string) => RuleMatch<T>

export type RuleMatch<T> = RuleMatchOk<T> | RuleMatchFail

export type RuleMatchOk<T> = {
  type: 'ok'
  remaining: string
  result: T
}

export type RuleMatchFail = {
  type: 'fail'
  remaining: string
}

export function ruleMatchOk<T>(remaining: string, result: T): RuleMatchOk<T> {
  return {
    type: 'ok',
    remaining,
    result,
  }
}

export function ruleMatchFail(remaining: string): RuleMatchFail {
  return {
    type: 'fail',
    remaining,
  }
}

// 2.3
export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
export type HexDigit = Digit | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export type Terminal = string | HexTerminal
export type HexTerminal = `%x${HexDigit}${HexDigit}`

function terminalToRegExp(value: Terminal): RegExp {
  if (value.startsWith('%x')) {
    return new RegExp(`^(${value.replace('%x', '\\x')})`)
  }
  return new RegExp(`^(${value})`, 'i')
}

export function terminal(value: Terminal): Rule<string> {
  const matcher = terminalToRegExp(value)
  return (input) => {
    const match = matcher.exec(input)
    if (match) {
      const result = match[1]
      if (result) {
        return ruleMatchOk(
          input.substring(result.length),
          input.substring(0, result.length),
        )
      }
    }
    return ruleMatchFail(input)
  }
}
