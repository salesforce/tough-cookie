
var vows = require('vows');
var assert = require('assert');
var tough = require('../lib/cookie');
var CookieJar = tough.CookieJar;

vows

var vows = require('vows');
var assert = require('assert');
var tough = require('../lib/cookie');
var CookieJar = tough.CookieJar;

vows
  .describe('Prototype Pollution Test')
  .addBatch({
    'Setting a prototype pollution cookie': {
      topic: function () {
        const cookiejar = new CookieJar(undefined, { rejectPublicSuffixes: false });
        try {
          cookiejar.setCookie(
            'Slonser=polluted; Domain=__proto__; Path=/notauth',
            'https://__proto__/admin',
            (err, cookie) => {
              if (err) {
                this.callback(null, 'pass'); // Expected error
              } else {
                this.callback(null, 'fail'); // Cookie should not be set
              }
            }
          );
        } catch (e) {
          this.callback(null, 'pass'); // Expected behavior if it throws
        }
      },

      'should prevent prototype pollution': function (err, result) {
        assert.strictEqual(
          result,
          'pass',
          '❌ Prototype pollution detected! The library allowed a malicious cookie with "__proto__".'
        );
      }
    }
  })
  .export(module);
