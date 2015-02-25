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
  .describe('Cookie.toJSON()')
  .addBatch({
    "JSON": {
      "serialization": {
        topic: function() {
          var c = Cookie.parse('alpha=beta; Domain=example.com; Path=/foo; Expires=Tue, 19 Jan 2038 03:14:07 GMT; HttpOnly');
          return JSON.stringify(c);
        },
        "gives a string": function(str) {
          assert.equal(typeof str, "string");
        },
        "date is in ISO format": function(str) {
          assert.match(str, /"expires":"2038-01-19T03:14:07\.000Z"/, 'expires is in ISO format');
        }
      },
      "deserialization": {
        topic: function() {
          var json = '{"key":"alpha","value":"beta","domain":"example.com","path":"/foo","expires":"2038-01-19T03:14:07.000Z","httpOnly":true,"lastAccessed":2000000000123}';
          return Cookie.fromJSON(json);
        },
        "works": function(c) {
          assert.ok(c);
        },
        "key": function(c) { assert.equal(c.key, "alpha") },
        "value": function(c) { assert.equal(c.value, "beta") },
        "domain": function(c) { assert.equal(c.domain, "example.com") },
        "path": function(c) { assert.equal(c.path, "/foo") },
        "httpOnly": function(c) { assert.strictEqual(c.httpOnly, true) },
        "secure": function(c) { assert.strictEqual(c.secure, false) },
        "hostOnly": function(c) { assert.strictEqual(c.hostOnly, null) },
        "expires is a date object": function(c) {
          assert.equal(c.expires.getTime(), 2147483647000);
        },
        "lastAccessed is a date object": function(c) {
          assert.equal(c.lastAccessed.getTime(), 2000000000123);
        },
        "creation defaulted": function(c) {
          assert.ok(c.creation.getTime());
        }
      },
      "null deserialization": {
        topic: function() {
          return Cookie.fromJSON(null);
        },
        "is null": function(cookie) {
          assert.equal(cookie,null);
        }
      }
    },
    "expiry deserialization": {
      "Infinity": {
        topic: Cookie.fromJSON.bind(null, '{"expires":"Infinity"}'),
        "is infinite": function(c) {
          assert.strictEqual(c.expires, "Infinity");
          assert.equal(c.expires, Infinity);
        }
      }
    },
    "maxAge serialization": {
      topic: function() {
        return function(toSet) {
          var c = new Cookie();
          c.key = 'foo'; c.value = 'bar';
          c.setMaxAge(toSet);
          return JSON.stringify(c);
        };
      },
      "zero": {
        topic: function(f) { return f(0) },
        "looks good": function(str) {
          assert.match(str, /"maxAge":0/);
        }
      },
      "Infinity": {
        topic: function(f) { return f(Infinity) },
        "looks good": function(str) {
          assert.match(str, /"maxAge":"Infinity"/);
        }
      },
      "-Infinity": {
        topic: function(f) { return f(-Infinity) },
        "looks good": function(str) {
          assert.match(str, /"maxAge":"-Infinity"/);
        }
      },
      "null": {
        topic: function(f) { return f(null) },
        "looks good": function(str) {
          assert.match(str, /"maxAge":null/);
        }
      }
    },
    "maxAge deserialization": {
      "number": {
        topic: Cookie.fromJSON.bind(null,'{"key":"foo","value":"bar","maxAge":123}'),
        "is the number": function(c) {
          assert.strictEqual(c.maxAge, 123);
        }
      },
      "null": {
        topic: Cookie.fromJSON.bind(null,'{"key":"foo","value":"bar","maxAge":null}'),
        "is null": function(c) {
          assert.strictEqual(c.maxAge, null);
        }
      },
      "less than zero": {
        topic: Cookie.fromJSON.bind(null,'{"key":"foo","value":"bar","maxAge":-123}'),
        "is -123": function(c) {
          assert.strictEqual(c.maxAge, -123);
        }
      },
      "Infinity": {
        topic: Cookie.fromJSON.bind(null,'{"key":"foo","value":"bar","maxAge":"Infinity"}'),
        "is inf-as-string": function(c) {
          assert.strictEqual(c.maxAge, "Infinity");
        }
      },
      "-Infinity": {
        topic: Cookie.fromJSON.bind(null,'{"key":"foo","value":"bar","maxAge":"-Infinity"}'),
        "is inf-as-string": function(c) {
          assert.strictEqual(c.maxAge, "-Infinity");
        }
      }
    }
  })
  .export(module);
