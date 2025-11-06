// date-time parsing constants ([RFC6265 S5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1))

import type { Nullable } from '../utils.js'

/**
 * [RFC6265 Section 5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1)
 * 
 * Matches the `delimiter` grammar from [RFC6265](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1):
 *   delimiter = %x09 / %x20-2F / %x3B-40 / %x5B-60 / %x7B-7E
 * 
 * This regex correctly implements all `delimiter` characters:
 *   \x09      = tab
 *   \x20-\x2F = space through /
 *   \x3B-\x40 = ; through @
 *   \x5B-\x60 = [ through `
 *   \x7B-\x7E = { through ~
 */
// eslint-disable-next-line no-control-regex
const DATE_DELIM = /[\x09\x20-\x2F\x3B-\x40\x5B-\x60\x7B-\x7E]/

/**
 * [RFC6265 Section 5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1)
 * 
 * Maps three-letter `month` grammer abbreviations (case-insensitive) to JavaScript month numbers (0-11).
 * [RFC6265](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) grammar: month = ( "jan" / "feb" / "mar" / "apr" / "may" / "jun" / 
 *                            "jul" / "aug" / "sep" / "oct" / "nov" / "dec" ) *OCTET
 */
const MONTH_TO_NUM = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

/**
 * [RFC6265 Section 5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1)
 * 
 * Parses a Natural number (i.e., non-negative integer) for the following grammers:
 * - X*YDIGIT [ non-digit *OCTET ]
 * - X*YDIGIT
 *
 * The `trailingOK` boolean controls if the grammar accepts the `[ non-digit *OCTET ]` trailer.
 * 
 * Used for:
 *   - day-of-month: 1*2DIGIT [ non-digit *OCTET ]
 *   - year: 2*4DIGIT [ non-digit *OCTET ]
 *   - time-field: 1*2DIGIT
 * 
 * [RFC6265](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) defines: non-digit = %x00-2F / %x3A-FF
 */
function parseDigits(
  token: string,
  minDigits: number,
  maxDigits: number,
  trailingOK: boolean,
): number | undefined {
  let count = 0
  while (count < token.length) {
    const c = token.charCodeAt(count)
    // "non-digit = %x00-2F / %x3A-FF"
    if (c <= 0x2f || c >= 0x3a) {
      break
    }
    count++
  }

  // constrain to a minimum and maximum number of digits.
  if (count < minDigits || count > maxDigits) {
    return
  }

  if (!trailingOK && count != token.length) {
    return
  }

  return parseInt(token.slice(0, count), 10)
}

/**
 * [RFC6265 Section 5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1)
 * 
 * Parses time in HH:MM:SS format according to [RFC6265](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) grammar:
 *   time            = hms-time [ non-digit *OCTET ]
 *   hms-time        = time-field ":" time-field ":" time-field
 *   time-field      = 1*2DIGIT
 * 
 * Each time field must be 1-2 digits.
 * Only the last field (seconds) may have trailing non-digit characters.
 */
function parseTime(token: string): number[] | undefined {
  const parts = token.split(':')
  const result = [0, 0, 0]

  if (parts.length !== 3) {
    return
  }

  for (let i = 0; i < 3; i++) {
    // "time-field" must be strictly "1*2DIGIT", HOWEVER, "hms-time" can be
    // followed by "[ non-digit *OCTET ]" therefore the last time-field can
    // have a trailer (per [RFC6265 Erratum 4148](https://www.rfc-editor.org/errata/eid4148))
    const trailingOK = i == 2
    const numPart = parts[i]
    if (numPart === undefined) {
      return
    }
    const num = parseDigits(numPart, 1, 2, trailingOK)
    if (num === undefined) {
      return
    }
    result[i] = num
  }

  return result
}

/**
 * [RFC6265 Section 5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1)
 * 
 * Parses month according to [RFC6265](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) grammar:
 *   month = ( "jan" / "feb" / "mar" / "apr" / "may" / "jun" /
 *             "jul" / "aug" / "sep" / "oct" / "nov" / "dec" ) *OCTET
 * 
 * Implementation:
 *   - Takes first 3 characters only
 *   - Case-insensitive matching
 *   - Returns JavaScript month number (0-11)
 *   - Trailing characters after first 3 are ignored per grammar
 */
