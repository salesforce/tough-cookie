'use strict';
var vows = require('vows');
var assert = require('assert');

var MemoryCookieStore = require('../lib/memstore').MemoryCookieStore;

// example for a cookie that might cause a prototype pollution
var pollutedCookie = {
  creation: "2024-08-28T20:41:51.145Z",
  key: "Slonser",
  value: "polluted",
  domain: "__proto__",
  path: "/notauth",
  hostOnly: false,
  lastAccessed: "2024-08-28T20:41:51.145Z",
}

function cb(err) {
  if (err) {
    console.error("An error occurred:", err);
  }
}

vows
  .describe('Prototype Pollution')
  .addBatch({
    "Prototype Pollution vulnerability": function () {
      try {
        var pollutionStore = new MemoryCookieStore();

        pollutionStore.putCookie(pollutedCookie, cb);
        var testObj = {};
        /*
        checking if the cookie managed to polluted by checking of testObj
        has now unwanted properties in its __proto__ after inserting the polluted cookie.
        If the polluted cookie is a property of testObj, we can conclude that
        the package has a vulnerability, and if it is not the case then
        the package is now secured.
        */
        assert.equal(pollutedCookie, testObj[pollutedCookie.path] ? testObj[pollutedCookie.path][pollutedCookie.key] : undefined);
        console.log('EXPLOITED FAILED');
      } catch (error) {
        console.log('EXPLOITED FAILED');
      }
    }
  })
  .export(module);
