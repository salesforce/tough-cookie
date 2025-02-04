const vows = require('vows');
const assert = require('assert');
const tough = require('../lib/cookie'); // use patched tough-cookie;
const CookieJar = tough.CookieJar;

vows.describe('Prototype pollution test').addBatch({
      "when setting a cookie with the domain __proto__": {
        topic: function() {
          const jar = new CookieJar(undefined, {
            rejectPublicSuffixes: false
          });
          // try to pollute the prototype
          jar.setCookieSync(
            "Slonser=polluted; Domain=__proto__; Path=/notauth",
            "https://__proto__/admin"
          );
          jar.setCookieSync(
            "Auth=Lol; Domain=google.com; Path=/notauth",
            "https://google.com/"
          );
          this.callback();
        },
        "results in a cookie that is not affected by the attempted prototype pollution should be undefined": function() {
          const pollutedObject = {};
          assert.strictEqual(pollutedObject["/notauth"], undefined);
        }
      }
  })
  .export(module);

