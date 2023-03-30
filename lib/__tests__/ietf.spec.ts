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

import {CookieJar, parseDate} from '../cookie'
import url from 'url'
import parserData from '../../test/ietf_data/parser.json'
import bsdExampleDates from '../../test/ietf_data/dates/bsd-examples.json'
import exampleDates from '../../test/ietf_data/dates/examples.json'

describe('IETF http state tests', () => {
  describe('Set/get cookie tests', () => {
    it.each(parserData)
    (`$test`, (testCase) => {
      const jar = new CookieJar();
      const expected = testCase.sent
      const sentFrom = `http://home.example.org/cookie-parser?${testCase.test}`;
      const sentTo = testCase["sent-to"]
        ? url.resolve("http://home.example.org", testCase["sent-to"])
        : `http://home.example.org/cookie-parser-result?${testCase.test}`;

      testCase["received"].forEach(cookieStr => {
        jar.setCookieSync(cookieStr, sentFrom, {ignoreError: true});
      });

      const actual = jar.getCookiesSync(sentTo, {sort: true}) as Array<{ key: string, value: string }>;

      expect(actual.length).toBe(expected.length)
      actual.forEach((actualCookie, idx) => {
        const expectedCookie = expected[idx];
        // @ts-ignore
        expect(actualCookie.key).toBe(expectedCookie.name)
        // @ts-ignore
        expect(actualCookie.value).toBe(expectedCookie.value)
      });
    })
  })

  describe('Date handling', () => {
    it.each(exampleDates)
    (`ietf_data/dates/examples: $test`, ({test, expected}) => {
      if (expected) {
        // @ts-ignore
        expect(parseDate(test).toUTCString()).toBe(expected)
      } else {
        expect(parseDate(test)).toBeUndefined()
      }
    })

    it.each(bsdExampleDates)
    (`ietf_data/dates/bsd_examples: $test`, ({test, expected}) => {
      if (expected) {
        // @ts-ignore
        expect(parseDate(test).toUTCString()).toBe(expected)
      } else {
        expect(parseDate(test)).toBeUndefined()
      }
    })
  })
})
