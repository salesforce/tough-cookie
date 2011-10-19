[RFC6265](http://tools.ietf.org/html/rfc6265) Cookies for Node.js

===

# Synopsis

    var cookies = require('cookies');
    var Cookie = cookies.Cookie;
    var cookie = Cookie.parse(header);
    cookie.value = 'somethingdifferent';
    header = cookie.toString();

Misc

    var dateObj = cookies.parseDate(string);
    var str = cookies.formatDate(dateObj);

# Objects

## cookies

  * parseDate(string) - parse a string into a Date.  Parses according to RFC6265
  * formatDate(date) - format a Date into a RFC1123 string
  * parse(header) - alias for `Cookie.parse(header)`

## Cookie

### Class Methods

  * parse(header) - parse single Cookie or Set-Cookie header into a `Cookie` object

### Attributes

  * key - String
  * value - String
  * expires - Date
  * maxAge - Number (seconds)
  * domain - String
  * path - String
  * secure - boolean
  * httpOnly - boolean
  * extensions - Array

#### Methods

  * validate() - *IN PROGRESS* validate cookie fields against RFC6265.
  * setExpires(String) - sets the expiry based on a date-string.
  * toString() - encode to a Set-Cookie header value
  * cookieString() - encode to a Cookie header value
  * TTL(now) - compute the TTL relative to `now` (milliseconds).  `Date.now()` is used by default.
  * canonicalizedDoman()/cdomain() - return the canonicalized domain field (*TODO* full RFC5890 normalization)

# Todo

  * Release to NPM
  * Complete tests for `validate()`
  * RFC5890 canonicalization for domains in `cdomain()`
  * Cookie Semantics

===

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

