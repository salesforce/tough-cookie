// date-time parsing constants (RFC6265 S5.1.1)

import type { Nullable } from '../utils'

// eslint-disable-next-line no-control-regex
const DATE_DELIM = /[\x09\x20-\x2F\x3B-\x40\x5B-\x60\x7B-\x7E]/

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

/*
 * Parses a Natural number (i.e., non-negative integer) with either the
 *    <min>*<max>DIGIT ( non-digit *OCTET )
 * or
 *    <min>*<max>DIGIT
 * grammar (RFC6265 S5.1.1).
 *
 * The "trailingOK" boolean controls if the grammar accepts a
 * "( non-digit *OCTET )" trailer.
 */
function parseDigits(
  token: string,
  minDigits: number,
  maxDigits: number,
  trailingOK: boolean,
): number | null {
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
    return null
  }

  if (!trailingOK && count != token.length) {
    return null
  }

  return parseInt(token.slice(0, count), 10)
}

function parseTime(token: string): number[] | null {
  const parts = token.split(':')
  const result = [0, 0, 0]

  /* RF6256 S5.1.1:
   *      time            = hms-time ( non-digit *OCTET )
   *      hms-time        = time-field ":" time-field ":" time-field
   *      time-field      = 1*2DIGIT
   */

  if (parts.length !== 3) {
    return null
  }

  for (let i = 0; i < 3; i++) {
    // "time-field" must be strictly "1*2DIGIT", HOWEVER, "hms-time" can be
    // followed by "( non-digit *OCTET )" therefore the last time-field can
    // have a trailer
    const trailingOK = i == 2
    const numPart = parts[i]
    if (numPart == null) {
      return null
    }
    const num = parseDigits(numPart, 1, 2, trailingOK)
    if (num === null) {
      return null
    }
    result[i] = num
  }

  return result
}

function parseMonth(token: string): number | null {
  token = String(token).slice(0, 3).toLowerCase()
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
      return null
  }
}

/*
 * RFC6265 S5.1.1 date parser (see RFC for full grammar)
 */
export function parseDate(str: Nullable<string>): Date | undefined {
  if (!str) {
    return undefined
  }

  /* RFC6265 S5.1.1:
   * 2. Process each date-token sequentially in the order the date-tokens
   * appear in the cookie-date
   */
  const tokens = str.split(DATE_DELIM)
  if (!tokens) {
    return undefined
  }

  let hour = null
  let minute = null
  let second = null
  let dayOfMonth = null
  let month = null
  let year = null

  for (let i = 0; i < tokens.length; i++) {
    const token = (tokens[i] ?? '').trim()
    if (!token.length) {
      continue
    }

    let result

    /* 2.1. If the found-time flag is not set and the token matches the time
     * production, set the found-time flag and set the hour- value,
     * minute-value, and second-value to the numbers denoted by the digits in
     * the date-token, respectively.  Skip the remaining sub-steps and continue
     * to the next date-token.
     */
    if (second === null) {
      result = parseTime(token)
      if (result) {
        hour = result[0]
        minute = result[1]
        second = result[2]
        continue
      }
    }

    /* 2.2. If the found-day-of-month flag is not set and the date-token matches
     * the day-of-month production, set the found-day-of- month flag and set
     * the day-of-month-value to the number denoted by the date-token.  Skip
     * the remaining sub-steps and continue to the next date-token.
     */
    if (dayOfMonth === null) {
      // "day-of-month = 1*2DIGIT ( non-digit *OCTET )"
      result = parseDigits(token, 1, 2, true)
      if (result !== null) {
        dayOfMonth = result
        continue
      }
    }

    /* 2.3. If the found-month flag is not set and the date-token matches the
     * month production, set the found-month flag and set the month-value to
     * the month denoted by the date-token.  Skip the remaining sub-steps and
     * continue to the next date-token.
     */
    if (month === null) {
      result = parseMonth(token)
      if (result !== null) {
        month = result
        continue
      }
    }

    /* 2.4. If the found-year flag is not set and the date-token matches the
     * year production, set the found-year flag and set the year-value to the
     * number denoted by the date-token.  Skip the remaining sub-steps and
     * continue to the next date-token.
     */
    if (year === null) {
      // "year = 2*4DIGIT ( non-digit *OCTET )"
      result = parseDigits(token, 2, 4, true)
      if (result !== null) {
        year = result
        /* From S5.1.1:
         * 3.  If the year-value is greater than or equal to 70 and less
         * than or equal to 99, increment the year-value by 1900.
         * 4.  If the year-value is greater than or equal to 0 and less
         * than or equal to 69, increment the year-value by 2000.
         */
        if (year >= 70 && year <= 99) {
          year += 1900
        } else if (year >= 0 && year <= 69) {
          year += 2000
        }
      }
    }
  }

  /* RFC 6265 S5.1.1
   * "5. Abort these steps and fail to parse the cookie-date if:
   *     *  at least one of the found-day-of-month, found-month, found-
   *        year, or found-time flags is not set,
   *     *  the day-of-month-value is less than 1 or greater than 31,
   *     *  the year-value is less than 1601,
   *     *  the hour-value is greater than 23,
   *     *  the minute-value is greater than 59, or
   *     *  the second-value is greater than 59.
   *     (Note that leap seconds cannot be represented in this syntax.)"
   *
   * So, in order as above:
   */
  if (
    dayOfMonth === null ||
    month == null ||
    year == null ||
    hour == null ||
    minute == null ||
    second == null ||
    dayOfMonth < 1 ||
    dayOfMonth > 31 ||
    year < 1601 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return undefined
  }

  return new Date(Date.UTC(year, month, dayOfMonth, hour, minute, second))
}
