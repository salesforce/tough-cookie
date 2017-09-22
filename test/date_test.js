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

'use strict';
var vows = require('vows');
var assert = require('assert');
var tough = require('../lib/cookie');
require('string.prototype.repeat'); // polyfill

function dateVows(table) {
  var theVows = {};
  Object.keys(table).forEach(function (date) {
    var expect = table[date];
    theVows[date] = function () {
      var got = tough.parseDate(date) ? true : false;
      if (expect && !got) {
        assert.ok(false, "expected valid date but was invalid");
      } else if (!expect && got) {
        assert.ok(false, "expected invalid date but was valid");
      } else {
        assert.ok(true);
      }
    };
  });
  return {"date parsing": theVows};
}

var TOO_MANY_XS = String("x").repeat(65535);

vows
  .describe('Date')
  .addBatch(dateVows({
    "Wed, 09 Jun 2021 10:18:14 GMT": true,
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
    '01 Jan 1970 00:00:00 GMT': true,
    '01 Jan 1600 00:00:00 GMT': false, // before 1601
    '01 Jan 1601 00:00:00 GMT': true,
    '10 Feb 81 13:00:00 GMT': true, // implicit year
    'Thu, 17-Apr-2014 02:12:29 GMT': true, // dashes
    'Thu, 17-Apr-2014 02:12:29 UTC': true,  // dashes and UTC

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

    "": false
  }))
  .addBatch({
    "reDos hr": {
      topic: function () {
        var str = "Wed, 09 Jun 2021 10" + TOO_MANY_XS + ":18:14 GMT";
        return tough.parseDate(str, true) ? true : false;
      },
      "invalid": function (date) {
        assert.equal(date, false);
      }
    },
    "reDos min": {
      topic: function () {
        var str = "Wed, 09 Jun 2021 10:18" + TOO_MANY_XS + ":14 GMT";
        return tough.parseDate(str, true) ? true : false;
      },
      "invalid": function (date) {
        assert.equal(date, false);
      }
    },
    "reDos sec": {
      topic: function () {
        var str = "Wed, 09 Jun 2021 10:18:14" + TOO_MANY_XS + " GMT";
        return tough.parseDate(str, true) ? true : false;
      },
      "valid": function (date) {
        assert.equal(date, true);
      }
    }
  })
  .export(module);
