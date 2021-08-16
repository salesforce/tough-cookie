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
const pubsuffix = require("./pubsuffix-psl");

// Gives the permutation of all possible domainMatch()es of a given domain. The
// array is in shortest-to-longest order.  Handy for indexing.

// RFC 6761
const SPECIAL_USE_DOMAINS = [
  "local",
  "example",
  "invalid",
  "localhost",
  "test"
];

function permuteDomain(domain, allowSpecialUseDomain) {
  let pubSuf = null;
  if (allowSpecialUseDomain) {
    const domainParts = domain.split(".");
    // If the right-most label in the name is a special-use domain (e.g. bananas.apple.localhost),
    // then don't use PSL. This is because most special-use domains are not listed on PSL.
    const topLevelDomain = domainParts[domainParts.length - 1];
    if (SPECIAL_USE_DOMAINS.includes(topLevelDomain)) {
      const secondLevelDomain = domainParts[domainParts.length - 2];
      // In aforementioned example, the eTLD/pubSuf will be apple.localhost
      pubSuf = `${secondLevelDomain}.${topLevelDomain}`;
    } else {
      pubSuf = pubsuffix.getPublicSuffix(domain);
    }
  } else {
    pubSuf = pubsuffix.getPublicSuffix(domain);
  }

  if (!pubSuf) {
    return null;
  }
  if (pubSuf == domain) {
    return [domain];
  }

  // Nuke trailing dot
  if (domain.slice(-1) == ".") {
    domain = domain.slice(0, -1)
  }

  const prefix = domain.slice(0, -(pubSuf.length + 1)); // ".example.com"
  const parts = prefix.split(".").reverse();
  let cur = pubSuf;
  const permutations = [cur];
  while (parts.length) {
    cur = `${parts.shift()}.${cur}`;
    permutations.push(cur);
  }
  return permutations;
}

exports.permuteDomain = permuteDomain;
