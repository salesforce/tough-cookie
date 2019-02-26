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
var ipRegex = require('../lib/ip-regex');



vows
  .describe('ip-regex')
  .addBatch({
    "ipv4":  function () {
        // Class A
        assert.equal(ipRegex.test("0.0.0.0"), true)
        assert.equal(ipRegex.test("127.255.255.255"), true)
        assert.equal(ipRegex.test("127.255.255.256"), false) // Deliberately Out of range, should fail

        // Class B
        assert.equal(ipRegex.test("128.0.0.0"), true)
        assert.equal(ipRegex.test("191.255.255.255"), true)
        assert.equal(ipRegex.test("191.255.256.255"), false) // Deliberately Out of range, should fail

        // Class C
        assert.equal(ipRegex.test("192.0.0.0"), true)
        assert.equal(ipRegex.test("223.255.255.255"), true)
        assert.equal(ipRegex.test("223.256.255.255"), false) // Deliberately Out of range, should fail
    },
    "ipv6": function () {
        assert.equal(ipRegex.test('::'), true) // unspecified address
        assert.equal(ipRegex.test('::1'), true) // localhost
        assert.equal(ipRegex.test('fe80::219:7eff:fe46:6c42'), true) //  link local address
        assert.equal(ipRegex.test('::192.168.10.184'), true) // embedded IPv4 address
    },
  })
  .export(module);
