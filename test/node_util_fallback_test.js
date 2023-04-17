/*!
 * Copyright (c) 2022, Salesforce.com, Inc.
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
const tough = require("../dist/cookie");
const util = require("util");
const inspectFallback = require("../dist/memstore").inspectFallback;
const {
  getCustomInspectSymbol,
  getUtilInspect
} = require("../dist/utilHelper");
const Cookie = tough.Cookie;
const CookieJar = tough.CookieJar;

function resetAgeFields(str) {
  return str.replace(/\d+ms/g, "0ms");
}

vows
  .describe("Node util module fallback for non-node environments")
  .addBatch({
    getCustomInspectSymbol: {
      "should not be null in a node environment": function() {
        assert.equal(
          getCustomInspectSymbol(),
          Symbol.for("nodejs.util.inspect.custom") || util.inspect.custom
        );
      },
      "should not be null in a node environment when custom inspect symbol cannot be retrieved (< node v10.12.0)": function() {
        assert.equal(
          getCustomInspectSymbol({
            lookupCustomInspectSymbol: () => null
          }),
          Symbol.for("nodejs.util.inspect.custom") || util.inspect.custom
        );
      },
      "should be null in a non-node environment since 'util' features cannot be relied on": function() {
        assert.equal(
          getCustomInspectSymbol({
            lookupCustomInspectSymbol: () => null,
            requireUtil: () => null
          }),
          null
        );
      }
    },
    getUtilInspect: {
      "should use util.inspect in a node environment": function() {
        const inspect = getUtilInspect(() => "fallback");
        assert.equal(inspect("util.inspect"), util.inspect("util.inspect"));
      },
      "should use fallback inspect function in a non-node environment": function() {
        const inspect = getUtilInspect(() => "fallback", {
          requireUtil: () => null
        });
        assert.equal(inspect("util.inspect"), "fallback");
      }
    },
    "util usage in Cookie": {
      "custom inspect for Cookie still works": function() {
        const cookie = Cookie.parse("a=1; Domain=example.com; Path=/");
        // The custom inspect uses Date.now(), so the two invocations cannot be directly compared,
        // as "cAge" will not necessarily be the same value (sometimes 0ms, sometimes 1ms).
        // assert.equal(cookie.inspect(), util.inspect(cookie));
        const expected = /^Cookie="a=1; Domain=example\.com; Path=\/; hostOnly=\?; aAge=\?; cAge=\dms"$/
        assert.match(cookie.inspect(), expected)
        assert.match(util.inspect(cookie), expected)
      }
    },
    "util usage in MemoryCookie": {
      "when store is empty": {
        topic: function() {
          const cookieJar = new CookieJar();
          return cookieJar.store;
        },
        "custom inspect for MemoryCookie still works": function(memoryStore) {
          assert.equal(
            resetAgeFields(util.inspect(memoryStore)),
            resetAgeFields(memoryStore.inspect())
          );
        },
        "fallback produces equivalent output to custom inspect": function(
          memoryStore
        ) {
          assert.equal(
            resetAgeFields(util.inspect(memoryStore.idx)),
            resetAgeFields(inspectFallback(memoryStore.idx))
          );
        }
      },
      "when store has a single cookie": {
        topic: function() {
          const cookieJar = new CookieJar();
          cookieJar.setCookieSync(
            "a=1; Domain=example.com; Path=/",
            "http://example.com/index.html"
          );
          return cookieJar.store;
        },
        "custom inspect for MemoryCookie still works": function(memoryStore) {
          assert.equal(
            resetAgeFields(util.inspect(memoryStore)),
            resetAgeFields(memoryStore.inspect())
          );
        },
        "fallback produces equivalent output to custom inspect": function(
          memoryStore
        ) {
          assert.equal(
            resetAgeFields(util.inspect(memoryStore.idx)),
            resetAgeFields(inspectFallback(memoryStore.idx))
          );
        }
      },
      "when store has a multiple cookies": {
        topic: function() {
          const cookieJar = new CookieJar();
          ["a", "b", "c"].forEach((cookieName, i) => {
            cookieJar.setCookieSync(
              `${cookieName}=${i}; Domain=example.com; Path=/`,
              "http://example.com/index.html"
            );
          });
          ["d", "e"].forEach((cookieName, i) => {
            cookieJar.setCookieSync(
              `${cookieName}=${i}; Domain=example.com; Path=/some-path/`,
              "http://example.com/index.html"
            );
          });
          cookieJar.setCookieSync(
            `f=0; Domain=another.com; Path=/`,
            "http://another.com/index.html"
          );
          return cookieJar.store;
        },
        "custom inspect for MemoryCookie still works": function(memoryStore) {
          assert.equal(
            resetAgeFields(util.inspect(memoryStore)),
            resetAgeFields(memoryStore.inspect())
          );
        },
        "fallback produces equivalent output to custom inspect": function(
          memoryStore
        ) {
          assert.equal(
            resetAgeFields(util.inspect(memoryStore.idx)),
            resetAgeFields(inspectFallback(memoryStore.idx))
          );
        }
      }
    }
  })
  .export(module);