function parseMonth(token: string): number | undefined {
  token = String(token as unknown)
    .slice(0, 3)
    .toLowerCase()
  switch (token) {
    case 'jan':
      return MONTH_TO_NUM.jan
    case 'feb':
      return MONTH_TO_NUM.feb
    case 'mar':
      return MONTH_TO_NUM.mar
    case 'apr':
      return MONTH_TO_NUM.apr
    case 'may':
      return MONTH_TO_NUM.may
    case 'jun':
      return MONTH_TO_NUM.jun
    case 'jul':
      return MONTH_TO_NUM.jul
    case 'aug':
      return MONTH_TO_NUM.aug
    case 'sep':
      return MONTH_TO_NUM.sep
    case 'oct':
      return MONTH_TO_NUM.oct
    case 'nov':
      return MONTH_TO_NUM.nov
    case 'dec':
      return MONTH_TO_NUM.dec
    default:
      return
  }
}

/**
 * Parse a cookie date string into a {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date | Date}. Parses according to
 * {@link https://www.rfc-editor.org/rfc/rfc6265.html#section-5.1.1 | RFC6265 - Section 5.1.1}, not
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse | Date.parse()}.
 *
 * @remarks
 *
 * ### RFC6265 - 5.1.1. Dates
 * 
 * This implementation is compliant with RFC6265 Section 5.1.1 and incorporates
 * {@link https://www.rfc-editor.org/errata/eid4148 | RFC6265 Erratum 4148 - Grammar Fixed}
 * which corrects the ABNF grammar for day-of-month, year, and time to make trailing 
 * non-digit characters optional (changing `( )` to `[ ]`).
 * 
 * Also compatible with {@link https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-21 | draft-ietf-httpbis-rfc6265bis-21}
 * which maintains the same date parsing algorithm with additional clarifications.
 *
 * The user agent MUST use an algorithm equivalent to the following
 * algorithm to parse a cookie-date.  Note that the various boolean
 * flags defined as a part of the algorithm (i.e., found-time, found-
 * day-of-month, found-month, found-year) are initially "not set".
 *
 * 1.  Using the grammar below, divide the cookie-date into date-tokens.
 *
 * ```
 *     cookie-date     = *delimiter date-token-list *delimiter
 *     date-token-list = date-token *( 1*delimiter date-token )
 *     date-token      = 1*non-delimiter
 *
 *     delimiter       = %x09 / %x20-2F / %x3B-40 / %x5B-60 / %x7B-7E
 *     non-delimiter   = %x00-08 / %x0A-1F / DIGIT / ":" / ALPHA / %x7F-FF
 *     non-digit       = %x00-2F / %x3A-FF
 *
 *     day-of-month    = 1*2DIGIT [ non-digit *OCTET ]
 *     month           = ( "jan" / "feb" / "mar" / "apr" /
 *                        "may" / "jun" / "jul" / "aug" /
 *                        "sep" / "oct" / "nov" / "dec" ) *OCTET
 *     year            = 2*4DIGIT [ non-digit *OCTET ]
 *     time            = hms-time [ non-digit *OCTET ]
 *     hms-time        = time-field ":" time-field ":" time-field
 *     time-field      = 1*2DIGIT
 * ```
 *
 * 2. Process each date-token sequentially in the order the date-tokens
 *     appear in the cookie-date:
 *
 *     1. If the found-time flag is not set and the token matches the
 *         time production, set the found-time flag and set the hour-
 *         value, minute-value, and second-value to the numbers denoted
 *         by the digits in the date-token, respectively.  Skip the
 *         remaining sub-steps and continue to the next date-token.
 *
 *     2. If the found-day-of-month flag is not set and the date-token
 *         matches the day-of-month production, set the found-day-of-
 *         month flag and set the day-of-month-value to the number
 *         denoted by the date-token.  Skip the remaining sub-steps and
 *         continue to the next date-token.
 *
 *     3. If the found-month flag is not set and the date-token matches
 *         the month production, set the found-month flag and set the
 *         month-value to the month denoted by the date-token.  Skip the
 *         remaining sub-steps and continue to the next date-token.
 *
 *     4. If the found-year flag is not set and the date-token matches
 *         the year production, set the found-year flag and set the
 *         year-value to the number denoted by the date-token.  Skip the
 *         remaining sub-steps and continue to the next date-token.
 *
 *  3. If the year-value is greater than or equal to 70 and less than or
 *      equal to 99, increment the year-value by 1900.
 *
 *  4. If the year-value is greater than or equal to 0 and less than or
 *      equal to 69, increment the year-value by 2000.
 *
 *      1. NOTE: Some existing user agents interpret two-digit years differently.
 *
 *  5. Abort these steps and fail to parse the cookie-date if:
 *
 *      - at least one of the found-day-of-month, found-month, found-
 *          year, or found-time flags is not set,
 *
 *      - the day-of-month-value is less than 1 or greater than 31,
 *
 *      - the year-value is less than 1601,
 *
 *      - the hour-value is greater than 23,
 *
 *      - the minute-value is greater than 59, or
 *
 *      - the second-value is greater than 59.
 *
 *      (Note that leap seconds cannot be represented in this syntax.)
 *
 *  6. Let the parsed-cookie-date be the date whose day-of-month, month,
 *      year, hour, minute, and second (in UTC) are the day-of-month-
 *      value, the month-value, the year-value, the hour-value, the
 *      minute-value, and the second-value, respectively.  If no such
 *      date exists, abort these steps and fail to parse the cookie-date.
 *
 *  7. Return the parsed-cookie-date as the result of this algorithm.
 *
 * @example
 * ```
 * parseDate('Wed, 09 Jun 2021 10:18:14 GMT')
 * ```
 *
 * @param cookieDate - the cookie date string
 * @public
 */
