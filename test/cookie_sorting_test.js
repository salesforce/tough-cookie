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
var Cookie = tough.Cookie;

vows
  .describe('Cookie sorting')
  .addBatch({
    "Cookie Sorting": {
      topic: function () {
        var cookies = [];
        var now = Date.now();
        cookies.push(Cookie.parse("a=0; Domain=example.com"));
        cookies.push(Cookie.parse("b=1; Domain=www.example.com"));
        cookies.push(Cookie.parse("c=2; Domain=example.com; Path=/pathA"));
        cookies.push(Cookie.parse("d=3; Domain=www.example.com; Path=/pathA"));
        cookies.push(Cookie.parse("e=4; Domain=example.com; Path=/pathA/pathB"));
        cookies.push(Cookie.parse("f=5; Domain=www.example.com; Path=/pathA/pathB"));

        // force a stable creation time consistent with the order above since
        // some may have been created at now + 1ms.
        var i = cookies.length;
        cookies.forEach(function (cookie) {
          cookie.creation = new Date(now - 100 * (i--));
        });

        // weak shuffle:
        cookies = cookies.sort(function () {
          return Math.random() - 0.5
        });

        cookies = cookies.sort(tough.cookieCompare);
        return cookies;
      },
      "got": function (cookies) {
        assert.lengthOf(cookies, 6);
        var names = cookies.map(function (c) {
          return c.key
        });
        assert.deepEqual(names, ['e', 'f', 'c', 'd', 'a', 'b']);
      }
    }
  })
  .export(module);
