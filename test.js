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
      var got = cookiejar.parseDate(date) ? true : false;
      assert.equal(got,expect,"DATE regexp test (TODO if null)")
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
    "Tue Oct 18 2011 07:05:03 GMT+0000 (GMT)": true,
    "09 Jun 2021 10:18:14 GMT": true,
    "99 Jix 3038 48:86:72 ZMT": false,
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
      c.setExpires("Tue, 18 Oct 2011 07:05:03 GMT");
      return c;
    },
    "validates": function(c) {
      assert.ok(c.validate());
    },
    "to string": function(c) {
      assert.equal(c.toString(), 'a=b; Expires=Tue, Oct 18 2011 07:05:03 GMT');
    },
  },
}).export(module);
