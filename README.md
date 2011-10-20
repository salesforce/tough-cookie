[RFC6265](http://tools.ietf.org/html/rfc6265) Cookies for Node.js

# Synopsis

    var cookies = require('cookies');
    var Cookie = cookies.Cookie;
    var cookie = Cookie.parse(header);
    cookie.value = 'somethingdifferent';
    header = cookie.toString();
    
    var cookiejar = new cookies.CookieJar();
    cookiejar.setCookie(cookie, 'http://currentdomain.example.com/path', cb);
    // ...
    cookiejar.getCookies('http://example.com/otherpath',function(err,cookies) {
       res.headers['cookie'] = cookies.join('; ');
    });

Misc

    var dateObj = cookies.parseDate(string);
    var str = cookies.formatDate(dateObj);

# Objects

## cookies

  * parseDate(string) - parse a string into a Date.  Parses according to RFC6265
  * formatDate(date) - format a Date into a RFC1123 string
  * parse(header[,strict]) - alias for `Cookie.parse(header[,strict])`

## Cookie

### Class Methods

  * parse(header[,strict]) - parse single Cookie or Set-Cookie header into a `Cookie` object.  Returns `undefined` if the string can't be parsed.  If in strict mode, returns undefined if the cookie doesn't follow the guidelines in section 4 of RFC6265.

### Attributes

  * key - String - the name or key of the cookie (default "")
  * value - String - the value of the cookie (default "")
  * expires - Date - if set, the `Expires=` attribute of the cookie (defaults to Infinity)
  * maxAge - Number (seconds) - if set, the `Max-Age=` attribute _in seconds_ of the cookie.
  * domain - String - the `Domain=` attribute of the cookie
  * path - String - the `Path=` of the cookie
  * secure - boolean - the `Secure` cookie flag
  * httpOnly - boolean - the `HttpOnly` cookie flag
  * extensions - Array - any unrecognized cookie attributes as strings (even if equal-signs inside)
               
After a cookie has been passed through `CookieJar.setCookie()` it will have the following additional attributes:

  * hostOnly - Boolean - is this a host-only cookie (i.e. no Domain field was set, but was instead implied)
  * created - Date - when this cookie was added to the jar
  * lastAccessed - Date (updated by `getCookies()`) - last time the cookie got accessed. Will affect cookie cleaning once implemented.

### Methods

  * validate() - *IN PROGRESS* validate cookie fields against RFC6265.
  * setExpires(String) - sets the expiry based on a date-string.
  * toString() - encode to a Set-Cookie header value
  * cookieString() - encode to a Cookie header value
  * TTL(now) - compute the TTL relative to `now` (milliseconds).  `Date.now()` is used by default.
  * canonicalizedDoman()/cdomain() - return the canonicalized domain field (*TODO* full RFC5890 normalization)

## CookieJar

### Attributes

  * rejectPublicSuffixes - Boolean: reject cookies with domains like "com" and "co.uk" (default: `true`)
                         
### Methods

Since eventually this module would like to support database/remote/etc. CookieJars, continuation passing style is used for CookieJar methods.

  * setCookie(cookieOrString, currentUrl, options, cb(err,cookie)) - attempt to set the cookie in the cookie jar.  If the operation fails, an error will be given to the callback `cb`, otherwise the cookie (updated with some timestamps and other properties) is passed through.  The `options` object can be omitted, but you can set `{http:false}` to say that this is a non-HTTP API (affects `HttpOnly` cookies) and `{strict:true}` turn on some extra validity checks.
                                                                   
  * storeCookie(cookie, options, cb(err,cookie)) - called internally by setCookie.  This is likely to be the "hook" that fancy CookieJars override.
                                                
  * getCookies(currentUrl, options, cb(err,cookies)) - retrieve the list of cookies that apply to the current url.  The `options` object can be omitted.  If the url starts with `https:` or `wss:` then `{secure:true}` is implied for the options.  Disable this by passing `{secure:false}`.  If you want to simulate a non-HTTP API, pass the option `{http:false}`, otherwise it defaults to `true`.

# Todo

  * Release to NPM
  * _full_ RFC5890/RFC5891 canonicalization for domains in `cdomain()`
    * the optional `punycode` requirement implements RFC3492, but RFC6265 requires RFC5891
  * better tests for `validate()`?
  * getCookies sorting

# Copyright and License

Copyright GoInstant, Inc. and other contributors. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.

