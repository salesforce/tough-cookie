var vows = require('vows');
var assert = require('assert');

var cookiejar = require('./index.js');
var Cookie = cookiejar.Cookie;
var CookieJar = cookiejar.CookieJar;


function dateVows(table) {
  var theVows = { };
  var keys = Object.keys(table).forEach(function(date) {
    var expect = table[date];
    theVows[date] = function() {
      var got = cookiejar.parseDate(date) ? 'valid' : 'invalid';
      assert.equal(got, expect ? 'valid' : 'invalid')
    };
  });
  return { "date parsing": theVows }
};

vows.describe('Cookie Jar').addBatch({
  "all defined": function() {
    assert.ok(Cookie);
    assert.ok(CookieJar);
  },
}).addBatch(
  dateVows({
    "Wed, 09 Jun 2021 10:18:14 GMT": true,
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
  },
  "TTL with zero max-age": function() {
    var c = new Cookie();
    c.key = 'a'; c.value = 'b';
    c.maxAge = 0; // technically against the spec to be zero: "Max-Age=" non-zero-digit *DIGIT
    assert.equal(c.TTL(), 0);
    assert.ok(!c.validate());
  },
  "TTL with max-age and expires": function() {
    var c = new Cookie();
    c.maxAge = 123;
    c.expires = new Date(Date.now()+9000);
    assert.equal(c.TTL(), 123000);
  },
  "TTL with expires": function() {
    var c = new Cookie();
    var now = Date.now();
    c.expires = new Date(now+9000);
    assert.equal(c.TTL(now), 9000);
  },
  "TTL with old expires": function() {
    var c = new Cookie();
    var now = Date.now();
    c.setExpires('17 Oct 2010 00:00:00 GMT');
    assert.ok(c.TTL(now) < 0);
  },
}).addBatch({
  "Parsing": {
    "simple": {
      topic: function() {
        return Cookie.parse('a=bcd') || null;
      },
      "parsed": function(c) { assert.ok(c) },
      "key": function(c) { assert.equal(c.key, 'a') },
      "value": function(c) { assert.equal(c.value, 'bcd') },
    },
    "with expiry": {
      topic: function() {
        return Cookie.parse('a=bcd; Expires=Tue, 18 Oct 2011 07:05:03 GMT') || null;
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
        return Cookie.parse('abc="xyzzy!"; Expires=Tue, 18 Oct 2011 07:05:03 GMT; Path=/aBc') || null;
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
        return Cookie.parse('abc="xyzzy!"; Expires=Tue, 18 Oct 2011 07:05:03 GMT; Path=/aBc; Domain=example.com; Secure; HTTPOnly; Max-Age=1234; Foo=Bar; Baz') || null;
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
    "garbage": {
      topic: function() {
        return Cookie.parse("\x08") || null;
      },
      "doesn't parse": function(c) {
        assert.equal(c,null);
      },
    },
  }
}).export(module);
