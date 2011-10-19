/*
 * Copyright GoInstant, Inc. and other contributors. All rights reserved.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

var net = require('net');

function CookieJar() {
}

function Cookie() { }
Cookie.prototype.key = "";
Cookie.prototype.value = "";

// the order in which the RFC has them:
Cookie.prototype.expires = Infinity;
Cookie.prototype.maxAge = null; // takes precedence over expires for TTL
Cookie.prototype.domain = null;
Cookie.prototype.path = null;
Cookie.prototype.secure = false;
Cookie.prototype.httpOnly = false;
Cookie.prototype.extensions = null;


var DATE_DELIM = /[\x09\x20-\x2F\x3B-\x40\x5B-\x60\x7B-\x7E]/;

// From RFC2616 S2.2:
var TOKEN = /[\x21\x23-\x26\x2A\x2B\x2D\x2E\x30-\x39\x41-\x5A\x5E-\x7A\x7C\x7E]/;

// FROM RFC6265 S4.1.1
var COOKIE_OCTET  = /[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]/;
var COOKIE_OCTETS = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/;
var COOKIE_PAIR = new RegExp('^('+TOKEN.source+'+)=("?)('+COOKIE_OCTET.source+'+)\\2');

// RFC6265 S4.1.1 defines extension-av as 'any CHAR except CTLs or ";"'
// Note ';' is \x3B
var NON_CTL_SEMICOLON = /[\x20-\x3A\x3C-\x7E]+/;
var EXTENSION_AV = NON_CTL_SEMICOLON;
var PATH_VALUE = NON_CTL_SEMICOLON;

/* RFC6265 S5.1.1.5:
 * [fail if] the day-of-month-value is less than 1 or greater than 31
 */
var DAY_OF_MONTH = /^(0?[1-9]|[12][0-9]|3[01])$/;

/* RFC6265 S5.1.1.5:
 * [fail if]
 * *  the hour-value is greater than 23,
 * *  the minute-value is greater than 59, or
 * *  the second-value is greater than 59.
 */
var TIME = /^(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;

var MONTH = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i;
var MONTH_TO_NUM = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11
};
var NUM_TO_MONTH = [
  'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
];
var NUM_TO_DAY = [
  'Sun','Mon','Tue','Wed','Thu','Fri','Sat'
];

var YEAR = /^([1-9][0-9]{1,3})$/; // 2 to 4 digits (will check range when parsing)


// RFC6265 S5.1.1 date parser:
function parseDate(str) {
  if (!str) return;
  var found_time, found_dom, found_month, found_year;

  /* RFC6265 S5.1.1:
   * 2. Process each date-token sequentially in the order the date-tokens
   * appear in the cookie-date
   */
  var tokens = str.split(DATE_DELIM);
  if (!tokens) return;

  var date = new Date();
  date.setMilliseconds(0);

  for (var i=0; i<tokens.length; i++) {
    var token = tokens[i].trim();
    if (!token.length) continue;

    var result;

    /* 2.1. If the found-time flag is not set and the token matches the time
     * production, set the found-time flag and set the hour- value,
     * minute-value, and second-value to the numbers denoted by the digits in
     * the date-token, respectively.  Skip the remaining sub-steps and continue
     * to the next date-token.
     */
    if (!found_time) {
      result = TIME.exec(token);
      if (result) {
        found_time = true;
        date.setUTCHours(result[1]);
        date.setUTCMinutes(result[2]);
        date.setUTCSeconds(result[3]);
        continue;
      }
    }

    /* 2.2. If the found-day-of-month flag is not set and the date-token matches
     * the day-of-month production, set the found-day-of- month flag and set
     * the day-of-month-value to the number denoted by the date-token.  Skip
     * the remaining sub-steps and continue to the next date-token.
     */
    if (!found_dom) {
      result = DAY_OF_MONTH.exec(token);
      if (result) {
        found_dom = true;
        date.setUTCDate(result[1]);
        continue;
      }
    }

    /* 2.3. If the found-month flag is not set and the date-token matches the
     * month production, set the found-month flag and set the month-value to
     * the month denoted by the date-token.  Skip the remaining sub-steps and
     * continue to the next date-token.
     */
    if (!found_month) {
      result = MONTH.exec(token);
      if (result) {
        found_month = true;
        date.setUTCMonth(MONTH_TO_NUM[result[1].toLowerCase()]);
        continue;
      }
    }

    /* 2.4. If the found-year flag is not set and the date-token matches the year
     * production, set the found-year flag and set the year-value to the number
     * denoted by the date-token.  Skip the remaining sub-steps and continue to
     * the next date-token.
     */
    if (!found_year) {
      result = YEAR.exec(token);
      if (result) {
        var year = result[0];
        /* From S5.1.1:
         * 3.  If the year-value is greater than or equal to 70 and less
         * than or equal to 99, increment the year-value by 1900.
         * 4.  If the year-value is greater than or equal to 0 and less
         * than or equal to 69, increment the year-value by 2000.
         */
        if (70 <= year && year <= 99)
          year += 1900;
        else if (0 <= year && year <= 69)
          year += 2000;

        if (year < 1601)
          return; // 5. ... the year-value is less than 1601

        found_year = true;
        date.setUTCFullYear(year);
        continue;
      }
    }
  }

  if (!(found_time && found_dom && found_month && found_year)) {
    return; // 5. ... at least one of the found-day-of-month, found-month, found-
            // year, or found-time flags is not set,
  }

  return date;
};

