
function CookieJar() {
}

function Cookie() {
}
Cookie.prototype.key = "";
Cookie.prototype.value = "";
Cookie.prototype.expires = Infinity;
Cookie.prototype.path = "/";
Cookie.prototype.domain = null;
Cookie.prototype.secure = false;
Cookie.prototype.httpOnly = false;


var DATE_DELIM = /[\x09-\x09\x20-\x2F\x3B-\x40\x5B-\x60\x7B-\x7E]/;

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
var TIME = /^(0?[1-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;

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

var COOKIE_OCTET  =  /[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]/;
var COOKIE_OCTETS = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/;

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

        if (year <= 1601)
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
};

Cookie.prototype.validate = function validate() {
  if (!COOKIE_OCTETS.test(this.value))
    return false;
  if (this.expires !== Infinity && !(this.expires instanceof Date) && !parseDate(this.expires))
    return false;
  return true;
};

Cookie.prototype.setExpires = function setExpires(exp) {
  if (exp instanceof Date)
    this.expires = exp;
  else
    this.expires = parseDate(exp) || Infinity;
};

Cookie.prototype.toString = function toString() {
  var str = this.key + '=';

  if (COOKIE_OCTETS.test(this.value))
    str += this.value;
  else
    str += '"' + this.value + '"';

  if (this.expires !== Infinity) {
    if (this.expires instanceof Date)
      str += '; Expires='+formatDate(this.expires);
    else
      str += '; Expires='+this.expires;
  }

  return str;
};

module.exports = {
  CookieJar: CookieJar,
  Cookie: Cookie,
  parseDate: parseDate,
  formatDate: formatDate,
};
