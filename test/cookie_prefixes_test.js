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
const tough = require("../lib/cookie");
const CookieJar = tough.CookieJar;
const PrefixSecurityEnum = tough.PrefixSecurityEnum;

vows
  .describe("Cookie Prefixes")
  .addBatch({
    "Prefix Security Mode": {
      "with prefixSecurity = silent": {
        "for __Secure prefix": {
          topic: function() {
            return new CookieJar(null, { prefixSecurity: "silent" });
          },
          "with no Secure attribute, should fail silently": function(cj) {
            assert.equal(PrefixSecurityEnum.SILENT, cj.prefixSecurity);
            cj.setCookieSync(
              "__Secure-SID=12345; Domain=example.com",
              "http://www.example.com",
              {}
            );
            const cookies = cj.getCookiesSync("http://www.example.com");
            assert.isEmpty(cookies); // no cookies set
          },
          "with Secure attribute and over https, should work": function(cj) {
            assert.equal(PrefixSecurityEnum.SILENT, cj.prefixSecurity);
            cj.setCookieSync(
              "__Secure-SID=12345; Domain=example.com; Secure",
              "https://www.example.com",
              {}
            );
            const cookies = cj.getCookiesSync("https://www.example.com");
            assert.strictEqual(cookies.length, 1);
            assert.strictEqual(cookies[0].key, "__Secure-SID");
            assert.strictEqual(cookies[0].value, "12345");
          },
          "with Secure attribute but not over https, should fail silently": function(
            cj
          ) {
            assert.equal(PrefixSecurityEnum.SILENT, cj.prefixSecurity);
            cj.setCookieSync(
              "__Secure-SID=12345; Domain=example.com; Secure",
              "http://www.example.com",
              {}
            );
            const cookies = cj.getCookiesSync("http://www.example.com");
            assert.isEmpty(cookies); // no cookies set
          }
        },
        "for __Host prefix": {
          topic: function() {
            return new CookieJar(null, { prefixSecurity: "silent" });
          },
          "with no Secure attribute or Domain or Path, should fail silently": function(
            cj
          ) {
            assert.equal(PrefixSecurityEnum.SILENT, cj.prefixSecurity);
            cj.setCookieSync("__Host-SID=12345", "http://www.example.com", {});
            const cookies = cj.getCookiesSync("http://www.example.com");
            assert.isEmpty(cookies); // no cookies set
          },
          "with no Domain or Path, should fail silently": function(cj) {
            assert.equal(PrefixSecurityEnum.SILENT, cj.prefixSecurity);
            cj.setCookieSync(
              "__Host-SID=12345; Secure",
              "http://www.example.com",
              {}
            );
            const cookies = cj.getCookiesSync("http://www.example.com");
            assert.isEmpty(cookies); // no cookies set
          },
          "with no Path, should fail silently": function(cj) {
            assert.equal(PrefixSecurityEnum.SILENT, cj.prefixSecurity);
            cj.setCookieSync(
              "__Host-SID=12345; Secure; Domain=example.com",
              "http://www.example.com",
              {}
            );
            const cookies = cj.getCookiesSync("http://www.example.com");
            assert.isEmpty(cookies); // no cookies set
          },
          "with Domain, should fail silently": function(cj) {
            assert.equal(PrefixSecurityEnum.SILENT, cj.prefixSecurity);
            cj.setCookieSync(
              "__Host-SID=12345; Secure; Domain=example.com; Path=/",
              "http://www.example.com",
              {}
            );
            const cookies = cj.getCookiesSync("http://www.example.com");
            assert.isEmpty(cookies); // no cookies set
          },
          "with Secure and Path but no Domain over https, should work": function(
            cj
          ) {
            assert.equal(PrefixSecurityEnum.SILENT, cj.prefixSecurity);
            cj.setCookieSync(
              "__Host-SID=12345; Secure; Path=/",
              "https://www.example.com",
              {}
            );
            const cookies = cj.getCookiesSync("https://www.example.com");
            assert.strictEqual(cookies.length, 1);
            assert.strictEqual(cookies[0].key, "__Host-SID");
            assert.strictEqual(cookies[0].value, "12345");
          }
        }
      },
      "with prefixSecurity = strict": {
        "for __Secure prefix": {
          "for valid cookie": {
            topic: function() {
              return new CookieJar(null, { prefixSecurity: "strict" });
            },
            passes: function(cj) {
              assert.equal(PrefixSecurityEnum.STRICT, cj.prefixSecurity);
              cj.setCookieSync(
                "__Secure-SID=12345; Secure; Domain=example.com",
                "https://www.example.com",
                {}
              );
              const cookies = cj.getCookiesSync("https://www.example.com");
              assert.strictEqual(cookies.length, 1);
              assert.strictEqual(cookies[0].key, "__Secure-SID");
              assert.strictEqual(cookies[0].value, "12345");
            }
          },
          "for invalid cookie": {
            topic: function() {
              const cj = new CookieJar(null, { prefixSecurity: "strict" });
              assert.equal(PrefixSecurityEnum.STRICT, cj.prefixSecurity);
              cj.setCookieSync(
                "__Secure-SID=12345; Domain=example.com",
                "http://www.example.com",
                {}
              );
            },
            "fails shrilly": function(err, cookie) {
              assert.isNotNull(err);
              assert.isUndefined(cookie);
            }
          }
        },
        "for __Host prefix": {
          "for invalid cookie": {
            topic: function() {
              const cj = new CookieJar(null, { prefixSecurity: "strict" });
              assert.equal(PrefixSecurityEnum.STRICT, cj.prefixSecurity);
              cj.setCookieSync(
                "__Host-SID=12345; Secure; Domain=example.com",
                "https://www.example.com",
                {}
              );
            },
            "fails shrilly": function(err, cookie) {
              assert.isNotNull(err);
              assert.isUndefined(cookie);
            }
          },
          "for valid cookie": {
            topic: function() {
              return new CookieJar(null, { prefixSecurity: "strict" });
            },
            passes: function(cj) {
              assert.equal(PrefixSecurityEnum.STRICT, cj.prefixSecurity);
              cj.setCookieSync(
                "__Host-SID=12345; Secure; Path=/",
                "https://www.foo.com",
                {}
              );
              const cookies = cj.getCookiesSync("https://www.foo.com");
              assert.strictEqual(cookies.length, 1);
              assert.strictEqual(cookies[0].key, "__Host-SID");
              assert.strictEqual(cookies[0].value, "12345");
            }
          }
        }
      },
      "with prefixSecurity = disabled": {
        "for __Secure prefix": {
          topic: function() {
            return new CookieJar(null, { prefixSecurity: "unsafe-disabled" });
          },
          "does not fail": function(cj) {
            assert.equal(PrefixSecurityEnum.DISABLED, cj.prefixSecurity);
            cj.setCookieSync(
              "__Secure-SID=12345; Domain=example.com",
              "http://www.example.com",
              {}
            );
            const cookies = cj.getCookiesSync("https://www.example.com");
            assert.strictEqual(cookies.length, 1);
            assert.strictEqual(cookies[0].key, "__Secure-SID");
            assert.strictEqual(cookies[0].value, "12345");
          }
        },
        "for __Host prefix": {
          topic: function() {
            return new CookieJar(null, { prefixSecurity: "unsafe-disabled" });
          },
          "does not fail": function(cj) {
            assert.equal(PrefixSecurityEnum.DISABLED, cj.prefixSecurity);
            /* Failure case because Domain defined */
            cj.setCookieSync(
              "__Host-SID=12345; Domain=example.com",
              "http://www.example.com",
              {}
            );
            const cookies = cj.getCookiesSync("https://www.example.com");
            assert.strictEqual(cookies.length, 1);
            assert.strictEqual(cookies[0].key, "__Host-SID");
            assert.strictEqual(cookies[0].value, "12345");
          }
        }
      }
    }
  })
  .export(module);
