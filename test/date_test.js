/*
 * Copyright GoInstant, Inc. and other contributors. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

'use strict';
var vows = require('vows');
var assert = require('assert');
var tough = require('../lib/cookie');

function dateVows(table) {
  var theVows = {};
  Object.keys(table).forEach(function (date) {
    var expect = table[date];
    theVows[date] = function () {
      var got = tough.parseDate(date) ? 'valid' : 'invalid';
      assert.equal(got, expect ? 'valid' : 'invalid');
    };
  });
  return {"date parsing": theVows};
}

vows
  .describe('Date')
  .addBatch(dateVows({
    "Wed, 09 Jun 2021 10:18:14 GMT": true,
    "Wed, 09 Jun 2021 22:18:14 GMT": true,
    "Tue, 18 Oct 2011 07:42:42.123 GMT": true,
    "18 Oct 2011 07:42:42 GMT": true,
    "8 Oct 2011 7:42:42 GMT": true,
    "8 Oct 2011 7:2:42 GMT": true,
    "Oct 18 2011 07:42:42 GMT": true,
    "Tue Oct 18 2011 07:05:03 GMT+0000 (GMT)": true,
    "09 Jun 2021 10:18:14 GMT": true,
    "99 Jix 3038 48:86:72 ZMT": false,
    '01 Jan 1970 00:00:00 GMT': true,
    '01 Jan 1600 00:00:00 GMT': false, // before 1601
    '01 Jan 1601 00:00:00 GMT': true,
    '10 Feb 81 13:00:00 GMT': true, // implicit year
    'Thu, 01 Jan 1970 00:00:010 GMT': true, // strange time, non-strict OK
    'Thu, 17-Apr-2014 02:12:29 GMT': true, // dashes
    'Thu, 17-Apr-2014 02:12:29 UTC': true  // dashes and UTC
  }))
  .addBatch({
    "strict date parse of Thu, 01 Jan 1970 00:00:010 GMT": {
      topic: function () {
        return tough.parseDate('Thu, 01 Jan 1970 00:00:010 GMT', true) ? true : false;
      },
      "invalid": function (date) {
        assert.equal(date, false);
      }
    }
  })
  .export(module);
