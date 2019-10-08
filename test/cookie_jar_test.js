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
const vows = require("vows");
const assert = require("assert");
const async = require("async");
const tough = require("../lib/cookie");
const Cookie = tough.Cookie;
const CookieJar = tough.CookieJar;

const atNow = Date.now();

function at(offset) {
  return { now: new Date(atNow + offset) };
}

vows
  .describe("CookieJar")
  .addBatch({
    "Setting a basic cookie": {
      topic: function() {
        const cj = new CookieJar();
        const c = Cookie.parse("a=b; Domain=example.com; Path=/");
        assert.strictEqual(c.hostOnly, null);
        assert.instanceOf(c.creation, Date);
        assert.strictEqual(c.lastAccessed, null);
        c.creation = new Date(Date.now() - 10000);
        cj.setCookie(c, "http://example.com/index.html", this.callback);
      },
      works: function(c) {
        assert.instanceOf(c, Cookie);
      }, // C is for Cookie, good enough for me
      "gets timestamped": function(c) {
        assert.ok(c.creation);
        assert.ok(Date.now() - c.creation.getTime() < 5000); // recently stamped
        assert.ok(c.lastAccessed);
        assert.equal(c.creation, c.lastAccessed);
        assert.equal(c.TTL(), Infinity);
        assert.ok(!c.isPersistent());
      }
    },
    "Setting a no-path cookie": {
      topic: function() {
        const cj = new CookieJar();
        const c = Cookie.parse("a=b; Domain=example.com");
        assert.strictEqual(c.hostOnly, null);
        assert.instanceOf(c.creation, Date);
        assert.strictEqual(c.lastAccessed, null);
        c.creation = new Date(Date.now() - 10000);
        cj.setCookie(c, "http://example.com/index.html", this.callback);
      },
      domain: function(c) {
        assert.equal(c.domain, "example.com");
      },
      "path is /": function(c) {
        assert.equal(c.path, "/");
      },
      "path was derived": function(c) {
        assert.strictEqual(c.pathIsDefault, true);
      }
    },
    "Setting a cookie already marked as host-only": {
      topic: function() {
        const cj = new CookieJar();
        const c = Cookie.parse("a=b; Domain=example.com");
        assert.strictEqual(c.hostOnly, null);
        assert.instanceOf(c.creation, Date);
        assert.strictEqual(c.lastAccessed, null);
        c.creation = new Date(Date.now() - 10000);
        c.hostOnly = true;
        cj.setCookie(c, "http://example.com/index.html", this.callback);
      },
      domain: function(c) {
        assert.equal(c.domain, "example.com");
      },
      "still hostOnly": function(c) {
        assert.strictEqual(c.hostOnly, true);
      }
    },
    "Setting a session cookie": {
      topic: function() {
        const cj = new CookieJar();
        const c = Cookie.parse("a=b");
        assert.strictEqual(c.path, null);
        cj.setCookie(c, "http://www.example.com/dir/index.html", this.callback);
      },
      works: function(c) {
        assert.instanceOf(c, Cookie);
      },
      "gets the domain": function(c) {
        assert.equal(c.domain, "www.example.com");
      },
      "gets the default path": function(c) {
        assert.equal(c.path, "/dir");
      },
      "is 'hostOnly'": function(c) {
        assert.ok(c.hostOnly);
      }
    },
    "Setting wrong domain cookie": {
      topic: function() {
        const cj = new CookieJar();
        const c = Cookie.parse("a=b; Domain=fooxample.com; Path=/");
        cj.setCookie(c, "http://example.com/index.html", this.callback);
      },
      fails: function(err, c) {
        assert.ok(err.message.match(/domain/i));
        assert.ok(!c);
      }
    },
    "Setting sub-domain cookie": {
      topic: function() {
        const cj = new CookieJar();
        const c = Cookie.parse("a=b; Domain=www.example.com; Path=/");
        cj.setCookie(c, "http://example.com/index.html", this.callback);
      },
      fails: function(err, c) {
        assert.ok(err.message.match(/domain/i));
        assert.ok(!c);
      }
    },
    "Setting super-domain cookie": {
      topic: function() {
        const cj = new CookieJar();
        const c = Cookie.parse("a=b; Domain=example.com; Path=/");
        cj.setCookie(c, "http://www.app.example.com/index.html", this.callback);
      },
      success: function(err, c) {
        assert.ok(!err);
        assert.equal(c.domain, "example.com");
      }
    },
    "Setting a sub-path cookie on a super-domain": {
      topic: function() {
        const cj = new CookieJar();
        const c = Cookie.parse("a=b; Domain=example.com; Path=/subpath");
        assert.strictEqual(c.hostOnly, null);
        assert.instanceOf(c.creation, Date);
        assert.strictEqual(c.lastAccessed, null);
        c.creation = new Date(Date.now() - 10000);
        cj.setCookie(c, "http://www.example.com/index.html", this.callback);
      },
      "domain is super-domain": function(c) {
        assert.equal(c.domain, "example.com");
      },
      "path is /subpath": function(c) {
        assert.equal(c.path, "/subpath");
      },
      "path was NOT derived": function(c) {
        assert.strictEqual(c.pathIsDefault, null);
      }
    },
    "Setting HttpOnly cookie over non-HTTP API": {
      topic: function() {
        const cj = new CookieJar();
        const c = Cookie.parse("a=b; Domain=example.com; Path=/; HttpOnly");
        cj.setCookie(
          c,
          "http://example.com/index.html",
          { http: false },
          this.callback
        );
      },
      fails: function(err, c) {
        assert.match(err.message, /HttpOnly/i);
        assert.ok(!c);
      }
    }
  })
  .addBatch({
    "Store eight cookies": {
      topic: function() {
        const cj = new CookieJar();
        const ex = "http://example.com/index.html";
        const tasks = [];
        tasks.push(next => {
          cj.setCookie("a=1; Domain=example.com; Path=/", ex, at(0), next);
        });
        tasks.push(next => {
          cj.setCookie(
            "b=2; Domain=example.com; Path=/; HttpOnly",
            ex,
            at(1000),
            next
          );
        });
        tasks.push(next => {
          cj.setCookie(
            "c=3; Domain=example.com; Path=/; Secure",
            ex,
            at(2000),
            next
          );
        });
        tasks.push(next => {
          // path
          cj.setCookie(
            "d=4; Domain=example.com; Path=/foo",
            ex,
            at(3000),
            next
          );
        });
        tasks.push(next => {
          // host only
          cj.setCookie("e=5", ex, at(4000), next);
        });
        tasks.push(next => {
          // other domain
          cj.setCookie(
            "f=6; Domain=nodejs.org; Path=/",
            "http://nodejs.org",
            at(5000),
            next
          );
        });
        tasks.push(next => {
          // expired
          cj.setCookie(
            "g=7; Domain=example.com; Path=/; Expires=Tue, 18 Oct 2011 00:00:00 GMT",
            ex,
            at(6000),
            next
          );
        });
        tasks.push(next => {
          // expired via Max-Age
          cj.setCookie("h=8; Domain=example.com; Path=/; Max-Age=1", ex, next);
        });
        const cb = this.callback;
        async.parallel(tasks, (err, results) => {
          setTimeout(() => {
            cb(err, cj, results);
          }, 2000); // so that 'h=8' expires
        });
      },
      "setup ok": function(err, cj, results) {
        assert.ok(!err);
        assert.ok(cj);
        assert.ok(results);
      },
      "then retrieving for http://nodejs.org": {
        topic: function(cj, oldResults) {
          assert.ok(oldResults);
          cj.getCookies("http://nodejs.org", this.callback);
        },
        "get a nodejs cookie": function(cookies) {
          assert.lengthOf(cookies, 1);
          const cookie = cookies[0];
          assert.equal(cookie.domain, "nodejs.org");
        }
      },
      "then retrieving for https://example.com": {
        topic: function(cj, oldResults) {
          assert.ok(oldResults);
          cj.getCookies("https://example.com", { secure: true }, this.callback);
        },
        "get a secure example cookie with others": function(cookies) {
          const names = cookies.map(c => {
            return c.key;
          });
          assert.deepEqual(names, ["a", "b", "c", "e"]);
        }
      },
      "then retrieving for https://example.com (missing options)": {
        topic: function(cj, oldResults) {
          assert.ok(oldResults);
          cj.getCookies("https://example.com", this.callback);
        },
        "get a secure example cookie with others": function(cookies) {
          const names = cookies.map(c => {
            return c.key;
          });
          assert.deepEqual(names, ["a", "b", "c", "e"]);
        }
      },
      "then retrieving for http://example.com": {
        topic: function(cj, oldResults) {
          assert.ok(oldResults);
          cj.getCookies("http://example.com", this.callback);
        },
        "get a bunch of cookies": function(cookies) {
          const names = cookies.map(c => {
            return c.key;
          });
          assert.deepEqual(names, ["a", "b", "e"]);
        }
      },
      "then retrieving for http://EXAMPlE.com": {
        topic: function(cj, oldResults) {
          assert.ok(oldResults);
          cj.getCookies("http://EXAMPlE.com", this.callback);
        },
        "get a bunch of cookies": function(cookies) {
          const names = cookies.map(c => {
            return c.key;
          });
          assert.deepEqual(names, ["a", "b", "e"]);
        }
      },
      "then retrieving for http://example.com, non-HTTP": {
        topic: function(cj, oldResults) {
          assert.ok(oldResults);
          cj.getCookies("http://example.com", { http: false }, this.callback);
        },
        "get a bunch of cookies": function(cookies) {
          const names = cookies.map(c => {
            return c.key;
          });
          assert.deepEqual(names, ["a", "e"]);
        }
      },
      "then retrieving for http://example.com/foo/bar": {
        topic: function(cj, oldResults) {
          assert.ok(oldResults);
          cj.getCookies("http://example.com/foo/bar", this.callback);
        },
        "get a bunch of cookies": function(cookies) {
          const names = cookies.map(c => {
            return c.key;
          });
          assert.deepEqual(names, ["d", "a", "b", "e"]);
        }
      },
      "then retrieving for http://example.com as a string": {
        topic: function(cj, oldResults) {
          assert.ok(oldResults);
          cj.getCookieString("http://example.com", this.callback);
        },
        "get a single string": function(cookieHeader) {
          assert.equal(cookieHeader, "a=1; b=2; e=5");
        }
      },
      "then retrieving for http://example.com as a set-cookie header": {
        topic: function(cj, oldResults) {
          assert.ok(oldResults);
          cj.getSetCookieStrings("http://example.com", this.callback);
        },
        "get a single string": function(cookieHeaders) {
          assert.lengthOf(cookieHeaders, 3);
          assert.equal(cookieHeaders[0], "a=1; Domain=example.com; Path=/");
          assert.equal(
            cookieHeaders[1],
            "b=2; Domain=example.com; Path=/; HttpOnly"
          );
          assert.equal(cookieHeaders[2], "e=5; Path=/");
        }
      },
      "then retrieving for http://www.example.com/": {
        topic: function(cj, oldResults) {
          assert.ok(oldResults);
          cj.getCookies("http://www.example.com/foo/bar", this.callback);
        },
        "get a bunch of cookies": function(cookies) {
          const names = cookies.map(c => {
            return c.key;
          });
          assert.deepEqual(names, ["d", "a", "b"]); // note lack of 'e'
        }
      }
    }
  })
  .addBatch({
    "Repeated names": {
      topic: function() {
        const cb = this.callback;
        const cj = new CookieJar();
        const ex = "http://www.example.com/";
        const sc = cj.setCookie;
        const tasks = [];
        const now = Date.now();
        tasks.push(sc.bind(cj, "aaaa=xxxx", ex, at(0)));
        tasks.push(
          sc.bind(cj, "aaaa=1111; Domain=www.example.com", ex, at(1000))
        );
        tasks.push(sc.bind(cj, "aaaa=2222; Domain=example.com", ex, at(2000)));
        tasks.push(
          sc.bind(
            cj,
            "aaaa=3333; Domain=www.example.com; Path=/pathA",
            ex,
            at(3000)
          )
        );
        async.series(tasks, (err, results) => {
          results = results.filter(e => {
            return e !== undefined;
          });
          cb(err, { cj: cj, cookies: results, now: now });
        });
      },
      "all got set": function(err, t) {
        assert.lengthOf(t.cookies, 4);
      },
      "then getting 'em back": {
        topic: function(t) {
          const cj = t.cj;
          cj.getCookies("http://www.example.com/pathA", this.callback);
        },
        "there's just three": function(err, cookies) {
          const vals = cookies.map(c => {
            return c.value;
          });
          // may break with sorting; sorting should put 3333 first due to longest path:
          assert.deepEqual(vals, ["3333", "1111", "2222"]);
        }
      }
    }
  })
  .addBatch({
    "CookieJar setCookie errors": {
      "public-suffix domain": {
        topic: function() {
          const cj = new CookieJar();
          cj.setCookie(
            "i=9; Domain=kyoto.jp; Path=/",
            "kyoto.jp",
            this.callback
          );
        },
        errors: function(err, cookie) {
          assert.ok(err);
          assert.ok(!cookie);
          assert.match(err.message, /public suffix/i);
        }
      },
      "wrong domain": {
        topic: function() {
          const cj = new CookieJar();
          cj.setCookie(
            "j=10; Domain=google.com; Path=/",
            "http://google.ca",
            this.callback
          );
        },
        errors: function(err, cookie) {
          assert.ok(err);
          assert.ok(!cookie);
          assert.match(err.message, /not in this host's domain/i);
        }
      },
      "old cookie is HttpOnly": {
        topic: function() {
          const cb = this.callback;
          const next = function(err, c) {
            c = null;
            return cb(err, cj);
          };
          const cj = new CookieJar();
          cj.setCookie(
            "k=11; Domain=example.ca; Path=/; HttpOnly",
            "http://example.ca",
            { http: true },
            next
          );
        },
        "initial cookie is set": function(err, cj) {
          assert.ok(!err);
          assert.ok(cj);
        },
        "but when trying to overwrite": {
          topic: function(cj) {
            const cb = this.callback;
            const next = function(err, c) {
              c = null;
              cb(null, err);
            };
            cj.setCookie(
              "k=12; Domain=example.ca; Path=/",
              "http://example.ca",
              { http: false },
              next
            );
          },
          "it's an error": function(err) {
            assert.ok(err);
          },
          "then, checking the original": {
            topic: function(ignored, cj) {
              assert.ok(cj instanceof CookieJar);
              cj.getCookies("http://example.ca", { http: true }, this.callback);
            },
            "cookie has original value": function(err, cookies) {
              assert.equal(err, null);
              assert.lengthOf(cookies, 1);
              assert.equal(cookies[0].value, 11);
            }
          }
        }
      },
      "similar to public suffix": {
        topic: function() {
          const cj = new CookieJar();
          const url = "http://www.foonet.net";
          assert.isTrue(cj.rejectPublicSuffixes);
          cj.setCookie("l=13; Domain=foonet.net; Path=/", url, this.callback);
        },
        "doesn't error": function(err, cookie) {
          assert.ok(!err);
          assert.ok(cookie);
        }
      }
    }
  })
  .addBatch({
    "Loose Mode": {
      topic: function() {
        const cj = new CookieJar(null, { looseMode: true });
        cj.setCookieSync("FooBar", "http://www.foonet.net", {});
        return cj;
      },
      "parses loose cookies": function(cj) {
        const cookies = cj.getCookiesSync("http://www.foonet.net");
        assert.strictEqual(cookies.length, 1);
        assert.strictEqual(cookies[0].key, "");
        assert.strictEqual(cookies[0].value, "FooBar");
      }
    }
  })
  .addBatch({
    "Remove all cookies": {
      topic: function() {
        const jar = new CookieJar();
        const cookie1 = Cookie.parse("a=b; Domain=example.com; Path=/");
        const cookie2 = Cookie.parse("a=b; Domain=foo.com; Path=/");
        const cookie3 = Cookie.parse("foo=bar; Domain=foo.com; Path=/");
        jar.setCookie(cookie1, "http://example.com/index.html", () => {});
        jar.setCookie(cookie2, "http://foo.com/index.html", () => {});
        jar.setCookie(cookie3, "http://foo.com/index.html", () => {});

        const cb = this.callback;
        jar.removeAllCookies(err => {
          cb(err, jar);
        });
      },
      "no errors": function(err, jar) {
        assert(err == null);
      },
      "load cookies from the jar": {
        topic: function(jar) {
          jar.store.getAllCookies(this.callback);
        },
        "no cookies in the jar": function(err, cookies) {
          assert(err == null);
          assert(cookies != null);
          assert(cookies.length === 0, "cookies were not removed");
        }
      }
    },
    "Remove all cookies (the underlying store does not support removeAllCookies)": {
      topic: function() {
        const jar = new CookieJar();
        jar.store.removeAllCookies = undefined;
        const cookie1 = Cookie.parse("a=b; Domain=example.com; Path=/");
        const cookie2 = Cookie.parse("a=b; Domain=foo.com; Path=/");
        const cookie3 = Cookie.parse("foo=bar; Domain=foo.com; Path=/");
        jar.setCookie(cookie1, "http://example.com/index.html", () => {});
        jar.setCookie(cookie2, "http://foo.com/index.html", () => {});
        jar.setCookie(cookie3, "http://foo.com/index.html", () => {});

        const cb = this.callback;
        jar.removeAllCookies(err => {
          cb(err, jar);
        });
      },
      "no errors": function(err, jar) {
        assert(err == null);
      },
      "load cookies from the jar": {
        topic: function(jar) {
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
    "Issue 132 - setCookie": {
      "with foreign object": {
        topic: function() {
          const jar = new CookieJar();
          jar.setCookie(
            { key: "x", value: "y" },
            "http://example.com/",
            this.callback
          );
        },
        "results in an error": function(err, cookie) {
          assert(err != null);
          assert(!cookie);
          assert.equal(
            err.message,
            "First argument to setCookie must be a Cookie object or string"
          );
        }
      },
      "with String instance": {
        topic: function() {
          const jar = new CookieJar();
          jar.setCookie(
            new String("x=y; Domain=example.com; Path=/"),
            "http://example.com/",
            this.callback
          );
        },
        "is fine": function(err, cookie) {
          assert(!err);
          assert(!!cookie);
          assert.instanceOf(cookie, Cookie);
          assert.equal(cookie.key, "x");
        }
      }
    }
  })
  .export(module);
