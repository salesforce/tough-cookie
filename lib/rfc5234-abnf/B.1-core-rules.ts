// A-Z / a-z
import { alt, map, range, repeat, rule, seq } from './3.0-operators'

export const ALPHA = rule(() =>
  alt([
    '%x41-5A', // A-Z
    '%x61-7A', // a-z
  ]),
)

export const BIT = rule(() => alt(['0', '1']))

// any 7-bit US-ASCII character, excluding NUL
export const CHAR = rule(() => '%x01-7F')

// carriage return
export const CR = rule(() => '%x0D')

// Internet standard newline
export const CRLF = rule(() => map(seq([CR, LF]), (values) => values.join('')))

// controls
export const CTL = rule(() => alt([range('%x00-1F'), '%x7F']))

// 0-9
export const DIGIT = rule(() => range('%x30-39'))

// " (Double Quote)
export const DQUOTE = rule(() => '%x22')

export const HEXDIG = rule(() => alt([DIGIT, 'A', 'B', 'C', 'D', 'E', 'F']))

// horizontal tab
export const HTAB = rule(() => '%x09')

// linefeed
export const LF = rule(() => '%x0A')

// Use of this linear-white-space rule permits lines containing only white space that are no longer legal in
// mail headers and have caused interoperability problems in other contexts.
//
// Do not use when defining mail headers and use with caution in other contexts.
export const LWSP = rule(() =>
  map(
    repeat(
      '*',
      alt([
        WSP,
        // this sequence needs to be combined into a single buffer to represent this rule
        map(seq([CRLF, WSP]), (values) => values.join('')),
      ]),
    ),
    (values) => values.join(''),
  ),
)

// 8 bits of data
export const OCTET = rule(() => range('%x00-FF'))

export const SP = rule(() => '%x20')

// visible (printing) characters
export const VCHAR = rule(() => range('%x21-7E'))

// white space
export const WSP = rule(() => alt([SP, HTAB]))
