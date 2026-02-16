import type { Nullable } from '../utils.js'

/**
 * Parse a cookie date string into a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date | Date}. Parses according to
 * {@link https://www.rfc-editor.org/rfc/rfc6265.html#section-5.1.1 | RFC6265 - Section 5.1.1}, not
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse | Date.parse()}.
 *
 * @remarks
 *
 * This implementation is compliant with RFC6265 Section 5.1.1 and incorporates
 * {@link https://www.rfc-editor.org/errata/eid4148 | RFC6265 Erratum 4148 - Grammar Fixed}
 * which corrects the ABNF grammar for day-of-month, year, and time to make trailing
 * non-digit characters optional (changing `( )` to `[ ]`).
 *
 * Also compatible with {@link https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21 | draft-ietf-httpbis-rfc6265bis-21}
 * which maintains the same date parsing algorithm with additional clarifications.
 *
 * @example
 * ```
 * parseDate('Wed, 09 Jun 2021 10:18:14 GMT')
 * ```
 *
 * @param cookieDate - the cookie date string
 * @returns Date if valid, undefined if invalid
 * @public
 */
export function parseDate(cookieDate: Nullable<string>): Date | undefined {
  // Early exit for empty input
  if (!cookieDate) {
    return undefined
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1
  // The user agent MUST use an algorithm equivalent to the following algorithm to
  // parse a cookie-date. Note that the various boolean flags defined as a part of
  // the algorithm (i.e., found-time, found-day-of-month, found-month, found-year)
  // are initially "not set".
  const flags: Flags = {
    foundTime: undefined,
    foundDayOfMonth: undefined,
    foundMonth: undefined,
    foundYear: undefined,
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.1.1
  // 1. Using the grammar below, divide the cookie-date into date-tokens.
  //
  //   cookie-date     = *delimiter date-token-list *delimiter
  //   date-token-list = date-token *( 1*delimiter date-token )
  //   date-token      = 1*non-delimiter
  //
  //   delimiter       = %x09 / %x20-2F / %x3B-40 / %x5B-60 / %x7B-7E
  //   non-delimiter   = %x00-08 / %x0A-1F / DIGIT / ":" / ALPHA
  //                     / %x7F-FF
  //   non-digit       = %x00-2F / %x3A-FF
  //
  //   day-of-month    = 1*2DIGIT [ non-digit *OCTET ]
  //   month           = ( "jan" / "feb" / "mar" / "apr" /
  //                       "may" / "jun" / "jul" / "aug" /
  //                       "sep" / "oct" / "nov" / "dec" ) *OCTET
  //   year            = 2*4DIGIT [ non-digit *OCTET ]
  //   time            = hms-time [ non-digit *OCTET ]
  //   hms-time        = time-field ":" time-field ":" time-field
  //   time-field      = 1*2DIGIT
  const dateTokens: string[] = cookieDate
    .split(DELIMITER)
    // The delimiter and non-delimiter character sets form a complete partition
    // of the byte space (0x00-0xFF). Every character is either a delimiter or non-delimiter,
    // with no overlap or gaps. This means split(DELIMITER) produces tokens that are guaranteed
    // to contain only non-delimiter characters. The only tokens that would fail NON_DELIMITER.test()
    // are empty strings (from consecutive delimiters). Therefore, we can replace the expensive
    // regex test with a simple length check.
    .filter((token) => token.length > 0)

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.2.1
  // 2. Process each date-token sequentially in the order the date-tokens appear in the cookie-date:
  for (const dateToken of dateTokens) {
    // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.2.2.1.1
    // 2.1. If the found-time flag is not set and the token matches the time production,
    // set the found-time flag and set the hour-value, minute-value, and second-value to
    // the numbers denoted by the digits in the date-token, respectively. Skip the remaining
    // sub-steps and continue to the next date-token.
    // Use exec() with capture groups instead of test() + split() to avoid redundant work
    if (flags.foundTime === undefined) {
      const [, hours, minutes, seconds] = TIME.exec(dateToken) || []
      if (hours != undefined && minutes != undefined && seconds != undefined) {
        const parsedHours = parseInt(hours, 10)
        const parsedMinutes = parseInt(minutes, 10)
        const parsedSeconds = parseInt(seconds, 10)
        if (
          !isNaN(parsedHours) &&
          !isNaN(parsedMinutes) &&
          !isNaN(parsedSeconds)
        ) {
          flags.foundTime = {
            hours: parsedHours,
            minutes: parsedMinutes,
            seconds: parsedSeconds,
          }
          continue
        }
      }
    }

    // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.2.2.2.1
    // 2.2. If the found-day-of-month flag is not set and the date-token matches the day-of-month production,
    // set the found-day-of-month flag and set the day-of-month-value to the number denoted by the date-token.
    // Skip the remaining sub-steps and continue to the next date-token.
    if (flags.foundDayOfMonth === undefined && DAY_OF_MONTH.test(dateToken)) {
      const dayOfMonth = parseInt(dateToken, 10)
      if (!isNaN(dayOfMonth)) {
        flags.foundDayOfMonth = dayOfMonth
        continue
      }
    }

    // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.2.2.3.1
    // 2.3. If the found-month flag is not set and the date-token matches the month production, set the found-month
    // flag and set the month-value to the month denoted by the date-token. Skip the remaining sub-steps and
    // continue to the next date-token.
    // @spec #section-5.1.1-2.2.2.3
    if (flags.foundMonth === undefined && MONTH.test(dateToken)) {
      const month = months.indexOf(dateToken.substring(0, 3).toLowerCase())
      if (month >= 0 && month <= 11) {
        flags.foundMonth = month
        continue
      }
    }

    // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.2.2.4.1
    // 2.4. If the found-year flag is not set and the date-token matches the year production, set the found-year
    // flag and set the year-value to the number denoted by the date-token. Skip the remaining sub-steps and
    // continue to the next date-token.
    // @spec #section-5.1.1-2.2.2.4
    if (flags.foundYear === undefined && YEAR.test(dateToken)) {
      const parsedYear = parseInt(dateToken, 10)
      if (!isNaN(parsedYear)) {
        flags.foundYear = parsedYear
        continue
      }
    }
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.3.1
  // 3. If the year-value is greater than or equal to 70 and less than or equal to 99, increment the year-value by 1900.
  if (
    flags.foundYear !== undefined &&
    flags.foundYear >= 70 &&
    flags.foundYear <= 99
  ) {
    flags.foundYear += 1900
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.4.1
  // 4. If the year-value is greater than or equal to 0 and less than or equal to 69, increment the year-value by 2000.
  if (
    flags.foundYear !== undefined &&
    flags.foundYear >= 0 &&
    flags.foundYear <= 69
  ) {
    flags.foundYear += 2000
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.4.2.1.1
  // NOTE: Some existing user agents interpret two-digit years differently.

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.5.1
  // 5. Abort these steps and fail to parse the cookie-date if:

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.5.2.1.1
  // - at least one of the found-day-of-month, found-month, found-year, or found-time flags is not set,
  if (
    flags.foundDayOfMonth === undefined ||
    flags.foundMonth === undefined ||
    flags.foundYear === undefined ||
    flags.foundTime === undefined
  ) {
    return undefined
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.5.2.2.1
  // - the day-of-month-value is less than 1 or greater than 31,
  if (flags.foundDayOfMonth < 1 || flags.foundDayOfMonth > 31) {
    return undefined
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.5.2.3.1
  // the year-value is less than 1601,
  if (flags.foundYear < 1601) {
    return undefined
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.5.2.4.1
  // the hour-value is greater than 23,
  if (flags.foundTime.hours > 23) {
    return undefined
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.5.2.5.1
  // the minute-value is greater than 59, or
  if (flags.foundTime.minutes > 59) {
    return undefined
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.5.2.6.1
  // the second-value is greater than 59.
  if (flags.foundTime.seconds > 59) {
    return undefined
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.5.3
  // (Note that leap seconds cannot be represented in this syntax.)

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.6.1
  // 6. Let the parsed-cookie-date be the date whose day-of-month, month, year, hour, minute, and second (in UTC)
  // are the day-of-month-value, the month-value, the year-value, the hour-value, the minute-value, and the
  // second-value, respectively. If no such date exists, abort these steps and fail to parse the cookie-date.
  const date = new Date(
    Date.UTC(
      flags.foundYear,
      flags.foundMonth,
      flags.foundDayOfMonth,
      flags.foundTime.hours,
      flags.foundTime.minutes,
      flags.foundTime.seconds,
    ),
  )

  // NOTE: JavaScript's Date constructor silently rolls over invalid dates (e.g., Feb 30 → Mar 2).
  // We must check if the date was rolled over and reject it as invalid.
  if (
    date.getUTCFullYear() !== flags.foundYear ||
    date.getUTCMonth() !== flags.foundMonth ||
    date.getUTCDate() !== flags.foundDayOfMonth
  ) {
    return undefined
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21#section-5.1.1-2.7.1
  // 7. Return the parsed-cookie-date as the result of this algorithm.
  return date
}

type Flags = {
  foundTime: undefined | { hours: number; minutes: number; seconds: number }
  foundDayOfMonth: undefined | number
  foundMonth: undefined | number
  foundYear: undefined | number
}

// Maps three-letter month abbreviations to their corresponding month index (0-11)
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

// delimiter       = %x09 / %x20-2F / %x3B-40 / %x5B-60 / %x7B-7E
const DELIMITER = /[\x09\x20-\x2F\x3B-\x40\x5B-\x60\x7B-\x7E]/

// time            = hms-time [ non-digit *OCTET ]
// hms-time        = time-field ":" time-field ":" time-field
// time-field      = 1*2DIGIT
// DIGIT           = %x30-39; 0-9 (https://datatracker.ietf.org/doc/html/rfc5234#appendix-B.1)
// OPTIMIZATION: Use capture groups to extract hour, minute, second directly (avoids split + map)
const TIME =
  /^(\d{1,2}):(\d{1,2}):(\d{1,2})(?:[\x00-\x2F\x3A-\xFF][\x00-\xFF]*)?$/

// day-of-month    = 1*2DIGIT [ non-digit *OCTET ]
// non-digit       = %x00-2F / %x3A-FF
// OCTET           = %x00-FF; any 8-bit sequence of data (https://datatracker.ietf.org/doc/html/rfc5234#appendix-B.1)
const DAY_OF_MONTH = /^[0-9]{1,2}(?:[\x00-\x2F\x3A-\xFF][\x00-\xFF]*)?$/

// month           = ( "jan" / "feb" / "mar" / "apr" / "may" / "jun" / "jul" / "aug" / "sep" / "oct" / "nov" / "dec" ) *OCTET
const MONTH = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\x00-\xFF]*$/i

// year            = 2*4DIGIT [ non-digit *OCTET ]
// non-digit       = %x00-2F / %x3A-FF
// DIGIT           = %x30-39; 0-9 (https://datatracker.ietf.org/doc/html/rfc5234#appendix-B.1)
// OCTET           = %x00-FF; any 8-bit sequence of data (https://datatracker.ietf.org/doc/html/rfc5234#appendix-B.1)
const YEAR = /^[\x30-\x39]{2,4}(?:[\x00-\x2F\x3A-\xFF][\x00-\xFF]*)?$/
