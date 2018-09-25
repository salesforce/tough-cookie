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
          'modify=authorized; SameSite=strict',
          'view=okay; SameSite=lax',
          'ambient=whatever' // none
        ].forEach(function(str) {
          jar.setCookieSync(Cookie.parse(str), url, options);
        });
        return jar;
      },
      "when making a same-site request": {
        topic: function(jar) {
          jar.getCookies(this.url, {sameSite: 'strict'}, this.callback);
        },
        "all three cookies are returned": function(cookies) {
          assert.equal(cookies.length, 3);
        }
      },
      "when making a lax request": {
        topic: function(jar) {
          jar.getCookies(this.url, {sameSite: 'lax'}, this.callback);
        },
        "only two cookies are returned": function(cookies) {
          assert.equal(cookies.length, 2);
        },
        "the strict one is omitted": function(cookies) {
          cookies.forEach(function(c) {
            assert.notEqual(c.key, 'modify');
          });
        }
      },
      "when making a cross-origin request": {
        topic: function(jar) {
          jar.getCookies(this.url, {sameSite: 'none'}, this.callback);
        },
        "only one cookie is returned": function(cookies) {
          assert.equal(cookies.length, 1);
        },
        "and it's the one without same-site": function(cookies) {
          assert.equal(cookies[0].key, 'ambient');
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
  .export(module);
