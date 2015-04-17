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
  .describe('Lifetime')
  .addBatch({
    "TTL with max-age": function () {
      var c = new Cookie();
      c.maxAge = 123;
      assert.equal(c.TTL(), 123000);
      assert.equal(c.expiryTime(new Date(9000000)), 9123000);
    },
    "TTL with zero max-age": function () {
      var c = new Cookie();
      c.key = 'a';
      c.value = 'b';
      c.maxAge = 0; // should be treated as "earliest representable"
      assert.equal(c.TTL(), 0);
      assert.equal(c.expiryTime(new Date(9000000)), -Infinity);
      assert.ok(!c.validate()); // not valid, really: non-zero-digit *DIGIT
    },
    "TTL with negative max-age": function () {
      var c = new Cookie();
      c.key = 'a';
      c.value = 'b';
      c.maxAge = -1; // should be treated as "earliest representable"
      assert.equal(c.TTL(), 0);
      assert.equal(c.expiryTime(new Date(9000000)), -Infinity);
      assert.ok(!c.validate()); // not valid, really: non-zero-digit *DIGIT
    },
    "TTL with max-age and expires": function () {
      var c = new Cookie();
      c.maxAge = 123;
      c.expires = new Date(Date.now() + 9000);
      assert.equal(c.TTL(), 123000);
      assert.ok(c.isPersistent());
    },
    "TTL with expires": function () {
      var c = new Cookie();
      var now = Date.now();
      c.expires = new Date(now + 9000);
      assert.equal(c.TTL(now), 9000);
      assert.equal(c.expiryTime(), c.expires.getTime());
    },
    "TTL with old expires": function () {
      var c = new Cookie();
      c.setExpires('17 Oct 2010 00:00:00 GMT');
      assert.ok(c.TTL() < 0);
      assert.ok(c.isPersistent());
    },
    "default TTL": {
      topic: function () {
        return new Cookie();
      },
      "is Infinite-future": function (c) {
        assert.equal(c.TTL(), Infinity)
      },
      "is a 'session' cookie": function (c) {
        assert.ok(!c.isPersistent())
      }
    }
  })
  .export(module);
