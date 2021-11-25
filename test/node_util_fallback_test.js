/*!
 * Copyright (c) 2021, Salesforce.com, Inc.
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
const tough = require("../lib/cookie");
const util = require("util");

const Cookie = tough.Cookie;
const CookieJar = tough.CookieJar;
const MemoryCookieStore = tough.MemoryCookieStore;

function usingNodeUtilFallback(fn) {
  process.env.TOUGH_COOKIE_NODE_UTIL_FALLBACK = "enabled";
  try {
    return fn();
  } finally {
    delete process.env.TOUGH_COOKIE_NODE_UTIL_FALLBACK;
  }
}

function resetAgeFields(str) {
  return str.replace(/\d+ms/g, "0ms");
}

vows
  .describe("Node util module fallback for non-node environments")
  .addBatch({
    "Cookie usage for util.* code paths": {
      "should not error out when initializing a Cookie": function() {
        assert.doesNotThrow(() => {
          usingNodeUtilFallback(() => new Cookie());
        });
      }
    },
    "MemoryCookieStore usage for util.* code paths": {
      "should not error out when initializing a MemoryCookieStore": function() {
        assert.doesNotThrow(() => {
          usingNodeUtilFallback(() => new MemoryCookieStore());
        });
      },
      "inspecting contents": {
        "when store is empty": {
          topic: function() {
            const cookieJar = new CookieJar();
            return this.callback(
              null,
              cookieJar,
              util.inspect(cookieJar.store)
            );
          },
          "should provide equivalent output to util.inspect(memoryCookieStore)": function(
            err,
            cookieJar,
            expectedResult
          ) {
            usingNodeUtilFallback(() => {
              const fallbackResult = cookieJar.store.inspect();
              assert.equal(fallbackResult, expectedResult);
            });
          }
        },
        "when store has a single cookie": {
          topic: function() {
            const cookieJar = new CookieJar();
            cookieJar.setCookieSync(
              "a=1; Domain=example.com; Path=/",
              "http://example.com/index.html"
            );
            return this.callback(
              null,
              cookieJar,
              resetAgeFields(util.inspect(cookieJar.store))
            );
          },
          "should provide equivalent output to util.inspect(memoryCookieStore)": function(
            err,
            cookieJar,
            expectedResult
          ) {
            usingNodeUtilFallback(() => {
              const fallbackResult = resetAgeFields(cookieJar.store.inspect());
              assert.equal(expectedResult, fallbackResult);
            });
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
            return this.callback(
              null,
              cookieJar,
              resetAgeFields(util.inspect(cookieJar.store))
            );
          },
          "should provide equivalent output to util.inspect(memoryCookieStore)": function(
            err,
            cookieJar,
            expectedResult
          ) {
            usingNodeUtilFallback(() => {
              const fallbackResult = resetAgeFields(cookieJar.store.inspect());
              assert.equal(expectedResult, fallbackResult);
            });
          }
        }
      }
    }
  })
  .export(module);
