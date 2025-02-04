const setCookie = async (jar, cookieString, url) => {
  return new Promise((resolve, reject) => {
    jar.setCookie(cookieString, url, {}, (err, cookie) => {
      if (err) return reject(err);
      resolve(cookie);
    });
  });
}

const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(message);
};

module.exports = {
  setCookie,
  log
};
