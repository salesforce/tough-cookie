/*!
 * Copyright (c) 2015, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of Salesforce.com nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
import { describe, expect, it } from 'vitest'

type DateParsingTestCase = {
  [key: string]: boolean
}

type EquivalenceDateParsingTestCase = {
  [key: string]: string
}

import { parseDate } from '../cookie/parseDate.js'

const dateTests: DateParsingTestCase = {
  'Wed, 09 Jun 2021 10:18:14 GMT': true,
  'Wed, 09 JUN 2021 10:18:14 GMT': true,
  'Wed, 09 Jun 2021 22:18:14 GMT': true,
  'Tue, 18 Oct 2011 07:42:42.123 GMT': true,
  '18 Oct 2011 07:42:42 GMT': true,
  '8 Oct 2011 7:42:42 GMT': true,
  '8 Oct 2011 7:2:42 GMT': true,
  '8 Oct 2011 7:2:2 GMT': true,
  'Oct 18 2011 07:42:42 GMT': true,
  'Tue Oct 18 2011 07:05:03 GMT+0000 (GMT)': true,
  '09 Jun 2021 10:18:14 GMT': true,
  '99 Jix 3038 48:86:72 ZMT': false,
  '01 Jan 1970 00:00:00 GMT': true,
  '01 Jan 1600 00:00:00 GMT': false, // before 1601
  '01 Jan 1601 00:00:00 GMT': true,
  '10 Feb 81 13:00:00 GMT': true, // implicit year
  'Thu, 17-Apr-2014 02:12:29 GMT': true, // dashes
  'Thu, 17-Apr-2014 02:12:29 UTC': true, // dashes and UTC

  // garbage after parts:
  'Wedxxx, 09 Jun 2021 10:18:14 GMT': true, // day of week doesn't matter
  'Wed, 09e9 Jun 2021 10:18:14 GMT': true, // garbage after day ignored
  'Wed, 09 Junxxx 2021 10:18:14 GMT': true, // prefix match on month
  'Wed, 09 Jun 2021e9 10:18:14 GMT': true, // garbage after year OK
  'Wed, 09 Jun 2021 10e9:18:14 GMT': false, // can't have garbage after HH
  'Wed, 09 Jun 2021 10:18e9:14 GMT': false, // can't have garbage after MM
  'Wed, 09 Jun 2021 10:18:14e9 GMT': true, // garbage after SS ignored

  // extra digit in time parts:
  'Thu, 01 Jan 1970 000:00:01 GMT': false,
  'Thu, 01 Jan 1970 00:000:01 GMT': false,
  'Thu, 01 Jan 1970 00:00:010 GMT': false,

  // hex in time
  'Wed, 09 Jun 2021 1a:33:44 GMT': false,
  'Wed, 09 Jun 2021 a1:33:44 GMT': false,
  'Wed, 09 Jun 2021 11:f3:44 GMT': false,
  'Wed, 09 Jun 2021 11:3f:44 GMT': false,
  'Wed, 09 Jun 2021 11:33:e4 GMT': false,
  'Wed, 09 Jun 2021 11:33:4e GMT': true, // garbage after seconds is OK

  // negatives in time
  'Wed, 09 Jun 2021 -1:33:44 GMT': true, // parses as 1:33; - is a delimiter
  'Wed, 09 Jun 2021 11:-3:44 GMT': false,
  'Wed, 09 Jun 2021 11:33:-4 GMT': false,

  // boundary year values
  '01 Jan 9999 00:00:00 GMT': true, // 4-digit year maximum valid
  '01 Jan 10000 00:00:00 GMT': false, // 5 digits - exceeds 2*4DIGIT

  // day-of-month boundaries
  '00 Jan 2021 00:00:00 GMT': false, // day < 1
  '32 Jan 2021 00:00:00 GMT': false, // day > 31

  // time component boundaries
  '01 Jan 2021 24:00:00 GMT': false, // hour > 23
  '01 Jan 2021 23:60:00 GMT': false, // minute > 59
  '01 Jan 2021 23:59:60 GMT': false, // second > 59 (leap second)

  // month edge cases
  '01 J 2021 00:00:00 GMT': false, // single character month
  '01 1 2021 00:00:00 GMT': false, // numeric month
  '01 Jax 2021 00:00:00 GMT': false, // invalid month abbreviation

  // invalid date combinations - RFC6265 S5.1.1 Step 6: "If no such date exists, abort"
  '30 Feb 2021 00:00:00 GMT': false, // Feb only has 28 days in 2021
  '31 Feb 2021 00:00:00 GMT': false, // Feb only has 28 days in 2021
  '30 Feb 2020 00:00:00 GMT': false, // Feb only has 29 days in 2020 (leap year)
  '31 Apr 2021 00:00:00 GMT': false, // Apr only has 30 days
  '31 Jun 2021 00:00:00 GMT': false, // Jun only has 30 days
  '31 Sep 2021 00:00:00 GMT': false, // Sep only has 30 days
  '31 Nov 2021 00:00:00 GMT': false, // Nov only has 30 days

  // duplicate tokens (first match wins per RFC6265)
  '01 Jan 2021 10:00:00 GMT 20:00:00': true, // duplicate time - first wins
  'Jan Feb 01 2021 10:00:00 GMT': true, // duplicate month - first wins
  '01 Jan 2021 2022 10:00:00 GMT': true, // duplicate year - first wins

  // consecutive delimiters (empty tokens)
  '01  Jan  2021  10:00:00  GMT': true, // multiple spaces
  '01,,Jan,,2021,,10:00:00,,GMT': true, // multiple delimiters

  // single-digit year (less than 2 digits - should fail)
  '01 Jan 9 10:00:00 GMT': false, // 1 digit year < 2*4DIGIT minimum

  '': false,
}

const equivalenceTests: EquivalenceDateParsingTestCase = {
  // milliseconds ignored
  'Tue, 18 Oct 2011 07:42:42.123 GMT': 'Tue, 18 Oct 2011 07:42:42 GMT',

  // shorter HH:MM:SS works how you'd expect:
  '8 Oct 2011 7:32:42 GMT': '8 Oct 2011 07:32:42 GMT',
  '8 Oct 2011 7:2:42 GMT': '8 Oct 2011 07:02:42 GMT',
  '8 Oct 2011 7:2:2 GMT': '8 Oct 2011 07:02:02 GMT',

  // MDY versus DMY:
  'Oct 18 2011 07:42:42 GMT': '18 Oct 2011 07:42:42 GMT',

  // some other messy auto format
  'Tue Oct 18 2011 07:05:03 GMT+0000 (GMT)': 'Tue, 18 Oct 2011 07:05:03 GMT',

  // short year
  '10 Feb 81 13:00:00 GMT': '10 Feb 1981 13:00:00 GMT',
  '10 Feb 17 13:00:00 GMT': '10 Feb 2017 13:00:00 GMT',

  // dashes
  'Thu, 17-Apr-2014 02:12:29 GMT': 'Thu, 17 Apr 2014 02:12:29 GMT',
  // dashes and "UTC" (timezone is always ignored)
  'Thu, 17-Apr-2014 02:12:29 UTC': 'Thu, 17 Apr 2014 02:12:29 GMT',

  // no weekday
  '09 Jun 2021 10:18:14 GMT': 'Wed, 09 Jun 2021 10:18:14 GMT',

  // garbage after seconds is OK
  'Wed, 09 Jun 2021 11:33:4e GMT': 'Wed, 09 Jun 2021 11:33:04 GMT',

  // - is delimiter in this position
  'Wed, 09 Jun 2021 -1:33:44 GMT': 'Wed, 09 Jun 2021 01:33:44 GMT',

  // prefix match on month
  'Wed, 09 Junxxx 2021 10:18:14 GMT': 'Wed, 09 Jun 2021 10:18:14 GMT',
  '09 November 2021 10:18:14 GMT': '09 Nov 2021 10:18:14 GMT',

  // case of Month
  'Wed, 09 JUN 2021 10:18:14 GMT': 'Wed, 09 Jun 2021 10:18:14 GMT',
  'Wed, 09 jUN 2021 10:18:14 GMT': 'Wed, 09 Jun 2021 10:18:14 GMT',

  // test the framework :wink:
  'Wed, 09 Jun 2021 10:18:14 GMT': 'Wed, 09 Jun 2021 10:18:14 GMT',

  // duplicate tokens - first occurrence wins
  '01 Jan 2021 10:00:00 GMT 20:00:00': '01 Jan 2021 10:00:00 GMT',
  'Jan Feb 01 2021 10:00:00 GMT': '01 Jan 2021 10:00:00 GMT',
  '01 Jan 2021 2022 10:00:00 GMT': '01 Jan 2021 10:00:00 GMT',

  // consecutive delimiters
  '01  Jan  2021  10:00:00  GMT': '01 Jan 2021 10:00:00 GMT',
  '01,,Jan,,2021,,10:00:00,,GMT': '01 Jan 2021 10:00:00 GMT',
}

describe('Dates', () => {
  describe('parsing', () => {
    const validDateTestCases = Object.entries(dateTests).filter(
      (testCase) => testCase[1],
    )
    const invalidDateTestCases = Object.entries(dateTests).filter(
      (testCase) => !testCase[1],
    )
    const equivalenceTestCases = Object.entries(equivalenceTests)

    it.each(validDateTestCases)(`'%s' is valid`, (date: string) => {
      expect(parseDate(date)).toBeInstanceOf(Date)
    })

    it.each(invalidDateTestCases)(`'%s' is not valid`, (date: string) => {
      expect(parseDate(date)).toBeUndefined()
    })

    it.each(equivalenceTestCases)(
      `'%s' parses the same as '%s'`,
      (date: string, equivalentDate: string) => {
        expect(parseDate(date)).toStrictEqual(parseDate(equivalentDate))
      },
    )
  })

  describe('regexp denial of service attack vectors', () => {
    const TOO_MANY_XS = 'x'.repeat(65535)

    it('should avoid unbounded regexps when parsing the hour from a date', () => {
      expect(
        parseDate(`Wed, 09 Jun 2021 10${TOO_MANY_XS}:18:14 GMT`),
      ).toBeUndefined()
    })

    it('should avoid unbounded regexps when parsing the minute from a date', () => {
      expect(
        parseDate(`Wed, 09 Jun 2021 10:18${TOO_MANY_XS}:14 GMT`),
      ).toBeUndefined()
    })

    it('should avoid unbounded regexps when parsing the seconds from a date', () => {
      const dateWithMillisIgnored = new Date(
        Date.parse('2021-06-09T10:18:14.000Z'),
      )
      expect(
        parseDate(`Wed, 09 Jun 2021 10:18:14${TOO_MANY_XS} GMT`),
      ).toStrictEqual(dateWithMillisIgnored)
    })
  })

  describe('RFC6265 edge cases and boundary values', () => {
    describe('year boundaries', () => {
      it('should accept year 1601 (minimum valid year)', () => {
        const date = parseDate('01 Jan 1601 00:00:00 GMT')
        expect(date).toBeInstanceOf(Date)
        expect(date?.getUTCFullYear()).toBe(1601)
      })

      it('should reject year 1600 (below minimum)', () => {
        expect(parseDate('01 Jan 1600 00:00:00 GMT')).toBeUndefined()
      })

      it('should accept year 9999 (4-digit maximum)', () => {
        const date = parseDate('01 Jan 9999 00:00:00 GMT')
        expect(date).toBeInstanceOf(Date)
        expect(date?.getUTCFullYear()).toBe(9999)
      })

      it('should reject year 10000 (5 digits exceeds 2*4DIGIT)', () => {
        expect(parseDate('01 Jan 10000 00:00:00 GMT')).toBeUndefined()
      })

      it('should reject single-digit year (below 2*4DIGIT minimum)', () => {
        expect(parseDate('01 Jan 9 00:00:00 GMT')).toBeUndefined()
      })

      it('should transform two-digit year 70 to 1970', () => {
        const date = parseDate('01 Jan 70 00:00:00 GMT')
        expect(date?.getUTCFullYear()).toBe(1970)
      })

      it('should transform two-digit year 69 to 2069', () => {
        const date = parseDate('01 Jan 69 00:00:00 GMT')
        expect(date?.getUTCFullYear()).toBe(2069)
      })

      it('should transform two-digit year 00 to 2000', () => {
        const date = parseDate('01 Jan 00 00:00:00 GMT')
        expect(date?.getUTCFullYear()).toBe(2000)
      })
    })

    describe('day-of-month boundaries', () => {
      it('should reject day 0 (below minimum)', () => {
        expect(parseDate('00 Jan 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should reject day 32 (above maximum)', () => {
        expect(parseDate('32 Jan 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should accept day 1 (minimum valid)', () => {
        const date = parseDate('01 Jan 2021 00:00:00 GMT')
        expect(date?.getUTCDate()).toBe(1)
      })

      it('should accept day 31 (maximum valid)', () => {
        const date = parseDate('31 Jan 2021 00:00:00 GMT')
        expect(date?.getUTCDate()).toBe(31)
      })
    })

    describe('time component boundaries', () => {
      it('should reject hour 24 (above maximum)', () => {
        expect(parseDate('01 Jan 2021 24:00:00 GMT')).toBeUndefined()
      })

      it('should accept hour 23 (maximum valid)', () => {
        const date = parseDate('01 Jan 2021 23:00:00 GMT')
        expect(date?.getUTCHours()).toBe(23)
      })

      it('should reject minute 60 (above maximum)', () => {
        expect(parseDate('01 Jan 2021 23:60:00 GMT')).toBeUndefined()
      })

      it('should accept minute 59 (maximum valid)', () => {
        const date = parseDate('01 Jan 2021 23:59:00 GMT')
        expect(date?.getUTCMinutes()).toBe(59)
      })

      it('should reject second 60 (leap second not supported)', () => {
        expect(parseDate('01 Jan 2021 23:59:60 GMT')).toBeUndefined()
      })

      it('should accept second 59 (maximum valid)', () => {
        const date = parseDate('01 Jan 2021 23:59:59 GMT')
        expect(date?.getUTCSeconds()).toBe(59)
      })
    })

    describe('month edge cases', () => {
      it('should reject single character month', () => {
        expect(parseDate('01 J 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should reject two character month', () => {
        expect(parseDate('01 Ja 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should reject numeric month', () => {
        expect(parseDate('01 1 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should reject invalid month abbreviation', () => {
        expect(parseDate('01 Jax 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should accept month with trailing characters', () => {
        const date = parseDate('01 January 2021 00:00:00 GMT')
        expect(date).toBeInstanceOf(Date)
        expect(date?.getUTCMonth()).toBe(0) // January
      })
    })

    describe('invalid date combinations per RFC6265', () => {
      it('should reject Feb 30 (non-leap year) - no such date exists', () => {
        // [RFC6265 S5.1.1 Step 6](https://datatracker.ietf.org/doc/html/rfc6265#section-5.1.1):
        // "If no such date exists, abort these steps and fail to parse the cookie-date"
        expect(parseDate('30 Feb 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should reject Feb 31 (non-leap year) - no such date exists', () => {
        expect(parseDate('31 Feb 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should reject Feb 30 (leap year) - Feb only has 29 days even in leap years', () => {
        expect(parseDate('30 Feb 2020 00:00:00 GMT')).toBeUndefined()
      })

      it('should accept Feb 29 in leap year', () => {
        const date = parseDate('29 Feb 2020 00:00:00 GMT')
        expect(date).toBeInstanceOf(Date)
        expect(date?.getUTCMonth()).toBe(1) // February
        expect(date?.getUTCDate()).toBe(29)
      })

      it('should reject Feb 29 in non-leap year', () => {
        expect(parseDate('29 Feb 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should reject Apr 31 - April only has 30 days', () => {
        expect(parseDate('31 Apr 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should reject Jun 31 - June only has 30 days', () => {
        expect(parseDate('31 Jun 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should reject Sep 31 - September only has 30 days', () => {
        expect(parseDate('31 Sep 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should reject Nov 31 - November only has 30 days', () => {
        expect(parseDate('31 Nov 2021 00:00:00 GMT')).toBeUndefined()
      })

      it('should accept valid date with 31 days', () => {
        const date = parseDate('31 Jan 2021 00:00:00 GMT')
        expect(date).toBeInstanceOf(Date)
        expect(date?.getUTCDate()).toBe(31)
      })
    })

    describe('duplicate tokens', () => {
      it('should use first time when duplicate times present', () => {
        const date = parseDate('01 Jan 2021 10:00:00 GMT 20:00:00')
        expect(date?.getUTCHours()).toBe(10)
      })

      it('should use first month when duplicate months present', () => {
        const date = parseDate('Jan Feb 01 2021 10:00:00 GMT')
        expect(date?.getUTCMonth()).toBe(0) // January
      })

      it('should use first year when duplicate years present', () => {
        const date = parseDate('01 Jan 2021 2022 10:00:00 GMT')
        expect(date?.getUTCFullYear()).toBe(2021)
      })

      it('should parse day then year correctly (not duplicate day)', () => {
        // Note: "15" becomes year 2015, not a duplicate day
        // This is correct per RFC6265 - once day is set, next 2-4 digit number is year
        const date = parseDate('01 15 Jan 10:00:00 GMT')
        expect(date?.getUTCDate()).toBe(1)
        expect(date?.getUTCFullYear()).toBe(2015)
      })
    })

    describe('delimiter handling', () => {
      it('should handle consecutive spaces', () => {
        const date = parseDate('01  Jan  2021  10:00:00  GMT')
        expect(date).toBeInstanceOf(Date)
        expect(date?.getUTCFullYear()).toBe(2021)
      })

      it('should handle mixed delimiters', () => {
        const date = parseDate('01,,Jan,,2021,,10:00:00,,GMT')
        expect(date).toBeInstanceOf(Date)
        expect(date?.getUTCFullYear()).toBe(2021)
      })
    })
  })
})