function formatDate(date) {
  var d = date.getUTCDate(); d = d > 10 ? d : '0'+d;
  var h = date.getUTCHours(); h = h > 10 ? h : '0'+h;
  var m = date.getUTCMinutes(); m = m > 10 ? m : '0'+m;
  var s = date.getUTCSeconds(); s = s > 10 ? s : '0'+s;
  return NUM_TO_DAY[date.getUTCDay()] + ', ' +
    d+' '+ NUM_TO_MONTH[date.getUTCMonth()] +' '+ date.getUTCFullYear() +' '+
    h+':'+m+':'+s+' GMT';
}

function canonicalDomain(str) {
  str = str.replace(/^\./,''); // S4.1.2.3 & S5.2.3: ignore leading .
  // TODO: RFC5890 normalization (IDNs and such). See S5.1.2.  For now there's
  // no need to split it up into components.
  return str.toLowerCase();
}

// S5.1.3 Domain Matching
function domainMatch(str,domStr) {
  /*
   * "The domain string and the string are identical. (Note that both the
   * domain string and the string will have been canonicalized to lower case at
   * this point)"
   */
  str = canonicalDomain(str);
  domStr = canonicalDomain(domStr);
  if (str == domStr) return true;

  /* "All of the following [three] conditions hold:" (order adjusted from the RFC) */

  /* "* The string is a host name (i.e., not an IP address)." */
  if (net.isIP(str)) return false;

  /* "* The domain string is a suffix of the string" */
  var idx = str.indexOf(domStr);
  if (idx <= 0) return false; // it's a non-match (-1) or prefix (0)

  // e.g "a.b.c".indexOf("b.c") === 2
  // 5 === 3+2
  if (str.length !== domStr.length + idx) // it's not a suffix
    return false;

  /* "* The last character of the string that is not included in the domain
  * string is a %x2E (".") character." */
  if (str.substr(idx-1,1) !== '.') return false;
  return true;
}


// RFC6265 S5.1.4 Paths and Path-Match

/*
 * "The user agent MUST use an algorithm equivalent to the following algorithm
 * to compute the default-path of a cookie:"
 *
 * Assumption: the path (and not query part or absolute uri) is passed in.
 */
function defaultPath(path) {
  // "2. If the uri-path is empty or if the first character of the uri-path is not
  // a %x2F ("/") character, output %x2F ("/") and skip the remaining steps.
  if (!path || path.substr(0,1) !== "/") return "/";

  // "3. If the uri-path contains no more than one %x2F ("/") character, output
  // %x2F ("/") and skip the remaining step."
  if (path === "/") return path;

  var rightSlash = path.lastIndexOf("/");
  if (rightSlash === 0) return "/";
  
  // "4. Output the characters of the uri-path from the first character up to,
  // but not including, the right-most %x2F ("/")."
  return path.slice(0, rightSlash);
}

/*
 * "A request-path path-matches a given cookie-path if at least one of the
 * following conditions holds:"
 */
function pathMatch(reqPath,cookiePath) {
  // "o  The cookie-path and the request-path are identical."
  if (cookiePath === reqPath)
    return true;

  var idx = reqPath.indexOf(cookiePath);
  if (idx === 0) {
    // "o  The cookie-path is a prefix of the request-path, and the last
    // character of the cookie-path is %x2F ("/")."
    if (cookiePath.substr(-1) === "/")
      return true;

    // " o  The cookie-path is a prefix of the request-path, and the first
    // character of the request-path that is not included in the cookie- path
    // is a %x2F ("/") character."
    if (reqPath.substr(cookiePath.length,1) === "/")
      return true;
  }

  return false;
}

