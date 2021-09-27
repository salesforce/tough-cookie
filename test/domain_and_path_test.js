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
const Cookie = tough.Cookie;

function matchVows(func, table) {
  const theVows = {};
  table.forEach(item => {
    const str = item[0];
    const dom = item[1];
    const expect = item[2];
    const label = str + (expect ? " matches " : " doesn't match ") + dom;
    theVows[label] = function() {
      assert.equal(func(str, dom), expect);
    };
  });
  return theVows;
}

function transformVows(fn, table) {
  var theVows = {};
  table.forEach(function (item) {
    var str = item[0];
    var expect = item[1];
    var label = str + " gives " + expect;
    if (item.length >= 3) {
      label += " (" + item[2] + ")";
    }
    theVows[label] = function () {
      assert.equal(fn(str), expect);
    };
  });
  return theVows;
}

vows
  .describe("Domain and Path")
  .addBatch({
    "domain normalization": transformVows(tough.canonicalDomain, [
      ["example.com", "example.com", "already canonical"],
      ["EXAMPLE.com", "example.com", "simple"],
      [".EXAMPLE.com", "example.com", "leading dot stripped"],
      ["EXAMPLE.com.", "example.com.", "trailing dot"],
      [".EXAMPLE.com.", "example.com.", "leading and trailing dot"],
      [".EXAMPLE...com.", "example...com.", "internal dots"],
      ["δοκιμή.δοκιμή","xn--jxalpdlp.xn--jxalpdlp", "IDN: test.test in greek"],
    ])
  })
  .addBatch({
    "Domain Match": matchVows(tough.domainMatch, [
      // str,          dom,          expect
      ["example.com", "example.com", true], // identical
      ["eXaMpLe.cOm", "ExAmPlE.CoM", true], // both canonicalized
      ["no.ca", "yes.ca", false],
      ["wwwexample.com", "example.com", false],
      ["www.subdom.example.com", "example.com", true],
      ["www.subdom.example.com", "subdom.example.com", true],
      ["example.com", "example.com.", false], // RFC6265 S4.1.2.3

      // nulls and undefineds
      [null, "example.com", null],
      ["example.com", null, null],
      [null, null, null],
      [undefined, undefined, null],

      // suffix matching:
      ["www.example.com", "example.com", true], // substr AND suffix
      ["www.example.com.org", "example.com", false], // substr but not suffix
      ["example.com", "www.example.com.org", false], // neither
      ["example.com", "www.example.com", false], // super-str
      ["aaa.com", "aaaa.com", false], // str can't be suffix of domain
      ["aaaa.com", "aaa.com", false], // dom is suffix, but has to match on "." boundary!
      ["www.aaaa.com", "aaa.com", false],
      ["www.aaa.com", "aaa.com", true],
      ["www.aexample.com", "example.com", false], // has to match on "." boundary

      // S5.1.3 "The string is a host name (i.e., not an IP address)"
      ["192.168.0.1", "168.0.1", false], // because str is an IP (v4)
      ["100.192.168.0.1", "168.0.1", true], // WEIRD: because str is not a valid IPv4
      ["100.192.168.0.1", "192.168.0.1", true], // WEIRD: because str is not a valid IPv4
      ["::ffff:192.168.0.1", "168.0.1", false], // because str is an IP (v6)
      ["::ffff:192.168.0.1", "192.168.0.1", false], // because str is an IP (v6)
      ["::FFFF:192.168.0.1", "192.168.0.1", false], // because str is an IP (v6)
      ["::192.168.0.1", "192.168.0.1", false], // because str is an IP (yes, v6!)
      [":192.168.0.1", "168.0.1", true], // WEIRD: because str is not valid IPv6
      [":ffff:100.192.168.0.1", "192.168.0.1", true], // WEIRD: because str is not valid IPv6
      [":ffff:192.168.0.1", "192.168.0.1", false],
      [":ffff:192.168.0.1", "168.0.1", true], // WEIRD: because str is not valid IPv6
      ["::Fxxx:192.168.0.1", "168.0.1", true], // WEIRD: because str isnt IPv6
      ["192.168.0.1", "68.0.1", false],
      ["192.168.0.1", "2.68.0.1", false],
      ["192.168.0.1", "92.68.0.1", false],
      ["10.1.2.3", "210.1.2.3", false],
      ["2008::1", "::1", false],
      ["::1", "2008::1", false],
      ["::1", "::1", true], // "are identical" rule, despite IPv6
      ["::3xam:1e", "2008::3xam:1e", false], // malformed IPv6
      ["::3Xam:1e", "::3xaM:1e", true], // identical, even though malformed
      ["3xam::1e", "3xam::1e", true], // identical
      ["::3xam::1e", "3xam::1e", false],
      ["3xam::1e", "::3xam:1e", false],
      ["::f00f:10.0.0.1", "10.0.0.1", false],
      ["10.0.0.1", "::f00f:10.0.0.1", false],

      // "IP like" hostnames:
      ["1.example.com", "example.com", true],
      ["11.example.com", "example.com", true],
      ["192.168.0.1.example.com", "example.com", true],

      // exact length "TLD" tests:
      ["com", "net", false], // same len, non-match
      ["com", "com", true], // "are identical" rule
      ["NOTATLD", "notaTLD", true], // "are identical" rule (after canonicalization)
    ])
  })

  .addBatch({
    "default-path": transformVows(tough.defaultPath,[
      [null, "/"],
      ["/", "/"],
      ["/file", "/"],
      ["/dir/file", "/dir"],
      ["noslash", "/"]
    ])
  })
  .addBatch({
    "Path-Match": matchVows(tough.pathMatch, [
      // request, cookie, match
      ["/", "/", true],
      ["/dir", "/", true],
      ["/", "/dir", false],
      ["/dir/", "/dir/", true],
      ["/dir/file", "/dir/", true],
      ["/dir/file", "/dir", true],
      ["/directory", "/dir", false]
    ])
  })
  .addBatch({
    permuteDomain: {
      "base case": {
        topic: tough.permuteDomain.bind(null, "example.com"),
        "got the domain": function(list) {
          assert.deepEqual(list, ["example.com"]);
        }
      },
      "two levels": {
        topic: tough.permuteDomain.bind(null, "foo.bar.example.com"),
        "got three things": function(list) {
          assert.deepEqual(list, [
            "example.com",
            "bar.example.com",
            "foo.bar.example.com"
          ]);
        }
      },
      "local domain": {
        topic: tough.permuteDomain.bind(null, "foo.bar.example.localduhmain"),
        "got three things": function(list) {
          assert.deepEqual(list, [
            "example.localduhmain",
            "bar.example.localduhmain",
            "foo.bar.example.localduhmain"
          ]);
        }
      },
      "trailing dot": {
        topic: tough.permuteDomain.bind(null, "foo.bar.example.com."),
        "got three things": function(list) {
          assert.deepEqual(list, [
            "example.com",
            "bar.example.com",
            "foo.bar.example.com"
          ]);
        }
      }
    },
    permutePath: {
      "base case": {
        topic: tough.permutePath.bind(null, "/"),
        "just slash": function(list) {
          assert.deepEqual(list, ["/"]);
        }
      },
      "single case": {
        topic: tough.permutePath.bind(null, "/foo"),
        "two things": function(list) {
          assert.deepEqual(list, ["/foo", "/"]);
        },
        "path matching": function(list) {
          list.forEach(e => {
            assert.ok(tough.pathMatch("/foo", e));
          });
        }
      },
      "double case": {
        topic: tough.permutePath.bind(null, "/foo/bar"),
        "four things": function(list) {
          assert.deepEqual(list, ["/foo/bar", "/foo", "/"]);
        },
        "path matching": function(list) {
          list.forEach(e => {
            assert.ok(tough.pathMatch("/foo/bar", e));
          });
        }
      },
      "trailing slash": {
        topic: tough.permutePath.bind(null, "/foo/bar/"),
        "three things": function(list) {
          assert.deepEqual(list, ["/foo/bar/", "/foo/bar", "/foo", "/"]);
        },
        "path matching": function(list) {
          list.forEach(e => {
            assert.ok(tough.pathMatch("/foo/bar/", e));
          });
        }
      }
    }
  })
  .export(module);
