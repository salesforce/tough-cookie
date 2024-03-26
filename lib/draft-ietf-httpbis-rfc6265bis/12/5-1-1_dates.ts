import {
  alt,
  map,
  opt,
  repeat,
  rule,
  seq,
} from '../../rfc5234-abnf/3.0-operators'
import { ALPHA, DIGIT, OCTET } from '../../rfc5234-abnf/B.1-core-rules'

export type CookieDate = {
  readonly type: unique symbol,
  value: Date
}

// @spec #section-5.1.1-1
type Flags = {
  foundTime: undefined | { hours: number; minutes: number; seconds: number }
  foundDayOfMonth: undefined | number
  foundMonth: undefined | number
  foundYear: undefined | number
}

const months = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]

// TODO: move this value to section 5.5 since that's where this is sourced from
const MAX_SET_COOKIE_HEADER_LENGTH = 4096

// cookie-date     = *delimiter date-token-list *delimiter
// @spec #section-5.1.1-2.1.2
const cookie_date = rule(() =>
  seq([repeat('*', delimiter), date_token_list, repeat('*', delimiter)]),
)

// date-token-list = date-token *( 1*delimiter date-token )
const date_token_list = rule(() =>
  seq([date_token, repeat('*', seq([repeat('1*', delimiter), date_token]))]),
)

// date-token      = 1*non-delimiter
const date_token = rule(() =>
  map(repeat('1*', non_delimiter), (v) => v.join('')),
)

// delimiter       = %x09 / %x20-2F / %x3B-40 / %x5B-60 / %x7B-7E
const delimiter = rule(() =>
  alt(['%x09', '%x20-2F', '%x3B-40', '%x5B-60', '%x7B-7E']),
)

// non-delimiter   = %x00-08 / %x0A-1F / DIGIT / ":" / ALPHA / %x7F-FF
const non_delimiter = rule(() =>
  alt(['%x00-08', '%x0A-1F', DIGIT, ':', ALPHA, '%x7F-FF']),
)

// non-digit       = %x00-2F / %x3A-FF
const non_digit = rule(() => alt(['%x00-2F', '%x3A-FF']))

// day-of-month    = 1*2DIGIT [ non-digit *OCTET ]
const day_of_month = rule(() =>
  seq([repeat('1*2', DIGIT), opt(seq([non_digit, repeat('*', OCTET)]))]),
)

// month           = ( "jan" / "feb" / "mar" / "apr" /
//                     "may" / "jun" / "jul" / "aug" /
//                     "sep" / "oct" / "nov" / "dec" ) *OCTET
const month = rule(() =>
  seq([
    alt([
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ]),
    repeat('*', OCTET),
  ]),
)

// year            = 2*4DIGIT [ non-digit *OCTET ]
const year = rule(() =>
  seq([repeat('2*4', DIGIT), opt(seq([non_digit, repeat('*', OCTET)]))]),
)

// time            = hms-time [ non-digit *OCTET ]
const time = rule(() =>
  seq([hms_time, opt(seq([non_digit, repeat('*', OCTET)]))]),
)

// hms-time        = time-field ":" time-field ":" time-field
const hms_time = rule(() => seq([time_field, ':', time_field, ':', time_field]))

// time-field      = 1*2DIGIT
const time_field = rule(() => repeat('1*2', DIGIT))