export function parseDate(cookieDate: Nullable<string>): Date | undefined {
  if (!cookieDate) {
    return
  }

  /* [RFC6265 S5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) Step 1:
   * Using the grammar below, divide the cookie-date into date-tokens.
   * 
   * cookie-date     = *delimiter date-token-list *delimiter
   * date-token-list = date-token *( 1*delimiter date-token )
   * date-token      = 1*non-delimiter
   */
  const tokens = cookieDate.split(DATE_DELIM)

  /* [RFC6265 S5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) Step 2:
   * Process each date-token sequentially in the order the date-tokens
   * appear in the cookie-date.
   * 
   * [RFC6265](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) specifies using boolean flags (found-time, found-day-of-month, 
   * found-month, found-year) to ensure each component is only parsed once.
   * This implementation uses `undefined` checks on the variables themselves
   * as implicit flags (e.g., `second === undefined` means time not yet found).
   */
  let hour: number | undefined
  let minute: number | undefined
  let second: number | undefined
  let dayOfMonth: number | undefined
  let month: number | undefined
  let year: number | undefined

  for (let i = 0; i < tokens.length; i++) {
    const token = (tokens[i] ?? '').trim()
    if (!token.length) {
      continue
    }

    /* [RFC6265 S5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) Step 2.1 (Time Parsing):
     * If the found-time flag is not set and the token matches the time
     * production, set the found-time flag and set the hour-value,
     * minute-value, and second-value to the numbers denoted by the digits in
     * the date-token, respectively. Skip the remaining sub-steps and continue
     * to the next date-token.
     * 
     * Grammar (per [Erratum 4148](https://www.rfc-editor.org/errata/eid4148)): time = hms-time [ non-digit *OCTET ]
     * 
     * Implementation uses `second === undefined` as the "found-time" flag.
     */
    if (second === undefined) {
      const result = parseTime(token)
      if (result) {
        hour = result[0]
        minute = result[1]
        second = result[2]
        continue
      }
    }

    /* [RFC6265 S5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) Step 2.2 (Day-of-Month Parsing):
     * If the found-day-of-month flag is not set and the date-token matches
     * the day-of-month production, set the found-day-of-month flag and set
     * the day-of-month-value to the number denoted by the date-token. Skip
     * the remaining sub-steps and continue to the next date-token.
     * 
     * Grammar (per [Erratum 4148](https://www.rfc-editor.org/errata/eid4148)): day-of-month = 1*2DIGIT [ non-digit *OCTET ]
     * 
     * Implementation uses `dayOfMonth === undefined` as the "found-day-of-month" flag.
     */
    if (dayOfMonth === undefined) {
      // day-of-month = 1*2DIGIT [ non-digit *OCTET ]
      const result = parseDigits(token, 1, 2, true)
      if (result !== undefined) {
        dayOfMonth = result
        continue
      }
    }

    /* [RFC6265 S5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) Step 2.3 (Month Parsing):
     * If the found-month flag is not set and the date-token matches the
     * month production, set the found-month flag and set the month-value to
     * the month denoted by the date-token. Skip the remaining sub-steps and
     * continue to the next date-token.
     * 
     * Grammar: month = ( "jan" / "feb" / ... / "dec" ) *OCTET
     * 
     * Implementation uses `month === undefined` as the "found-month" flag.
     */
    if (month === undefined) {
      const result = parseMonth(token)
      if (result !== undefined) {
        month = result
        continue
      }
    }

    /* [RFC6265 S5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) Step 2.4 (Year Parsing):
     * If the found-year flag is not set and the date-token matches the
     * year production, set the found-year flag and set the year-value to the
     * number denoted by the date-token. Skip the remaining sub-steps and
     * continue to the next date-token.
     * 
     * Grammar (per [Erratum 4148](https://www.rfc-editor.org/errata/eid4148)): year = 2*4DIGIT [ non-digit *OCTET ]
     * 
     * Implementation uses `year === undefined` as the "found-year" flag.
     */
    if (year === undefined) {
      // year = 2*4DIGIT [ non-digit *OCTET ]
      const result = parseDigits(token, 2, 4, true)
      if (result !== undefined) {
        year = result
        /* [RFC6265 S5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) Steps 3-4 (Year Transformation):
         * 3. If the year-value is greater than or equal to 70 and less
         *    than or equal to 99, increment the year-value by 1900.
         * 4. If the year-value is greater than or equal to 0 and less
         *    than or equal to 69, increment the year-value by 2000.
         * 
         * This handles two-digit years: 70-99 → 1970-1999, 00-69 → 2000-2069
         */
        if (year >= 70 && year <= 99) {
          year += 1900
        } else if (year >= 0 && year <= 69) {
          year += 2000
        }
      }
    }
  }

  /* [RFC6265 S5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) Step 5 (Validation):
   * Abort these steps and fail to parse the cookie-date if:
   *   - at least one of the found-day-of-month, found-month, found-year,
   *     or found-time flags is not set,
   *   - the day-of-month-value is less than 1 or greater than 31,
   *   - the year-value is less than 1601,
   *   - the hour-value is greater than 23,
   *   - the minute-value is greater than 59, or
   *   - the second-value is greater than 59.
   * 
   * Note: Leap seconds cannot be represented in this syntax.
   * 
   * All validation checks are performed exactly as specified.
   */
  if (
    dayOfMonth === undefined ||
    month === undefined ||
    year === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined ||
    dayOfMonth < 1 ||
    dayOfMonth > 31 ||
    year < 1601 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return
  }

  /* [RFC6265 S5.1.1](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1) Steps 6-7 (Date Construction):
   * 6. Let the parsed-cookie-date be the date whose day-of-month, month,
   *    year, hour, minute, and second (in UTC) are the day-of-month-value,
   *    the month-value, the year-value, the hour-value, the minute-value,
   *    and the second-value, respectively. If no such date exists, abort
   *    these steps and fail to parse the cookie-date.
   * 7. Return the parsed-cookie-date as the result of this algorithm.
   * 
   * JavaScript's Date constructor silently rolls over invalid dates (e.g.,
   * Feb 30 → Mar 2). We must check if the date was rolled over and reject it
   * per [RFC6265 S5.1.1 Step 6](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1).
   */
  const date = new Date(Date.UTC(year, month, dayOfMonth, hour, minute, second))

  // Verify the date wasn't rolled over by JavaScript
  // e.g., Feb 30 becomes Mar 2, which should be rejected per RFC6265
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== dayOfMonth
  ) {
    return undefined
  }

  return date
}
