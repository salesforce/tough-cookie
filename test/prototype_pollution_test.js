'use strict';
var vows = require('vows');
var assert = require('assert');
var tough = require('../lib/cookie');
var CookieJar = tough.CookieJar;

vows.describe('Prototype Pollution Prevention').addBatch({

  'Setting a cookie with __proto__': {
    topic: function () {
      var jar = new CookieJar();
      try {
        jar.setCookie('__proto__=hacked', {}, this.callback);
      } catch (e) {
        return e;
      }
      return {};
    },
    'should not modify Object.prototype': function (topic) {
      assert.strictEqual({}.hacked, undefined);
    }
  },

  'Setting a cookie with constructor': {
    topic: function () {
      var jar = new CookieJar();
      try {
        jar.setCookie('constructor=hacked', {}, this.callback);
      } catch (e) {
        return e;
      }
      return {};
    },
    'should not modify Object.prototype.constructor': function (topic) {
      assert.strictEqual(({}).constructor, Object);
    }
  },

  'Setting a cookie with prototype': {
    topic: function () {
      var jar = new CookieJar();
      try {
        jar.setCookie('prototype=hacked', {}, this.callback);
      } catch (e) {
        return e;
      }
      return {};
    },
    'should not modify Object.prototype.prototype': function (topic) {
      assert.strictEqual({}.prototype, undefined);
    }
  }

}).export(module);
