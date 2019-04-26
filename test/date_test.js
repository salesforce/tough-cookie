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

"use strict";
const vows = require("vows");
const assert = require("assert");
const tough = require("../lib/cookie");

function dateVows(table) {
  const theVows = {};
  Object.keys(table).forEach(date => {
    const expect = table[date];
    theVows[date] = function() {
      const got = tough.parseDate(date) ? true : false;
      if (expect && !got) {
        assert.ok(false, "expected valid date but was invalid");
      } else if (!expect && got) {
        assert.ok(false, "expected invalid date but was valid");
      } else {
        assert.ok(true);
      }
    };
  });
  return { "date parsing": theVows };
}

function equivalenceVows(table) {
  const theVows = {};
  Object.keys(table).forEach(thisDate => {
    const sameAs = table[thisDate];
    const label = `'${thisDate}' parses the same as '${sameAs}'`;
    theVows[label] = function() {
      const expected = tough.parseDate(sameAs);
      const actual = tough.parseDate(thisDate);
      if (!expected && !actual) {
        assert.ok(false, "both dates failed to parse!");
      }
      assert.equal(actual.toString(), expected.toString());
    };
  });
  return { "equivalence parsing": theVows };
}

const TOO_MANY_XS = String("x").repeat(65535);

vows
  .describe("Date")
  .addBatch(
    dateVows({
      "Wed, 09 Jun 2021 10:18:14 GMT": true,
      "Wed, 09 JUN 2021 10:18:14 GMT": true,
      "Wed, 09 Jun 2021 22:18:14 GMT": true,
      "Tue, 18 Oct 2011 07:42:42.123 GMT": true,
      "18 Oct 2011 07:42:42 GMT": true,
      "8 Oct 2011 7:42:42 GMT": true,
      "8 Oct 2011 7:2:42 GMT": true,
      "8 Oct 2011 7:2:2 GMT": true,
      "Oct 18 2011 07:42:42 GMT": true,
      "Tue Oct 18 2011 07:05:03 GMT+0000 (GMT)": true,
      "09 Jun 2021 10:18:14 GMT": true,
      "99 Jix 3038 48:86:72 ZMT": false,
      "01 Jan 1970 00:00:00 GMT": true,
      "01 Jan 1600 00:00:00 GMT": false, // before 1601
      "01 Jan 1601 00:00:00 GMT": true,
      "10 Feb 81 13:00:00 GMT": true, // implicit year
      "Thu, 17-Apr-2014 02:12:29 GMT": true, // dashes
      "Thu, 17-Apr-2014 02:12:29 UTC": true, // dashes and UTC

      // garbage after parts:
      "Wedxxx, 09 Jun 2021 10:18:14 GMT": true, // day of week doesn't matter
      "Wed, 09e9 Jun 2021 10:18:14 GMT": true, // garbage after day ignored
      "Wed, 09 Junxxx 2021 10:18:14 GMT": true, // prefix match on month
      "Wed, 09 Jun 2021e9 10:18:14 GMT": true, // garbage after year OK
      "Wed, 09 Jun 2021 10e9:18:14 GMT": false, // can't have garbage after HH
      "Wed, 09 Jun 2021 10:18e9:14 GMT": false, // can't have garbage after MM
      "Wed, 09 Jun 2021 10:18:14e9 GMT": true, // garbage after SS ignored

      // extra digit in time parts:
      "Thu, 01 Jan 1970 000:00:01 GMT": false,
      "Thu, 01 Jan 1970 00:000:01 GMT": false,
      "Thu, 01 Jan 1970 00:00:010 GMT": false,

      // hex in time
      "Wed, 09 Jun 2021 1a:33:44 GMT": false,
      "Wed, 09 Jun 2021 a1:33:44 GMT": false,
      "Wed, 09 Jun 2021 11:f3:44 GMT": false,
      "Wed, 09 Jun 2021 11:3f:44 GMT": false,
      "Wed, 09 Jun 2021 11:33:e4 GMT": false,
      "Wed, 09 Jun 2021 11:33:4e GMT": true, // garbage after seconds is OK

      // negatives in time
      "Wed, 09 Jun 2021 -1:33:44 GMT": true, // parses as 1:33; - is a delimiter
      "Wed, 09 Jun 2021 11:-3:44 GMT": false,
      "Wed, 09 Jun 2021 11:33:-4 GMT": false,

      "": false
    })
  )
  .addBatch({
    "reDos hr": {
      topic: function() {
        const str = `Wed, 09 Jun 2021 10${TOO_MANY_XS}:18:14 GMT`;
        return tough.parseDate(str, true) ? true : false;
      },
      invalid: function(date) {
        assert.equal(date, false);
      }
    },
    "reDos min": {
      topic: function() {
        const str = `Wed, 09 Jun 2021 10:18${TOO_MANY_XS}:14 GMT`;
        return tough.parseDate(str, true) ? true : false;
      },
      invalid: function(date) {
        assert.equal(date, false);
      }
    },
    "reDos sec": {
      topic: function() {
        const str = `Wed, 09 Jun 2021 10:18:14${TOO_MANY_XS} GMT`;
        return tough.parseDate(str, true) ? true : false;
      },
      valid: function(date) {
        assert.equal(date, true);
      }
    }
  })
  .addBatch(
    equivalenceVows({
      // milliseconds ignored
      "Tue, 18 Oct 2011 07:42:42.123 GMT": "Tue, 18 Oct 2011 07:42:42 GMT",

      // shorter HH:MM:SS works how you'd expect:
      "8 Oct 2011 7:32:42 GMT": "8 Oct 2011 07:32:42 GMT",
      "8 Oct 2011 7:2:42 GMT": "8 Oct 2011 07:02:42 GMT",
      "8 Oct 2011 7:2:2 GMT": "8 Oct 2011 07:02:02 GMT",

      // MDY versus DMY:
      "Oct 18 2011 07:42:42 GMT": "18 Oct 2011 07:42:42 GMT",

      // some other messy auto format
      "Tue Oct 18 2011 07:05:03 GMT+0000 (GMT)":
        "Tue, 18 Oct 2011 07:05:03 GMT",

      // short year
      "10 Feb 81 13:00:00 GMT": "10 Feb 1981 13:00:00 GMT",
      "10 Feb 17 13:00:00 GMT": "10 Feb 2017 13:00:00 GMT",

      // dashes
      "Thu, 17-Apr-2014 02:12:29 GMT": "Thu, 17 Apr 2014 02:12:29 GMT",
      // dashes and "UTC" (timezone is always ignored)
      "Thu, 17-Apr-2014 02:12:29 UTC": "Thu, 17 Apr 2014 02:12:29 GMT",

      // no weekday
      "09 Jun 2021 10:18:14 GMT": "Wed, 09 Jun 2021 10:18:14 GMT",

      // garbage after seconds is OK
      "Wed, 09 Jun 2021 11:33:4e GMT": "Wed, 09 Jun 2021 11:33:04 GMT",

      // - is delimiter in this position
      "Wed, 09 Jun 2021 -1:33:44 GMT": "Wed, 09 Jun 2021 01:33:44 GMT",

      // prefix match on month
      "Wed, 09 Junxxx 2021 10:18:14 GMT": "Wed, 09 Jun 2021 10:18:14 GMT",
      "09 November 2021 10:18:14 GMT": "09 Nov 2021 10:18:14 GMT",

      // case of Month
      "Wed, 09 JUN 2021 10:18:14 GMT": "Wed, 09 Jun 2021 10:18:14 GMT",
      "Wed, 09 jUN 2021 10:18:14 GMT": "Wed, 09 Jun 2021 10:18:14 GMT",

      // test the framework :wink:
      "Wed, 09 Jun 2021 10:18:14 GMT": "Wed, 09 Jun 2021 10:18:14 GMT"
    })
  )
  .export(module);
