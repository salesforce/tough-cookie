/*
 * Copyright GoInstant, Inc. and other contributors. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

var vows = require('vows');
var assert = require('assert');
var async = require('async');

var cookies = require('./index.js');
var Cookie = cookies.Cookie;
var CookieJar = cookies.CookieJar;


function dateVows(table) {
  var theVows = { };
  var keys = Object.keys(table).forEach(function(date) {
    var expect = table[date];
    theVows[date] = function() {
      var got = cookies.parseDate(date) ? 'valid' : 'invalid';
      assert.equal(got, expect ? 'valid' : 'invalid')
    };
  });
  return { "date parsing": theVows }
};

function matchVows(func,table) {
  var theVows = {};
  table.forEach(function(item) {
    var str = item[0];
    var dom = item[1];
    var expect = item[2];
    var label = str+(expect?" matches ":" doesn't match ")+dom;
    theVows[label] = function() {
      assert.equal(func(str,dom),expect);
    };
  });
  return theVows;
}

function defaultPathVows(table) {
  var theVows = {};
  table.forEach(function(item) {
    var str = item[0];
    var expect = item[1];
    var label = str+" gives "+expect;
    theVows[label] = function() {
      assert.equal(cookies.defaultPath(str),expect);
    };
  });
  return theVows;
}

vows.describe('Cookie Jar').addBatch({
  "all defined": function() {
    assert.ok(Cookie);
    assert.ok(CookieJar);
  },
}).addBatch(
  dateVows({
    "Wed, 09 Jun 2021 10:18:14 GMT": true,
    "Wed, 09 Jun 2021 22:18:14 GMT": true,
    "Tue, 18 Oct 2011 07:42:42.123 GMT": true,
    "18 Oct 2011 07:42:42 GMT": true,
    "8 Oct 2011 7:42:42 GMT": true,
    "8 Oct 2011 7:2:42 GMT": false,
    "Oct 18 2011 07:42:42 GMT": true,
    "Tue Oct 18 2011 07:05:03 GMT+0000 (GMT)": true,
    "09 Jun 2021 10:18:14 GMT": true,
    "99 Jix 3038 48:86:72 ZMT": false,
    '01 Jan 1970 00:00:00 GMT': true,
    '01 Jan 1600 00:00:00 GMT': false, // before 1601
    '01 Jan 1601 00:00:00 GMT': true,
    '10 Feb 81 13:00:00 GMT': true, // implicit year
  })
).addBatch({
  "formatting a simple cookie": {
    topic: function() {
      var c = new Cookie();
      c.key = 'a';
      c.value = 'b';
      return c;
    },
    "validates": function(c) {
      assert.ok(c.validate());
    },
    "to string": function(c) {
      assert.equal(c.toString(), 'a=b');
    },
  },
  "formatting a cookie with spaces in the value": {
    topic: function() {
      var c = new Cookie();
      c.key = 'a';
      c.value = 'beta gamma';
      return c;
    },
    "doesn't validate": function(c) {
      assert.ok(!c.validate());
    },
    "to string": function(c) {
      assert.equal(c.toString(), 'a="beta gamma"');
    },
  },
  "formatting with an expiry": {
    topic: function() {
      var c = new Cookie();
      c.key = 'a';
      c.value = 'b';
      c.setExpires("Oct 18 2011 07:05:03 GMT");
      return c;
    },
    "validates": function(c) {
      assert.ok(c.validate());
    },
    "to string": function(c) {
      assert.equal(c.toString(), 'a=b; Expires=Tue, 18 Oct 2011 07:05:03 GMT');
    },
    "to short string": function(c) {
      assert.equal(c.cookieString(), 'a=b');
    },
  },
  "formatting with a max-age": {
    topic: function() {
      var c = new Cookie();
      c.key = 'a';
      c.value = 'b';
      c.setExpires("Oct 18 2011 07:05:03 GMT");
      c.maxAge = 12345;
      return c;
    },
    "validates": function(c) {
      assert.ok(c.validate()); // mabe this one *shouldn't*?
    },
    "to string": function(c) {
      assert.equal(c.toString(), 'a=b; Expires=Tue, 18 Oct 2011 07:05:03 GMT; Max-Age=12345');
    },
  },
  "formatting with a bunch of things": function() {
    var c = new Cookie();
    c.key = 'a';
    c.value = 'b';
    c.setExpires("Oct 18 2011 07:05:03 GMT");
    c.maxAge = 12345;
    c.domain = 'example.com';
    c.path = '/foo';
    c.secure = true;
    c.httpOnly = true;
    c.extensions = ['MyExtension'];
    assert.equal(c.toString(), 'a=b; Expires=Tue, 18 Oct 2011 07:05:03 GMT; Max-Age=12345; Domain=example.com; Path=/foo; Secure; HttpOnly; MyExtension');
  },
}).addBatch({
  "TTL with max-age": function() {
    var c = new Cookie();
    c.maxAge = 123;
    assert.equal(c.TTL(), 123000);
    assert.equal(c.expiryTime(new Date(9000000)), 9123000);
  },
  "TTL with zero max-age": function() {
    var c = new Cookie();
    c.key = 'a'; c.value = 'b';
    c.maxAge = 0; // technically against the spec to be zero: "Max-Age=" non-zero-digit *DIGIT
    assert.equal(c.TTL(), 0);
    assert.equal(c.expiryTime(new Date(9000000)), -Infinity);
    assert.ok(!c.validate());
  },
  "TTL with max-age and expires": function() {
    var c = new Cookie();
    c.maxAge = 123;
    c.expires = new Date(Date.now()+9000);
    assert.equal(c.TTL(), 123000);
    assert.ok(c.isPersistent());
  },
  "TTL with expires": function() {
    var c = new Cookie();
    var now = Date.now();
    c.expires = new Date(now+9000);
    assert.equal(c.TTL(now), 9000);
    assert.equal(c.expiryTime(), c.expires);
  },
  "TTL with old expires": function() {
    var c = new Cookie();
    c.setExpires('17 Oct 2010 00:00:00 GMT');
    assert.ok(c.TTL() < 0);
    assert.ok(c.isPersistent());
  },
  "default TTL": {
    topic: function() { return new Cookie() },
    "is Infinite-future": function(c) { assert.equal(c.TTL(), Infinity) },
    "is a 'session' cookie": function(c) { assert.ok(!c.isPersistent()) },
  },
}).addBatch({
  "Parsing": {
    "simple": {
      topic: function() {
        return Cookie.parse('a=bcd',true) || null;
      },
      "parsed": function(c) { assert.ok(c) },
      "key": function(c) { assert.equal(c.key, 'a') },
      "value": function(c) { assert.equal(c.value, 'bcd') },
      "no extensions": function(c) { assert.ok(!c.extensions) },
    },
    "with expiry": {
      topic: function() {
        return Cookie.parse('a=bcd; Expires=Tue, 18 Oct 2011 07:05:03 GMT',true) || null;
      },
      "parsed": function(c) { assert.ok(c) },
      "key": function(c) { assert.equal(c.key, 'a') },
      "value": function(c) { assert.equal(c.value, 'bcd') },
      "has expires": function(c) {
        assert.ok(c.expires !== Infinity, 'expiry is infinite when it shouldn\'t be');
        assert.equal(c.expires.getTime(), 1318921503000);
      },
    },
    "with expiry and path": {
      topic: function() {
        return Cookie.parse('abc="xyzzy!"; Expires=Tue, 18 Oct 2011 07:05:03 GMT; Path=/aBc',true) || null;
      },
      "parsed": function(c) { assert.ok(c) },
      "key": function(c) { assert.equal(c.key, 'abc') },
      "value": function(c) { assert.equal(c.value, 'xyzzy!') },
      "has expires": function(c) {
        assert.ok(c.expires !== Infinity, 'expiry is infinite when it shouldn\'t be');
        assert.equal(c.expires.getTime(), 1318921503000);
      },
      "has path": function(c) { assert.equal(c.path, '/aBc'); },
      "no httponly or secure": function(c) {
        assert.ok(!c.httpOnly);
        assert.ok(!c.secure);
      },
    },
    "with everything": {
      topic: function() {
        return Cookie.parse('abc="xyzzy!"; Expires=Tue, 18 Oct 2011 07:05:03 GMT; Path=/aBc; Domain=example.com; Secure; HTTPOnly; Max-Age=1234; Foo=Bar; Baz', true) || null;
      },
      "parsed": function(c) { assert.ok(c) },
      "key": function(c) { assert.equal(c.key, 'abc') },
      "value": function(c) { assert.equal(c.value, 'xyzzy!') },
      "has expires": function(c) {
        assert.ok(c.expires !== Infinity, 'expiry is infinite when it shouldn\'t be');
        assert.equal(c.expires.getTime(), 1318921503000);
      },
      "has path": function(c) { assert.equal(c.path, '/aBc'); },
      "has domain": function(c) { assert.equal(c.domain, 'example.com'); },
      "has httponly": function(c) { assert.equal(c.httpOnly, true); },
      "has secure": function(c) { assert.equal(c.secure, true); },
      "has max-age": function(c) { assert.equal(c.maxAge, 1234); },
      "has extensions": function(c) {
        assert.ok(c.extensions);
        assert.equal(c.extensions[0], 'Foo=Bar');
        assert.equal(c.extensions[1], 'Baz');
      },
    },
    "invalid expires": {
      "strict": function() { assert.ok(!Cookie.parse("a=b; Expires=xyzzy", true)) },
      "non-strict": function() {
        var c = Cookie.parse("a=b; Expires=xyzzy");
        assert.ok(c);
        assert.equal(c.expires, Infinity);
      },
    },
    "zero max-age": {
      "strict": function() { assert.ok(!Cookie.parse("a=b; Max-Age=0", true)) },
      "non-strict": function() {
        var c = Cookie.parse("a=b; Max-Age=0");
        assert.ok(c);
        assert.equal(c.maxAge, -Infinity);
      },
    },
    "negative max-age": {
      "strict": function() { assert.ok(!Cookie.parse("a=b; Max-Age=-1", true)) },
      "non-strict": function() {
        var c = Cookie.parse("a=b; Max-Age=-1");
        assert.ok(c);
        assert.equal(c.maxAge, -Infinity);
      },
    },
    "empty domain": {
      "strict": function() { assert.ok(!Cookie.parse("a=b; domain=", true)) },
      "non-strict": function() {
        var c = Cookie.parse("a=b; domain=");
        assert.ok(c);
        assert.equal(c.domain, null);
      },
    },
    "dot domain": {
      "strict": function() { assert.ok(!Cookie.parse("a=b; domain=.", true)) },
      "non-strict": function() {
        var c = Cookie.parse("a=b; domain=.");
        assert.ok(c);
        assert.equal(c.domain, null);
      },
    },
    "uppercase domain": {
      "strict lowercases": function() {
        var c = Cookie.parse("a=b; domain=EXAMPLE.COM");
        assert.ok(c);
        assert.equal(c.domain, 'example.com');
      },
      "non-strict lowercases": function() {
        var c = Cookie.parse("a=b; domain=EXAMPLE.COM");
        assert.ok(c);
        assert.equal(c.domain, 'example.com');
      },
    },
    "trailing dot in domain": {
      topic: function() {
        return Cookie.parse("a=b; Domain=example.com.", true) || null;
      },
      "has the domain": function(c) { assert.equal(c.domain,"example.com.") },
      "but doesn't validate": function(c) { assert.equal(c.validate(),false) },
    },
    "empty path": {
      "strict": function() { assert.ok(!Cookie.parse("a=b; path=", true)) },
      "non-strict": function() {
        var c = Cookie.parse("a=b; path=");
        assert.ok(c);
        assert.equal(c.path, null);
      },
    },
    "no-slash path": {
      "strict": function() { assert.ok(!Cookie.parse("a=b; path=xyzzy", true)) },
      "non-strict": function() {
        var c = Cookie.parse("a=b; path=xyzzy");
        assert.ok(c);
        assert.equal(c.path, null);
      },
    },
    "secure-with-value": {
      "strict": function() { assert.ok(!Cookie.parse("a=b; Secure=xyzzy", true)) },
      "non-strict": function() {
        var c = Cookie.parse("a=b; Secure=xyzzy");
        assert.ok(c);
        assert.equal(c.secure, true);
      },
    },
    "httponly-with-value": {
      "strict": function() { assert.ok(!Cookie.parse("a=b; HttpOnly=xyzzy", true)) },
      "non-strict": function() {
        var c = Cookie.parse("a=b; HttpOnly=xyzzy");
        assert.ok(c);
        assert.equal(c.httpOnly, true);
      },
    },
    "garbage": {
      topic: function() {
        return Cookie.parse("\x08", true) || null;
      },
      "doesn't parse": function(c) { assert.equal(c,null) },
    },
  }
}).addBatch({
  "domain normalization": {
    "simple": function() {
      var c = new Cookie();
      c.domain = "EXAMPLE.com";
      assert.equal(c.canonicalizedDomain(), "example.com");
    },
    "extra dots": function() {
      var c = new Cookie();
      c.domain = ".EXAMPLE.com";
      assert.equal(c.cdomain(), "example.com");
    },
    "weird trailing dot": function() {
      var c = new Cookie();
      c.domain = "EXAMPLE.ca.";
      assert.equal(c.canonicalizedDomain(), "example.ca.");
    },
    "weird internal dots": function() {
      var c = new Cookie();
      c.domain = "EXAMPLE...ca.";
      assert.equal(c.canonicalizedDomain(), "example...ca.");
    },
  }
}).addBatch({
  "Domain Match":matchVows(cookies.domainMatch, [
    // str,          dom,          expect
    ["example.com", "example.com", true],
    ["eXaMpLe.cOm", "ExAmPlE.CoM", true],
    ["no.ca", "yes.ca", false],
    ["wwwexample.com", "example.com", false],
    ["www.example.com", "example.com", true],
    ["example.com", "www.example.com", false],
    ["www.subdom.example.com", "example.com", true],
    ["www.subdom.example.com", "subdom.example.com", true],
    ["example.com", "example.com.", false], // RFC6265 S4.1.2.3
    ["192.168.0.1", "168.0.1", false], // S5.1.3 "The string is a host name"
  ])
}).addBatch({
  "default-path": defaultPathVows([
    [null,"/"],
    ["/","/"],
    ["/file","/"],
    ["/dir/file","/dir"],
    ["noslash","/"],
  ])
}).addBatch({
  "Path-Match": matchVows(cookies.pathMatch, [
    // request, cookie, match
    ["/","/",true],
    ["/dir","/",true],
    ["/","/dir",false],
    ["/dir/file","/dir/",true],
    ["/dir/file","/dir",true],
    ["/directory","/dir",false],
  ])
}).addBatch({
  "CookieJar": {
    "Setting a basic cookie": {
      topic: function() {
        var cj = new CookieJar();
        var c = Cookie.parse("a=b; Domain=example.com; Path=/");
        assert.strictEqual(c.hostOnly, null);
        assert.strictEqual(c.creation, null);
        assert.strictEqual(c.lastAccessed, null);
        cj.setCookie(c, 'http://example.com/index.html', this.callback);
      },
      "works": function(c) { assert.instanceOf(c,Cookie) }, // C is for Cookie, good enough for me
      "gets timestamped": function(c) {
        assert.ok(c.creation);
        assert.ok(c.lastAccessed);
        assert.equal(c.creation, c.lastAccessed);
        assert.equal(c.TTL(), Infinity);
        assert.ok(!c.isPersistent());
      },
    },
    "Setting a session cookie": {
      topic: function() {
        var cj = new CookieJar();
        var c = Cookie.parse("a=b");
        assert.strictEqual(c.path, null);
        cj.setCookie(c, 'http://example.com/dir/index.html', this.callback);
      },
      "works": function(c) { assert.instanceOf(c,Cookie) },
      "gets the domain": function(c) { assert.equal(c.domain, 'example.com') },
      "gets the default path": function(c) { assert.equal(c.path, '/dir') },
      "is 'hostOnly'": function(c) { assert.ok(c.hostOnly) },
    },
    "Setting wrong domain cookie": {
      topic: function() {
        var cj = new CookieJar();
        var c = Cookie.parse("a=b; Domain=fooxample.com; Path=/");
        cj.setCookie(c, 'http://example.com/index.html', this.callback);
      },
      "fails": function(err,c) {
        assert.ok(err.message.match(/domain/i));
        assert.ok(!c);
      },
    },
    "Setting HttpOnly cookie over non-HTTP API": {
      topic: function() {
        var cj = new CookieJar();
        var c = Cookie.parse("a=b; Domain=example.com; Path=/; HttpOnly");
        cj.setCookie(c, 'http://example.com/index.html', {http:false}, this.callback);
      },
      "fails": function(err,c) {
        assert.match(err.message, /HttpOnly/i);
        assert.ok(!c);
      },
    },
  },
  "Cookie Jar retrieval": {
    topic: function() {
      var cj = new CookieJar();
      var ex = 'http://example.com/index.html';
      var tasks = [];
      tasks.push(function(next) {
        cj.setCookie('a=1; Domain=example.com; Path=/',ex,next);
      });
      tasks.push(function(next) {
        cj.setCookie('b=2; Domain=example.com; Path=/; HttpOnly',ex,next);
      });
      tasks.push(function(next) {
        cj.setCookie('c=3; Domain=example.com; Path=/; Secure',ex,next);
      });
      tasks.push(function(next) { // path
        cj.setCookie('d=4; Domain=example.com; Path=/foo',ex,next);
      });
      tasks.push(function(next) { // host only
        cj.setCookie('e=5',ex,next);
      });
      tasks.push(function(next) { // other domain
        cj.setCookie('f=6; Domain=nodejs.org; Path=/','http://nodejs.org',next);
      });
      tasks.push(function(next) { // expired
        cj.setCookie('g=7; Domain=example.com; Path=/; Expires=Tue, 18 Oct 2011 00:00:00 GMT',ex,next);
      });
      tasks.push(function(next) { // expired via Max-Age
        cj.setCookie('h=8; Domain=example.com; Path=/; Max-Age=1',ex,next);
      });
      var cb = this.callback;
      async.parallel(tasks, function(err,results){
        setTimeout(function() {
          cb(err,cj,results);
        }, 2000);
      });
    },
    "setup ok": function(err,cj,results) {
      assert.ok(1);
    },
    "then retrieving for http://nodejs.org": {
      topic: function(cj,results) {
        cj.getCookies('http://nodejs.org',this.callback);
      },
      "get a nodejs cookie": function(cookies) {
        assert.length(cookies, 1);
        var cookie = cookies[0];
        assert.equal(cookie.domain, 'nodejs.org');
      },
    },
    "then retrieving for https://example.com": {
      topic: function(cj,results) {
        cj.getCookies('https://example.com',{secure:true},this.callback);
      },
      "get a secure example cookie with others": function(cookies) {
        var names = cookies.map(function(c) {return c.key});
        assert.deepEqual(names, ['a','b','c','e']); // may break with sorting
      },
    },
    "then retrieving for https://example.com (missing options)": {
      topic: function(cj,results) {
        cj.getCookies('https://example.com',this.callback);
      },
      "get a secure example cookie with others": function(cookies) {
        var names = cookies.map(function(c) {return c.key});
        assert.deepEqual(names, ['a','b','c','e']); // may break with sorting
      },
    },
    "then retrieving for http://example.com": {
      topic: function(cj,results) {
        cj.getCookies('http://example.com',this.callback);
      },
      "get a bunch of cookies": function(cookies) {
        var names = cookies.map(function(c) {return c.key});
        assert.deepEqual(names, ['a','b','e']); // may break with sorting
      },
    },
    "then retrieving for http://example.com, non-HTTP": {
      topic: function(cj,results) {
        cj.getCookies('http://example.com',{http:false},this.callback);
      },
      "get a bunch of cookies": function(cookies) {
        var names = cookies.map(function(c) {return c.key});
        assert.deepEqual(names, ['a','e']); // may break with sorting
      },
    },
    "then retrieving for http://example.com/foo/bar": {
      topic: function(cj,results) {
        cj.getCookies('http://example.com/foo/bar',this.callback);
      },
      "get a bunch of cookies": function(cookies) {
        var names = cookies.map(function(c) {return c.key});
        assert.deepEqual(names, ['a','b','d','e']); // may break with sorting
      },
    },
  }
}).export(module);
