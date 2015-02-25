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
var async = require('async');
var tough = require('../lib/cookie');
var Cookie = tough.Cookie;
var CookieJar = tough.CookieJar;

var atNow = Date.now();

function at(offset) {
  return {now: new Date(atNow + offset)};
}

vows
  .describe('Regression tests')
  .addBatch({
    "Issue 1": {
      topic: function () {
        var cj = new CookieJar();
        cj.setCookie('hello=world; path=/some/path/', 'http://domain/some/path/file', function (err, cookie) {
          this.callback(err, {cj: cj, cookie: cookie});
        }.bind(this));
      },
      "stored a cookie": function (t) {
        assert.ok(t.cookie);
      },
      "cookie's path was modified to remove unnecessary slash": function (t) {
        assert.equal(t.cookie.path, '/some/path');
      },
      "getting it back": {
        topic: function (t) {
          t.cj.getCookies('http://domain/some/path/file', function (err, cookies) {
            this.callback(err, {cj: t.cj, cookies: cookies || []});
          }.bind(this));
        },
        "got one cookie": function (t) {
          assert.lengthOf(t.cookies, 1);
        },
        "it's the right one": function (t) {
          var c = t.cookies[0];
          assert.equal(c.key, 'hello');
          assert.equal(c.value, 'world');
        }
      }
    }
  })
  .addBatch({
    "trailing semi-colon set into cj": {
      topic: function () {
        var cb = this.callback;
        var cj = new CookieJar();
        var ex = 'http://www.example.com';
        var tasks = [];
        tasks.push(function (next) {
          cj.setCookie('broken_path=testme; path=/;', ex, at(-1), next);
        });
        tasks.push(function (next) {
          cj.setCookie('b=2; Path=/;;;;', ex, at(-1), next);
        });
        async.parallel(tasks, function (err, cookies) {
          cb(null, {
            cj: cj,
            cookies: cookies
          });
        });
      },
      "check number of cookies": function (t) {
        assert.lengthOf(t.cookies, 2, "didn't set");
      },
      "check *broken_path* was set properly": function (t) {
        assert.equal(t.cookies[0].key, "broken_path");
        assert.equal(t.cookies[0].value, "testme");
        assert.equal(t.cookies[0].path, "/");
      },
      "check *b* was set properly": function (t) {
        assert.equal(t.cookies[1].key, "b");
        assert.equal(t.cookies[1].value, "2");
        assert.equal(t.cookies[1].path, "/");
      },
      "retrieve the cookie": {
        topic: function (t) {
          var cb = this.callback;
          t.cj.getCookies('http://www.example.com', {}, function (err, cookies) {
            t.cookies = cookies;
            cb(err, t);
          });
        },
        "get the cookie": function (t) {
          assert.lengthOf(t.cookies, 2);
          assert.equal(t.cookies[0].key, 'broken_path');
          assert.equal(t.cookies[0].value, 'testme');
          assert.equal(t.cookies[1].key, "b");
          assert.equal(t.cookies[1].value, "2");
          assert.equal(t.cookies[1].path, "/");
        }
      }
    }
  })
  .export(module);
