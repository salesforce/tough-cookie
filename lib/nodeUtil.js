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

const customInspectSymbol = Symbol.for("nodejs.util.inspect.custom");

function inspectFallback(val) {
  const domains = Object.keys(val);
  if (domains.length === 0) {
    return "{}";
  }
  let result = "{\n";
  Object.keys(val).forEach((domain, i) => {
    result += formatDomain(domain, val[domain]);
    if (i < domains.length - 1) {
      result += ",";
    }
    result += "\n";
  });
  result += "}";
  return result;
}

inspectFallback.custom = customInspectSymbol;

function formatDomain(domainName, domainValue) {
  const indent = "  ";
  let result = `${indent}'${domainName}': {\n`;
  Object.keys(domainValue).forEach((path, i, paths) => {
    result += formatPath(path, domainValue[path]);
    if (i < paths.length - 1) {
      result += ",";
    }
    result += "\n";
  });
  result += `${indent}}`;
  return result;
}

function formatPath(pathName, pathValue) {
  const indent = "    ";
  let result = `${indent}'${pathName}': {\n`;
  Object.keys(pathValue).forEach((cookieName, i, cookieNames) => {
    const cookie = pathValue[cookieName];
    result += `      ${cookieName}: ${cookie[customInspectSymbol]()}`;
    if (i < cookieNames.length - 1) {
      result += ",";
    }
    result += "\n";
  });
  result += `${indent}}`;
  return result;
}

const nodeUtilFallback = {
  inspect: inspectFallback
};

module.exports = function nodeUtil() {
  try {
    const nodeUtilFallbackEnabled =
      process &&
      process.env &&
      process.env.TOUGH_COOKIE_NODE_UTIL_FALLBACK === "enabled";
    if (!nodeUtilFallbackEnabled) {
      // we want the real "util" module if we are in a node environment
      // eslint-disable-next-line no-restricted-modules
      return require("util");
    }
  } catch (e) {
    // ignored
  }
  return nodeUtilFallback;
};
