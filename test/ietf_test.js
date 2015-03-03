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
var fs = require('fs');
var path = require('path');
var url = require('url');
var tough = require('../lib/cookie');
var Cookie = tough.Cookie;
var CookieJar = tough.CookieJar;

function readJson(filePath) {
  filePath = path.join(__dirname, filePath);
  return JSON.parse(fs.readFileSync(filePath).toString());
}

function setGetCookieVows() {
  var theVows = {};
  var data = readJson('./ietf_data/parser.json');

  data.forEach(function (testCase) {
    theVows[testCase.test] = function () {
      var jar = new CookieJar();
      var setUrl = 'http://example.org/cookie-parser?' + testCase.test;
      var queryUrl = testCase['sent-to'];
      var expected = testCase['sent'];

      if (queryUrl)
        queryUrl = url.resolve('http://example.org', queryUrl);

      else
        queryUrl = 'http://example.org/cookie-parser-result?' + testCase.test;

      testCase['received'].forEach(function (cookieStr) {
        jar.setCookieSync(cookieStr, setUrl, {ignoreError: true});
      });

      var actual = jar.getCookiesSync(queryUrl);

      assert.strictEqual(actual.length, expected.length);

      actual.forEach(function (actualCookie, idx) {
        var expectedCookie = expected[idx];
        assert.strictEqual(actualCookie.key, expectedCookie.name);
        assert.strictEqual(actualCookie.value, expectedCookie.value);
      });
    };
  });

  return {'Set/get cookie tests': theVows};
}

function dateVows() {
  var theVows = {};

  [
    './ietf_data/dates/bsd-examples.json',
    './ietf_data/dates/examples.json'
  ].forEach(function (filePath) {
      var data = readJson(filePath);
      var fileName = path.basename(filePath);

      data.forEach(function (testCase) {
        theVows[fileName + ' : ' + testCase.test] = function () {
          var actual = tough.parseDate(testCase.test);
          actual = actual ? actual.toUTCString() : null;
          assert.strictEqual(actual, testCase.expected);
        };
      });
    });

  return {'Date': theVows};
}

vows
  .describe('IETF http state tests')
  .addBatch(setGetCookieVows())
  //.addBatch(dateVows())
  .export(module);
