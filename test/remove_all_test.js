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
"use strict";
const util = require("util");
const vows = require("vows");
const assert = require("assert");
const async = require("async");
const tough = require("../lib/cookie");
const Cookie = tough.Cookie;
const CookieJar = tough.CookieJar;
const Store = tough.Store;
const MemoryCookieStore = tough.MemoryCookieStore;

function StoreWithoutRemoveAll() {
  Store.call(this);
  this.stats = { put: 0, getAll: 0, remove: 0 };
  this.cookies = [];
}
util.inherits(StoreWithoutRemoveAll, Store);
StoreWithoutRemoveAll.prototype.synchronous = true;
StoreWithoutRemoveAll.prototype.cookies = [];
StoreWithoutRemoveAll.prototype.findCookie = function(domain, path, key, cb) {
  return cb(null, null);
};
StoreWithoutRemoveAll.prototype.findCookies = function(domain, path, key, cb) {
  return cb(null, []);
};
StoreWithoutRemoveAll.prototype.putCookie = function(cookie, cb) {
  this.stats.put++;
  this.cookies.push(cookie);
  return cb(null);
};
StoreWithoutRemoveAll.prototype.getAllCookies = function(cb) {
  this.stats.getAll++;
  return cb(null, this.cookies.slice());
};
StoreWithoutRemoveAll.prototype.removeCookie = function(domain, path, key, cb) {
  this.stats.remove++;
  return cb(null, null);
};

function MemoryStoreExtension() {
  MemoryCookieStore.call(this);
  this.stats = { getAll: 0, remove: 0, removeAll: 0 };
}
util.inherits(MemoryStoreExtension, MemoryCookieStore);
MemoryStoreExtension.prototype.getAllCookies = function(cb) {
  this.stats.getAll++;
  MemoryCookieStore.prototype.getAllCookies.call(this, cb);
};
MemoryStoreExtension.prototype.removeCookie = function(domain, path, key, cb) {
  this.stats.remove++;
  MemoryCookieStore.prototype.removeCookie.call(this, domain, path, key, cb);
};
MemoryStoreExtension.prototype.removeAllCookies = function(cb) {
  this.stats.removeAll++;
  MemoryCookieStore.prototype.removeAllCookies.call(this, cb);
};

vows
  .describe("Store removeAllCookies API")
  .addBatch({
    "With a store that doesn't implement removeAllCookies": {
      "under normal conditions": {
        topic: function() {
          const store = new StoreWithoutRemoveAll();
          const jar = new CookieJar(store);
          jar.setCookieSync("a=b", "http://example.com/index.html");
          jar.setCookieSync("c=d", "http://example.org/index.html");
          const cb = this.callback;
          jar.removeAllCookies(err => {
            return cb(err, store.stats);
          });
        },
        "Cookies are removed one-by-one": function(err, stats) {
          assert.equal(err, null);
          assert.equal(stats.put, 2);
          assert.equal(stats.getAll, 1);
          assert.equal(stats.remove, 2);
        }
      },
      "when one of the removeCookie calls fail": {
        topic: function() {
          const store = new StoreWithoutRemoveAll();
          const jar = new CookieJar(store);
          jar.setCookieSync("a=b", "http://example.com/index.html");
          jar.setCookieSync("c=d", "http://example.org/index.html");
          jar.setCookieSync("e=f", "http://example.net/index.html");
          jar.setCookieSync("g=h", "http://example.edu/index.html");

          let callNumber = 0;
          store.removeCookie = function(domain, path, key, cb) {
            callNumber++;
            if (callNumber == 4) {
              return cb(new Error(`something happened ${callNumber}`));
            }
            StoreWithoutRemoveAll.prototype.removeCookie.call(
              this,
              domain,
              path,
              key,
              cb
            );
          };

          const cb = this.callback;
          jar.removeAllCookies(err => {
            return cb(err, store.stats);
          });
        },
        "The one error gets returned": function(err, stats) {
          assert(err != null);
          assert.equal(err.message, "something happened 4");
          assert.equal(stats.put, 4);
          assert.equal(stats.getAll, 1);
          assert.equal(stats.remove, 3);
        }
      },
      "when several of the removeCookie calls fail": {
        topic: function() {
          const store = new StoreWithoutRemoveAll();
          const jar = new CookieJar(store);
          jar.setCookieSync("a=b", "http://example.com/index.html");
          jar.setCookieSync("c=d", "http://example.org/index.html");
          jar.setCookieSync("e=f", "http://example.net/index.html");
          jar.setCookieSync("g=h", "http://example.edu/index.html");

          let callNumber = 0;
          const origRemove = store.removeCookie;
          store.removeCookie = function(domain, path, key, cb) {
            callNumber++;
            if (callNumber % 2 === 1) {
              // odd calls; 1st, 3rd, etc.
              return cb(new Error(`something happened ${callNumber}`));
            }
            origRemove.call(this, domain, path, key, cb);
          };

          const cb = this.callback;
          jar.removeAllCookies(err => {
            return cb(err, store.stats);
          });
        },
        "all cookies are attemped": function(err, stats) {
          assert.equal(stats.remove, 2); // two are prevented by test harness
        },
        "only the first error is returned": function(err, stats) {
          assert.equal(err.message, "something happened 1");
        }
      }
    }
  })
  .addBatch({
    "With a store that does implement removeAllCookies": {
      topic: function() {
        const store = new MemoryStoreExtension();
        const jar = new CookieJar(store);
        jar.setCookieSync("a=b", "http://example.com/index.html");
        jar.setCookieSync("c=d", "http://example.org/index.html");
        const cb = this.callback;
        this.jar = jar;
        jar.removeAllCookies(err => {
          return cb(err, store.stats);
        });
      },
      "Cookies are removed as batch": function(err, stats) {
        assert.equal(err, null);
        assert.equal(stats.getAll, 0);
        assert.equal(stats.remove, 0);
        assert.equal(stats.removeAll, 1);
        assert.deepEqual(this.jar.store.idx, {});
      }
    }
  })
  .export(module);
