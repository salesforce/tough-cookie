[RFC6265](http://tools.ietf.org/html/rfc6265) Cookies and CookieJar for Node.js

![Tough Cookie](http://www.goinstant.com.s3.amazonaws.com/tough-cookie.jpg)

# Synopsis

``` javascript
var cookies = require('tough-cookie'); // note: not 'cookie', 'cookies' or 'node-cookie'
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
```

# Installation

It's _so_ easy!

`npm install tough-cookie`

Requires `punycode`, which should get installed automatically for you.

Why the name?  NPM modules `cookie`, `cookies` and `cookiejar` were already taken.

# API

cookies
=======

Functions on the module you get from `require('tough-cookie')`.  All can be used as pure functions and don't need to be "bound".

parseDate(string)
-----------------

Parse a cookie date string into a `Date`.  Parses according to RFC6265 Section 5.1.1, not `Date.parse()`.

formatDate(date)
----------------

Format a Date into a RFC1123 string (the RFC6265-recommended format).

canonicalDomain(str)
--------------------

Transforms a domain-name into a canonical domain-name.  The canonical domain-name is a trimmed, lowercased, stripped-of-leading-dot and optionally punycode-encoded domain-name (Section 5.1.2 of RFC6265).  For the most part, this function is idempotent (can be run again on its output without ill effects).

domainMatch(str,domStr[,canonicalize=true])
-------------------------------------------

Answers "does this real domain match the domain in a cookie?".  The `str` is the "current" domain-name and the `domStr` is the "cookie" domain-name.  Matches according to RFC6265 Section 5.1.3, but it helps to think of it as a "suffix match".

The `canonicalize` parameter will run the other two paramters through `canonicalDomain` or not.

defaultPath(path)
-----------------

Given a current request/response path, gives the Path apropriate for storing in a cookie.  This is basically the "directory" of a "file" in the path, but is specified by Section 5.1.4 of the RFC.

The `path` parameter MUST be _only_ the pathname part of a URI (i.e. excludes the hostname, query, fragment, etc.).  This is the `.pathname` property of node's `uri.parse()` output.

pathMatch(reqPath,cookiePath)
-----------------------------

Answers "does the request-path path-match a given cookie-path?" as per RFC6265 Section 5.1.4.  Returns a boolean.

This is essentially a prefix-match where `cookiePath` is a prefix of `reqPath`.

parse(header[,strict=false])
----------------------------

alias for `Cookie.parse(header[,strict])`

fromJSON(string)
----------------

alias for `Cookie.fromJSON(string)`

getPublicSuffix(hostname)
-------------------------

Returns the public suffix of this hostname.  The public suffix is the shortest domain-name upon which a cookie can be set.  Returns `null` if the hostname cannot have cookies set for it.

For example: `www.example.com` and `www.subdomain.example.com` both have public suffix `example.com`.

For further information, see http://publicsuffix.org/.  This module derives its list from that site.

Cookie
======

Cookie.parse(header[,strict=false])
-----------------------------------

Parses a single Cookie or Set-Cookie HTTP header into a `Cookie` object.  Returns `undefined` if the string can't be parsed.  If in strict mode, returns `undefined` if the cookie doesn't follow the guidelines in section 4 of RFC6265.  Generally speaking, strict mode can be used to validate your own generated Set-Cookie headers, but acting as a client you want to be lenient and leave strict mode off.

Here's how to process the Set-Cookie header(s) on a node HTTP/HTTPS response:

``` javascript
if (res.headers['set-cookie'] instanceof Array)
  cookies = res.headers['set-cookie'].map(Cookie.parse);
else
  cookies = [Cookie.parse(res.headers['set-cookie'])];
```

Cookie.fromJSON(string)
-----------------------

Convert a JSON string to a `Cookie` object.  Mainly useful for parsing the dates in a `JSON.stringify()`-ed `Cookie`.

Properties
==========

  * _key_ - string - the name or key of the cookie (default "")
  * _value_ - string - the value of the cookie (default "")
  * _expires_ - `Date` - if set, the `Expires=` attribute of the cookie (defaults to Infinity)
  * _maxAge_ - seconds - if set, the `Max-Age=` attribute _in seconds_ of the cookie.
  * _domain_ - string - the `Domain=` attribute of the cookie
  * _path_ - string - the `Path=` of the cookie
  * _secure_ - boolean - the `Secure` cookie flag
  * _httpOnly_ - boolean - the `HttpOnly` cookie flag
  * _extensions_ - `Array` - any unrecognized cookie attributes as strings (even if equal-signs inside)
               
After a cookie has been passed through `CookieJar.setCookie()` it will have the following additional attributes:

  * _hostOnly_ - boolean - is this a host-only cookie (i.e. no Domain field was set, but was instead implied)
  * _created_ - `Date` - when this cookie was added to the jar
  * _lastAccessed_ - `Date` - last time the cookie got accessed. Will affect cookie cleaning once implemented.  Using `cookiejar.getCookies(...)` will update this attribute.

.toString()
-----------

encode to a Set-Cookie header value.  The Expires cookie field is set using `formatDate()`, but is omitted entirely if `.expires` is `Infinity`.

.cookieString()
---------------

encode to a Cookie header value (i.e. the `.key` and `.value` properties joined with '=').

.setExpires(String)
-------------------

sets the expiry based on a date-string passed through `parseDate()`

.expiryTime([now=Date.now()])
-----------------------------

.expiryDate([now=Date.now()])
-----------------------------

Computes the absolute unix-epoch milliseconds that this cookie expires (or a `Date` object in the case of `expiryDate()`).  Note that in both cases `now` should be milliseconds.

Max-Age takes precedence over Expires (as per the RFC). The `.created` attribute -- or, by default, the `now` paramter -- is used to offset the `.maxAge` attribute.

If Expires (`.expires`) is set, that's returned.

Otherwise, `expiryTime()` returns `Infinity` and `expiryDate()` returns a `Date` object for "Tue, 19 Jan 2038 03:14:07 GMT" (latest date that can be expressed by a 32-bit `time_t`; the common limit for most user-agents).

.TTL(now)
---------

compute the TTL relative to `now` (milliseconds).  `Date.now()` is used by default.  The same precedence rules as for `expiryTime` apply.

.canonicalizedDoman()
---------------------

.cdomain()
----------

return the canonicalized `.domain` field.  This is lower-cased and punycode (RFC3490) encoded if the domain has any non-ASCII characters.

.validate()
-----------

Status: *IN PROGRESS*. Works for a few things, but is by no means comprehensive.

validates cookie attributes for semantic correctness.  Useful for "lint" checking any Set-Cookie headers you generate.  For now, it returns a boolean, but eventually could return a reason string -- you can future-proof with this construct:

``` javascript
if (cookie.validate() === true) {
  // it's tasty
} else {
  // yuck!
}
```

CookieJar
=========

Attributes
----------

  * _rejectPublicSuffixes_ - boolean - reject cookies with domains like "com" and "co.uk" (default: `true`)
                         
Since eventually this module would like to support database/remote/etc. CookieJars, continuation passing style is used for CookieJar methods.

.setCookie(cookieOrString, currentUrl, [{options},] cb(err,cookie))
-------------------------------------------------------------------

Attempt to set the cookie in the cookie jar.  If the operation fails, an error will be given to the callback `cb`, otherwise the cookie is passed through.  The cookie will have updated `.created`, `.lastAccessed` and `.hostOnly` properties.

The `options` object can be omitted.  Options are:

  * _http_ - boolean - default `true` - indicates if this is an HTTP or non-HTTP API.  Affects HttpOnly cookies.
  * _strict_ - boolean - default `false` - perform extra checks
                                                                   
.storeCookie(cookie, [{options},] cb(err,cookie))
-------------------------------------------------

called internally by setCookie.  This is likely to be the "hook" that fancy CookieJars override.
                                                
.getCookies(currentUrl, [{options},] cb(err,cookies))
-----------------------------------------------------

Retrieve the list of cookies that can be sent in a Cookie header for the current url.

If an error is encountered, that's passed as `err` to the callback, otherwise an `Array` of `Cookie` objects is passed.

The `options` object can be omitted.  If the url starts with `https:` or `wss:` then `{secure:true}` is implied for the options.  Disable this by passing `{secure:false}`.  If you want to simulate a non-HTTP API, pass the option `{http:false}`, otherwise it defaults to `true`.

The `.lastAccessed` property of the returned cookies will have been updated.

.getCookieString(...)
---------------------

Accepts the same options as `.getCookies()` but passes a string suitable for a Cookie header rather than an array to the callback.  Simply maps the `Cookie` array via `.cookieString()`.

.getSetCookieStrings(...)
---------------------

Accepts the same options as `.getCookies()` but passes an array of strings suitable for Set-Cookie headers (rather than an array of `Cookie`s) to the callback.  Simply maps the cookie array via `.toString()`.

# TODO

  * Release to NPM
  * _full_ RFC5890/RFC5891 canonicalization for domains in `cdomain()`
    * the optional `punycode` requirement implements RFC3492, but RFC6265 requires RFC5891
  * better tests for `validate()`?
  * getCookies sorting

# Copyright and License

(tl;dr: MIT with some MPL/1.1)

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

Portions may be licensed under different licenses (in particular public-suffix.txt is MPL/1.1); please read the LICENSE file for full details.