Cookie.parse = parse;
function parse(str) {
  str = str.trim();
  var result = COOKIE_PAIR.exec(str);
  if (!result) return null;

  var c = new Cookie();
  c.key = result[1];
  c.value = result[3]; // 2 is quotes-or-not

  // chop off the cookie-pair
  str = str.slice(result.index + result[0].length);
  str = str.trim();
  if (str.length === 0) return c;

  /* RFC6265 S4.1.1 implies that there's just one of each kind of cookie-av (e.g.
   * Expires) and that it's not a valid cookie if there's duplicates.
   * Here, we overwrite the previous value.
   */
  var cookie_avs = str.split(/\s*;\s+/);
  while (cookie_avs.length) {
    var av = cookie_avs.shift();
    if (av.length === 0) continue;

    if (!EXTENSION_AV.test(av)) return null;

    var av_parts = av.split('=',2);
    var av_key = av_parts[0].toLowerCase();
    var av_value = av_parts[1];

    switch(av_key) {
    case 'expires':
      if (av_value == null) return null;
      c.expires = parseDate(av_value);
      if (c.expires == null) return null;
      break;

    case 'max-age':
      if (av_value == null) return null;
      c.maxAge = parseInt(av_value);
      if (c.maxAge == null) return null;
      break;

    case 'secure':
      if (av_value != null) return null; // can't have value
      c.secure = true;
      break;

    case 'httponly':
      if (av_value != null) return null; // can't have value
      c.httpOnly = true;
      break;

    case 'path':
      if (av_value == null) return null;
      c.path = av_value.trim();
      break;

    case 'domain':
      if (av_value == null) return null;
      c.domain = av_value.trim();
      if (c.domain.length === 0) c.domain = null; // S5.2.3 "if empty ... SHOULD ignore"
      /*
       * S4.1.2.3 "a trailing . if present will cause the user agent to ignore the attribute"
       * XXX IMHO, this seems ambiguous. Especially since it doesn't use
       * SHOULD/MUST wordage and is in a Non-normative section. Anyway, here it is:
       */
      if (c.domain.match(/\.$/)) c.domain = null;
      break;

    default:
      c.extensions = c.extensions || [];
      c.extensions.push(av);
      break;
    }
  }
  return c;
}

Cookie.prototype.validate = function validate() {
  if (!COOKIE_OCTETS.test(this.value))
    return false;
  if (this.expires !== Infinity && !(this.expires instanceof Date) && !parseDate(this.expires))
    return false;
  if (this.maxAge != null && this.maxAge <= 0)
    return false; // "Max-Age=" non-zero-digit *DIGIT
  if (this.path != null && !PATH_VALUE.test(this.path))
    return false;
  return true;
};

Cookie.prototype.setExpires = function setExpires(exp) {
  if (exp instanceof Date) this.expires = exp;
  else this.expires = parseDate(exp) || Infinity;
};

// gives Cookie header format
Cookie.prototype.cookieString = function cookieString() {
  if (COOKIE_OCTETS.test(this.value))
    return this.key+'='+this.value;
  else
    return this.key+'="'+this.value+'"';
};

// gives Set-Cookie header format
Cookie.prototype.toString = function toString() {
  var str = this.cookieString();

  if (this.expires !== Infinity) {
    if (this.expires instanceof Date)
      str += '; Expires='+formatDate(this.expires);
    else
      str += '; Expires='+this.expires;
  }

  if (this.maxAge != null && this.maxAge !== Infinity) {
    str += '; Max-Age='+this.maxAge;
  }

  if (this.domain)
    str += '; Domain='+this.domain;
  if (this.path)
    str += '; Path='+this.path;

  if (this.secure) str += '; Secure';
  if (this.httpOnly) str += '; HttpOnly';
  if (this.extensions) {
    this.extensions.forEach(function(ext) {
      str += '; '+ext;
    });
  }

  return str;
};

Cookie.prototype.TTL = function TTL(now) {
  /* RFC6265 S4.1.2.2 If a cookie has both the Max-Age and the Expires
   * attribute, the Max- Age attribute has precedence and controls the
   * expiration date of the cookie.
   */
  if (this.maxAge != null) {
    return this.maxAge * 1000;
  }

  if (this.expires !== Infinity) {
    if (!(this.expires instanceof Date)) {
      this.expires = parseDate(this.expires) || Infinity;
    }

    if (this.expires === Infinity)
      return Infinity;

    return this.expires.getTime() - (now || Date.now());
  }

  return Infinity;
};

Cookie.prototype.isSession = function isSession() {
  return (this.expires === Infinity && this.maxAge == null);
};

// Mostly S5.1.2 and S5.2.3:
Cookie.prototype.cdomain = 
Cookie.prototype.canonicalizedDomain = function canonicalizedDomain() {
  if (this.domain == null) return null;
  return canonicalDomain(this.domain);
};

module.exports = {
  CookieJar: CookieJar,
  Cookie: Cookie,
  parseDate: parseDate,
  formatDate: formatDate,
  parse: parse,
  domainMatch: domainMatch,
  defaultPath: defaultPath,
  pathMatch: pathMatch,
};