export function parseCookieDate(input: string): Date {
  if (input.length > MAX_SET_COOKIE_HEADER_LENGTH) {
    throw new Error('TODO')
  }

  // The user agent MUST use an algorithm equivalent to the following algorithm to
  // parse a cookie-date. Note that the various boolean flags defined as a part of
  // the algorithm (i.e., found-time, found-day-of-month, found-month, found-year)
  // are initially "not set".
  // @spec #section-5.1.1-1
  const flags: Flags = {
    foundTime: undefined,
    foundDayOfMonth: undefined,
    foundMonth: undefined,
    foundYear: undefined,
  }

  // 1. Using the grammar below, divide the cookie-date into date-tokens.
  // @spec #section-5.1.1-2.1.1
  const parsedCookieDate = cookie_date(input)
  if (parsedCookieDate.type !== 'ok') {
    throw new Error('TODO')
  }
  const dateTokens = []
  const [, [first_date_token, remaining_date_tokens]] = parsedCookieDate.result
  dateTokens.push(first_date_token)
  for (const [, date_token] of remaining_date_tokens) {
    dateTokens.push(date_token)
  }

  // 2. Process each date-token sequentially in the order the date-tokens appear in the cookie-date:
  for (const dateToken of dateTokens) {
    // 2.1. If the found-time flag is not set and the token matches the time production,
    // set the found-time flag and set the hour-value, minute-value, and second-value to
    // the numbers denoted by the digits in the date-token, respectively. Skip the remaining
    // sub-steps and continue to the next date-token.
    // @spec #section-5.1.1-2.2.2.1
    if (flags.foundTime === undefined) {
      const parsedTime = map(
        time,
        ([[hour_tokens, , minute_tokens, , second_tokens]]) => {
          return {
            hours: parseInt(hour_tokens.join(''), 10),
            minutes: parseInt(minute_tokens.join(''), 10),
            seconds: parseInt(second_tokens.join(''), 10),
          }
        },
      )(dateToken)
      if (parsedTime.type === 'ok') {
        flags.foundTime = parsedTime.result
        continue
      }
    }

    // 2.2. If the found-day-of-month flag is not set and the date-token matches the day-of-month production,
    // set the found-day-of-month flag and set the day-of-month-value to the number denoted by the date-token.
    // Skip the remaining sub-steps and continue to the next date-token.
    // @spec #section-5.1.1-2.2.2.2
    if (flags.foundDayOfMonth === undefined) {
      const parsedDayOfMonth = map(day_of_month, ([day_tokens]) => {
        return parseInt(day_tokens.join(''), 10)
      })(dateToken)
      if (parsedDayOfMonth.type === 'ok') {
        flags.foundDayOfMonth = parsedDayOfMonth.result
        continue
      }
    }

    // 2.3. If the found-month flag is not set and the date-token matches the month production, set the found-month
    // flag and set the month-value to the month denoted by the date-token. Skip the remaining sub-steps and
    // continue to the next date-token.
    // @spec #section-5.1.1-2.2.2.3
    if (flags.foundMonth === undefined) {
      const parsedMonth = map(month, ([month]) => {
        return months.indexOf(month.toLowerCase())
      })(dateToken)
      if (parsedMonth.type === 'ok') {
        flags.foundMonth = parsedMonth.result
        continue
      }
    }

    // 2.4. If the found-year flag is not set and the date-token matches the year production, set the found-year
    // flag and set the year-value to the number denoted by the date-token. Skip the remaining sub-steps and
    // continue to the next date-token.
    // @spec #section-5.1.1-2.2.2.4
    if (flags.foundYear === undefined) {
      const parsedYear = map(year, ([year_tokens]) => {
        return parseInt(year_tokens.join(''), 10)
      })(dateToken)
      if (parsedYear.type === 'ok') {
        flags.foundYear = parsedYear.result
        // continue
      }
    }
  }

  // 3. If the year-value is greater than or equal to 70 and less than or equal to 99, increment the year-value by 1900.
  // @spec #section-5.1.1-2.3
  if (
    flags.foundYear !== undefined &&
    flags.foundYear >= 70 &&
    flags.foundYear <= 99
  ) {
    flags.foundYear += 1900
  }

  // 4. If the year-value is greater than or equal to 0 and less than or equal to 69, increment the year-value by 2000.
  // @spec #section-5.1.1-2.4
  if (
    flags.foundYear !== undefined &&
    flags.foundYear >= 0 &&
    flags.foundYear <= 69
  ) {
    flags.foundYear += 2000
  }

  // NOTE: Some existing user agents interpret two-digit years differently.

  // 5. Abort these steps and fail to parse the cookie-date if:
  // - at least one of the found-day-of-month, found-month, found-year, or found-time flags is not set,
  // @spec #section-5.1.1-2.5.2.1
  if (
    flags.foundDayOfMonth === undefined ||
    flags.foundMonth === undefined ||
    flags.foundYear === undefined ||
    flags.foundTime === undefined
  ) {
    throw new Error('TODO')
  }

  // - the day-of-month-value is less than 1 or greater than 31,
  // @spec #section-5.1.1-2.5.2.2
  if (flags.foundDayOfMonth < 1 || flags.foundDayOfMonth > 31) {
    throw new Error('TODO')
  }

  // the year-value is less than 1601,
  // @spec #section-5.1.1-2.5.2.3
  if (flags.foundYear < 1601) {
    throw new Error('TODO')
  }

  // the hour-value is greater than 23,
  // @spec #section-5.1.1-2.5.2.4
  if (flags.foundTime.hours > 23) {
    throw new Error('TODO')
  }

  // the minute-value is greater than 59, or
  // @spec #section-5.1.1-2.5.2.5
  if (flags.foundTime.minutes > 59) {
    throw new Error('TODO')
  }

  // the second-value is greater than 59.
  // @spec #section-5.1.1-2.5.2.6
  if (flags.foundTime.seconds > 59) {
    throw new Error('TODO')
  }

  // (Note that leap seconds cannot be represented in this syntax.)

  // 6. Let the parsed-cookie-date be the date whose day-of-month, month, year, hour, minute, and second (in UTC)
  // are the day-of-month-value, the month-value, the year-value, the hour-value, the minute-value, and the
  // second-value, respectively. If no such date exists, abort these steps and fail to parse the cookie-date.
  // @spec #section-5.1.1-2.6
  const cookieDate = Date.UTC(
    flags.foundYear,
    flags.foundMonth,
    flags.foundDayOfMonth,
    flags.foundTime.hours,
    flags.foundTime.minutes,
    flags.foundTime.seconds,
  )
  if (isNaN(cookieDate)) {
    throw new Error('TODO')
  }

  // 7. Return the parsed-cookie-date as the result of this algorithm.
  // @spec #section-5.1.1-2.7
  return new Date(cookieDate)
}
