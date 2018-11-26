/*!
 * Copyright (c) 2018, Salesforce.com, Inc.
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
var Cookie = tough.Cookie;
var CookieJar = tough.CookieJar;

vows
  .describe('Same-Site Cookies')
  .addBatch({
    "Testing retrieval from a three-cookie jar": {
      topic: function() {
        var jar = new CookieJar();
        var url = this.url = 'http://example.com/index.html';
        var options = {};

        [
          'strict=authorized; SameSite=strict',
          'lax=okay; SameSite=lax',
          'normal=whatever' // none
        ].forEach(function(str) {
          jar.setCookieSync(Cookie.parse(str), url, options);
        });
        return jar;
      },
      "when making a same-site request": {
        topic: function(jar) {
          jar.getCookies(this.url, {sameSiteContext: 'strict'}, this.callback);
        },
        "all three cookies are returned": function(cookies) {
          assert.equal(cookies.length, 3);
        }
      },
      "when making a lax request": {
        topic: function(jar) {
          jar.getCookies(this.url, {sameSiteContext: 'lax'}, this.callback);
        },
        "only two cookies are returned": function(cookies) {
          assert.equal(cookies.length, 2);
        },
        "the strict one is omitted": function(cookies) {
          cookies.forEach(function(c) {
            assert.notEqual(c.key, 'strict');
          });
        }
      },
      "when making a cross-origin request": {
        topic: function(jar) {
          jar.getCookies(this.url, {sameSiteContext: 'none'}, this.callback);
        },
        "only one cookie is returned": function(cookies) {
          assert.equal(cookies.length, 1);
        },
        "and it's the one without same-site": function(cookies) {
          assert.equal(cookies[0].key, 'normal');
        }
      },
      "when making an unqualified request": {
        topic: function(jar) {
          jar.getCookies(this.url, {}, this.callback);
        },
        "all three cookies are returned": function(cookies) {
          assert.equal(cookies.length, 3);
        }
      },
    }
  })
  .addBatch({
    "Testing setting cookies": {
      topic: function() {
        var url = 'http://example.com/index.html';
        var cookies = {
          garbage: Cookie.parse('garbageIn=treatedAsNone; SameSite=garbage'),
          strict: Cookie.parse('strict=authorized; SameSite=sTrIcT'),
          lax: Cookie.parse('lax=okay; SameSite=lax'),
          normal: Cookie.parse('normal=whatever') // none
        };
        var jar = new CookieJar();
        this.callSetCookie = function(which, options, cb) {
          return jar.setCookie(cookies[which], url, options, cb);
        };
        return null;
      },
      "from same-site context": {
        topic: function() {
          return { sameSiteContext: 'strict' };
        },
        "for garbage cookie": {
          topic: function(options) {
            this.callSetCookie('garbage', options, this.callback);
          },
          "treated as 'none'": function(err, cookie) {
            assert.isNull(err);
            assert.equal(cookie.sameSite, 'none');
          }
        },
        "for strict cookie": {
          topic: function(options) {
            this.callSetCookie('strict', options, this.callback);
          },
          "has strict property": function(err, cookie) {
            assert.isNull(err);
            assert.equal(cookie.sameSite, 'strict');
          }
        },
        "for lax cookie": {
          topic: function(options) {
            this.callSetCookie('lax', options, this.callback);
          },
          "has lax property": function(err, cookie) {
            assert.isNull(err);
            assert.equal(cookie.sameSite, 'lax');
          }
        },
        "for normal cookie": {
          topic: function(options) {
            this.callSetCookie('normal', options, this.callback);
          },
          "treated as 'none'": function(err, cookie) {
            assert.isNull(err);
            assert.equal(cookie.sameSite, 'none');
          }
        },
      },

      "from cross-origin context": {
        topic: function() {
          return { sameSiteContext: 'none' };
        },
        "for strict cookie": {
          topic: function(options) {
            this.callSetCookie('strict', options, this.callback);
          },
          "is not allowed": function(err, ignored) {
            ignored = null;
            assert.ok(err instanceof Error);
            assert.equal(err.message, "Cookie is SameSite but this is a cross-origin request");
          }
        },
        "for lax cookie": {
          topic: function(options) {
            this.callSetCookie('lax', options, this.callback);
          },
          "is not allowed": function(err, ignored) {
            ignored = null;
            assert.ok(err instanceof Error);
            assert.equal(err.message, "Cookie is SameSite but this is a cross-origin request");
          }
        },
        "for normal cookie": {
          topic: function(options) {
            this.callSetCookie('normal', options, this.callback);
          },
          "is fine": function(err, ignored) { ignored = null; assert.isNull(err); }
        },
      },

      "from undefined context": {
        topic: function() {
          return {};
        },
        "for strict cookie": {
          topic: function(options) {
            this.callSetCookie('strict', options, this.callback);
          },
          "is fine": function(err, ignored) { ignored = null; assert.isNull(err); }
        },
        "for lax cookie": {
          topic: function(options) {
            this.callSetCookie('lax', options, this.callback);
          },
          "is fine": function(err, ignored) { ignored = null; assert.isNull(err); }
        },
        "for normal cookie": {
          topic: function(options) {
            this.callSetCookie('normal', options, this.callback);
          },
          "is fine": function(err, ignored) { ignored = null; assert.isNull(err); }
        },
      },
    }
  })
  .addBatch({
    "Canonicalized strings": {
      topic: function() {
        var url = 'http://example.com/index.html';
        var garbage = Cookie.parse('garbage=1');
        garbage.sameSite = 'GaRbAGe';
        var cookies = {
          garbage: garbage,
          strict: Cookie.parse('strict=1; SameSite=STRict'),
          lax: Cookie.parse('lax=1; SameSite=LAx'),
          normal: Cookie.parse('normal=1') // none
        };
        return cookies;
      },
      "garbage in, garbage out": function(cookies) {
        assert.equal(cookies.garbage.toString(), 'garbage=1; SameSite=GaRbAGe');
      },
      "strict is 'Strict'": function(cookies) {
        assert.equal(cookies.strict.toString(), 'strict=1; SameSite=Strict');
      },
      "lax is 'Lax'": function(cookies) {
        assert.equal(cookies.lax.toString(), 'lax=1; SameSite=Lax');
      },
      "normal is omitted": function(cookies) {
        assert.equal(cookies.normal.toString(), 'normal=1');
      },
    }
  })
  .export(module);
