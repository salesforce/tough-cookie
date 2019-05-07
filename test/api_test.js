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

const atNow = Date.now();

function at(offset) {
  return { now: new Date(atNow + offset) };
}

vows
  .describe("API")
  .addBatch({
    "All defined": function() {
      assert.ok(Cookie);
      assert.ok(CookieJar);
    }
  })
  .addBatch({
    Version: function() {
      assert.equal(tough.version, require("../package.json").version);
    }
  })
  .addBatch({
    Constructor: {
      topic: function() {
        return new Cookie({
          key: "test",
          value: "b",
          maxAge: 60
        });
      },
      "check for key property": function(c) {
        assert.ok(c);
        assert.equal(c.key, "test");
      },
      "check for value property": function(c) {
        assert.equal(c.value, "b");
      },
      "check for maxAge": function(c) {
        assert.equal(c.maxAge, 60);
      },
      "check for default values for unspecified properties": function(c) {
        assert.equal(c.expires, "Infinity");
        assert.equal(c.secure, false);
        assert.equal(c.httpOnly, false);
      }
    }
  })
  .addBatch({
    "expiry option": {
      topic: function() {
        const cb = this.callback;
        const cj = new CookieJar();
        cj.setCookie(
          "near=expiry; Domain=example.com; Path=/; Max-Age=1",
          "http://www.example.com",
          at(-1),
          (err, cookie) => {
            cb(err, { cj: cj, cookie: cookie });
          }
        );
      },
      "set the cookie": function(t) {
        assert.ok(t.cookie, "didn't set?!");
        assert.equal(t.cookie.key, "near");
      },
      "then, retrieving": {
        topic: function(t) {
          const cb = this.callback;
          setTimeout(() => {
            t.cj.getCookies(
              "http://www.example.com",
              { http: true, expire: false },
              (err, cookies) => {
                t.cookies = cookies;
                cb(err, t);
              }
            );
          }, 2000);
        },
        "got the cookie": function(t) {
          assert.lengthOf(t.cookies, 1);
          assert.equal(t.cookies[0].key, "near");
        }
      }
    }
  })
  .addBatch({
    "allPaths option": {
      topic: function() {
        const cj = new CookieJar();
        const apex = "http://example.com";
        const www = "http://www.example.com";
        const other = "http://other.example.com";
        const tasks = [
          ["nopath_dom=qq; Path=/; Domain=example.com", apex, {}],
          ["path_dom=qq; Path=/foo; Domain=example.com", apex, {}],
          ["nopath_host=qq; Path=/", www, {}],
          ["path_host=qq; Path=/foo", www, {}],
          ["other=qq; Path=/", other, {}],
          ["other2=qq; Path=/foo", `${other}/foo`, {}]
        ].map(args => cb => cj.setCookie(...args, cb));
        const cb = this.callback;
        async.parallel(tasks, (err, results) => {
          cb(err, { cj: cj, cookies: results });
        });
      },
      "all set": function(t) {
        assert.equal(t.cookies.length, 6);
        assert.ok(
          t.cookies.every(c => {
            return !!c;
          })
        );
      },
      "getting without allPaths": {
        topic: function(t) {
          const cb = this.callback;
          const cj = t.cj;
          cj.getCookies("http://www.example.com/", {}, (err, cookies) => {
            cb(err, { cj: cj, cookies: cookies });
          });
        },
        "found just two cookies": function(t) {
          assert.equal(t.cookies.length, 2);
        },
        "all are path=/": function(t) {
          assert.ok(
            t.cookies.every(c => {
              return c.path === "/";
            })
          );
        },
        "no 'other' cookies": function(t) {
          assert.ok(
            !t.cookies.some(c => {
              return /^other/.test(c.name);
            })
          );
        }
      },
      "getting without allPaths for /foo": {
        topic: function(t) {
          const cb = this.callback;
          const cj = t.cj;
          cj.getCookies("http://www.example.com/foo", {}, (err, cookies) => {
            cb(err, { cj: cj, cookies: cookies });
          });
        },
        "found four cookies": function(t) {
          assert.equal(t.cookies.length, 4);
        },
        "no 'other' cookies": function(t) {
          assert.ok(
            !t.cookies.some(c => {
              return /^other/.test(c.name);
            })
          );
        }
      },
      "getting with allPaths:true": {
        topic: function(t) {
          const cb = this.callback;
          const cj = t.cj;
          cj.getCookies(
            "http://www.example.com/",
            { allPaths: true },
            (err, cookies) => {
              cb(err, { cj: cj, cookies: cookies });
            }
          );
        },
        "found four cookies": function(t) {
          assert.equal(t.cookies.length, 4);
        },
        "no 'other' cookies": function(t) {
          assert.ok(
            !t.cookies.some(c => {
              return /^other/.test(c.name);
            })
          );
        }
      }
    }
  })
  .addBatch({
    "Remove cookies": {
      topic: function() {
        const jar = new CookieJar();
        const cookie = Cookie.parse("a=b; Domain=example.com; Path=/");
        const cookie2 = Cookie.parse("a=b; Domain=foo.com; Path=/");
        const cookie3 = Cookie.parse("foo=bar; Domain=foo.com; Path=/");
        async.parallel(
          [
            [cookie, "http://example.com/index.html"],
            [cookie2, "http://foo.com/index.html"],
            [cookie3, "http://foo.com/index.html"]
          ].map(args => cb => jar.setCookie(...args, cb)),
          err => {
            this.callback(err, jar);
          }
        );
      },
      "all from matching domain": function(jar) {
        jar.store.removeCookies("example.com", null, err => {
          assert(err == null);

          jar.store.findCookies("example.com", null, (err, cookies) => {
            assert(err == null);
            assert(cookies != null);
            assert(cookies.length === 0, "cookie was not removed");
          });

          jar.store.findCookies("foo.com", null, (err, cookies) => {
            assert(err == null);
            assert(cookies != null);
            assert(
              cookies.length === 2,
              "cookies should not have been removed"
            );
          });
        });
      },
      "from cookie store matching domain and key": function(jar) {
        jar.store.removeCookie("foo.com", "/", "foo", err => {
          assert(err == null);

          jar.store.findCookies("foo.com", null, (err, cookies) => {
            assert(err == null);
            assert(cookies != null);
            assert(cookies.length === 1, "cookie was not removed correctly");
            assert(cookies[0].key === "a", "wrong cookie was removed");
          });
        });
      }
    }
  })
  .addBatch({
    "Synchronous CookieJar": {
      setCookieSync: {
        topic: function() {
          const jar = new CookieJar();
          let cookie = Cookie.parse("a=b; Domain=example.com; Path=/");
          cookie = jar.setCookieSync(cookie, "http://example.com/index.html");
          return cookie;
        },
        "returns a copy of the cookie": function(cookie) {
          assert.instanceOf(cookie, Cookie);
        }
      },

      getCookiesSync: {
        topic: function() {
          const jar = new CookieJar();
          const url = "http://example.com/index.html";
          jar.setCookieSync("a=b; Domain=example.com; Path=/", url);
          jar.setCookieSync("c=d; Domain=example.com; Path=/", url);
          return jar.getCookiesSync(url);
        },
        "returns the cookie array": function(err, cookies) {
          assert.ok(!err);
          assert.ok(Array.isArray(cookies));
          assert.lengthOf(cookies, 2);
          cookies.forEach(cookie => {
            assert.instanceOf(cookie, Cookie);
          });
        }
      },

      getCookieStringSync: {
        topic: function() {
          const jar = new CookieJar();
          const url = "http://example.com/index.html";
          jar.setCookieSync("a=b; Domain=example.com; Path=/", url);
          jar.setCookieSync("c=d; Domain=example.com; Path=/", url);
          return jar.getCookieStringSync(url);
        },
        "returns the cookie header string": function(err, str) {
          assert.ok(!err);
          assert.typeOf(str, "string");
        }
      },

      getSetCookieStringsSync: {
        topic: function() {
          const jar = new CookieJar();
          const url = "http://example.com/index.html";
          jar.setCookieSync("a=b; Domain=example.com; Path=/", url);
          jar.setCookieSync("c=d; Domain=example.com; Path=/", url);
          return jar.getSetCookieStringsSync(url);
        },
        "returns the cookie header string": function(err, headers) {
          assert.ok(!err);
          assert.ok(Array.isArray(headers));
          assert.lengthOf(headers, 2);
          headers.forEach(header => {
            assert.typeOf(header, "string");
          });
        }
      },

      removeAllCookiesSync: {
        topic: function() {
          const jar = new CookieJar();
          const cookie1 = Cookie.parse("a=b; Domain=example.com; Path=/");
          const cookie2 = Cookie.parse("a=b; Domain=foo.com; Path=/");
          const cookie3 = Cookie.parse("foo=bar; Domain=foo.com; Path=/");
          jar.setCookieSync(cookie1, "http://example.com/index.html");
          jar.setCookieSync(cookie2, "http://foo.com/index.html");
          jar.setCookieSync(cookie3, "http://foo.com/index.html");

          jar.removeAllCookiesSync();

          jar.store.getAllCookies(this.callback);
        },
        "no cookies in the jar": function(err, cookies) {
          assert(err == null);
          assert(cookies != null);
          assert(cookies.length === 0, "cookies were not removed");
        }
      }
    }
  })
  .addBatch({
    "Synchronous API on async CookieJar": {
      topic: function() {
        return new tough.Store();
      },
      setCookieSync: {
        topic: function(store) {
          const jar = new CookieJar(store);
          try {
            jar.setCookieSync("a=b", "http://example.com/index.html");
            return false;
          } catch (e) {
            return e;
          }
        },
        fails: function(err) {
          assert.instanceOf(err, Error);
          assert.equal(
            err.message,
            "CookieJar store is not synchronous; use async API instead."
          );
        }
      },
      getCookiesSync: {
        topic: function(store) {
          const jar = new CookieJar(store);
          try {
            jar.getCookiesSync("http://example.com/index.html");
            return false;
          } catch (e) {
            return e;
          }
        },
        fails: function(err) {
          assert.instanceOf(err, Error);
          assert.equal(
            err.message,
            "CookieJar store is not synchronous; use async API instead."
          );
        }
      },
      getCookieStringSync: {
        topic: function(store) {
          const jar = new CookieJar(store);
          try {
            jar.getCookieStringSync("http://example.com/index.html");
            return false;
          } catch (e) {
            return e;
          }
        },
        fails: function(err) {
          assert.instanceOf(err, Error);
          assert.equal(
            err.message,
            "CookieJar store is not synchronous; use async API instead."
          );
        }
      },
      getSetCookieStringsSync: {
        topic: function(store) {
          const jar = new CookieJar(store);
          try {
            jar.getSetCookieStringsSync("http://example.com/index.html");
            return false;
          } catch (e) {
            return e;
          }
        },
        fails: function(err) {
          assert.instanceOf(err, Error);
          assert.equal(
            err.message,
            "CookieJar store is not synchronous; use async API instead."
          );
        }
      },
      removeAllCookies: {
        topic: function(store) {
          const jar = new CookieJar(store);
          try {
            jar.removeAllCookiesSync();
            return false;
          } catch (e) {
            return e;
          }
        },
        fails: function(err) {
          assert.instanceOf(err, Error);
          assert.equal(
            err.message,
            "CookieJar store is not synchronous; use async API instead."
          );
        }
      }
    }
  })
  .addBatch({
    "loose option": {
      "cookie jar with loose": {
        topic: function() {
          const jar = new CookieJar();
          const url = "http://example.com/index.html";
          return jar.setCookieSync("=b", url, { loose: true });
        },
        succeeds: function(err, c) {
          assert.equal(err, null);
          assert(c);
          assert.equal(c.value, "b");
        }
      },
      "cookie jar without loose": {
        topic: function() {
          const jar = new CookieJar();
          const url = "http://example.com/index.html";
          return jar.setCookieSync("=b", url);
        },
        fails: function(err, c) {
          assert.instanceOf(err, Error);
          assert.equal(err.message, "Cookie failed to parse");
        }
      },
      "map doesn't default to loose": {
        topic: function() {
          const some = [
            "=a;domain=example.com", // index 0, falsey
            "=b;domain=example.com", // index 1, truthy
            "c=d;domain=example.com" // index 2, truthy
          ];
          return some.map(Cookie.parse);
        },
        parses: function(err, val) {
          assert.equal(err, null);
          assert.isArray(val);
          assert.lengthOf(val, 3);
        },
        "doesn't parse first cookie loose": function(val) {
          assert.isUndefined(val[0]);
        },
        "doesn't parse second cookie loose": function(val) {
          assert.isUndefined(val[1]);
        },
        "parses third cookie normally": function(val) {
          assert.instanceOf(val[2], Cookie);
          assert.equal(val[2].key, "c");
          assert.equal(val[2].value, "d");
        }
      }
    }
  })
  .export(module);
