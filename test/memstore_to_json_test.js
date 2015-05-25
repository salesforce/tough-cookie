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
var Cookie = tough.Cookie;
var CookieJar = tough.CookieJar;
var Store = tough.Store;
var MemoryCookieStore = tough.MemoryCookieStore;
var VERSION = require('../package.json').version;

var domains = ['example.com','www.example.com','example.net'];
var paths = ['/','/foo','/foo/bar'];

function setUp(context) {
  context.now = new Date();
  context.nowISO = context.now.toISOString();
  context.expires = new Date(context.now.getTime() + 86400000);

  var c, domain;
  context.jar = new CookieJar();

  context.totalCookies = 0;
  for (var i = 0; i<domains.length; i++) {
    domain = domains[i];
    for (var j = 0; j<paths.length; j++) {
      var path = paths[j];
      c = new Cookie({
        expires: context.expires,
        domain: domain,
        path: path,
        key: 'key',
        value: 'value'+i+j
      });
      context.jar.setCookieSync(c, 'http://'+domain+'/', {now: context.now});
      context.totalCookies++;
    }
  }

  // corner cases
  domain = 'example.com';
  var cornerCases = [
    { expires: 'Infinity', key: 'infExp', value: 'infExp' },
    { maxAge: 3600, key: 'max', value: 'max' },
    { expires: context.expires, key: 'flags', value: 'flags',
      secure: true, httpOnly: true },
    { expires: context.expires, key: 'honly', value: 'honly',
      hostOnly: true, domain: 'www.example.org' },
  ];
  c = new Cookie({
  });

  for (var i = 0; i<cornerCases.length; i++) {
    cornerCases[i].domain = cornerCases[i].domain || 'example.org';
    cornerCases[i].path = '/';
    c = new Cookie(cornerCases[i]);
    context.jar.setCookieSync(c, 'https://www.example.org/', {now: context.now});
    context.totalCookies++;
  }
}

vows
  .describe('CookieJar serialization')
  .addBatch({
    "For Stores without getAllCookies": {
      topic: function() {
        var store = new Store();
        store.synchronous = true;
        var jar = new CookieJar(store);
        return jar;
      },
      "Cannot call toJSON": function(jar) {
        assert.throws(function() {
          jar.toJSON();
        }, 'getAllCookies is not implemented (therefore jar cannot be serialized)');
      }
    }
  })
  .addBatch({
    "For async stores": {
      topic: function() {
        var store = new MemoryCookieStore();
        store.synchronous = false; // pretend it's async
        var jar = new CookieJar(store);
        return jar;
      },
      "Cannot call toJSON": function(jar) {
        assert.throws(function() {
          jar.toJSON();
        }, 'CookieJar store is not synchronous; use async API instead.');
      }
    }
  })
  .addBatch({
    "With a simple store": {
      topic: function() {
        setUp(this);
        this.jar.serialize(this.callback);
      },

      "has expected metadata": function(err,jsonObj) {
        assert.isNull(err);
        assert.equal(jsonObj.version, 'tough-cookie@'+VERSION);
        assert.isTrue(jsonObj.rejectPublicSuffixes);
        assert.equal(jsonObj.storeType, 'MemoryCookieStore');
      },
      "has a bunch of objects as 'raw' cookies": function(jsonObj) {
        assert.isArray(jsonObj.cookies);
        assert.equal(jsonObj.cookies.length, this.totalCookies);

        jsonObj.cookies.forEach(function(cookie) {
          assert.isFalse(cookie instanceof Cookie);

          if (cookie.key === 'key') {
            assert.match(cookie.value, /^value\d\d/);
          }

          if (cookie.key === 'infExp' || cookie.key === 'max') {
            assert.isUndefined(cookie.expires);
          } else {
            assert.typeOf(cookie.expires, 'string');
          }

          if (cookie.key === 'max') {
            assert.strictEqual(cookie.maxAge, 3600);
          } else {
            assert.isUndefined(cookie.maxAge);
          }

          assert.equal(cookie.hostOnly, cookie.key === 'honly');

          if (cookie.key === 'flags') {
            assert.isTrue(cookie.secure);
            assert.isTrue(cookie.httpOnly);
          } else {
            assert.isUndefined(cookie.secure);
            assert.isUndefined(cookie.httpOnly);
          }

          // i.e., not Date objects
          assert.strictEqual(cookie.creation, this.nowISO);
          assert.strictEqual(cookie.lastAccessed, this.nowISO);

        }.bind(this));
      },

      "then taking it for a round-trip": {
        topic: function(jsonObj) {
          CookieJar.deserialize(jsonObj, this.callback);
        },
        "memstore index is identical": function(err,newJar) {
          assert.deepEqual(newJar.store.idx['example.org'],
                           this.jar.store.idx['example.org']);
          // assert.deepEqual(newJar.store.idx, this.jar.store.idx);
        },
        "then spot-check retrieval": {
          topic: function(newJar) {
            newJar.getCookies('http://example.org/', this.callback);
          },
          "gets expected infExp cookie": function(results) {
            assert.isArray(results);
            assert.equal(results.length, 2);

            results.forEach(function(cookie) {
              assert.instanceOf(cookie, Cookie);

              if (cookie.key === 'infExp') {
                assert.strictEqual(cookie.expires, "Infinity");
                assert.strictEqual(cookie.TTL(this.now), Infinity);
              } else if (cookie.key === 'max') {
                assert.strictEqual(cookie.TTL(this.now), 3600*1000);
              } else {
                assert.fail('Unexpected cookie key');
              }
            }.bind(this));
          }
        }
      }
    }
  })
  .export(module);
