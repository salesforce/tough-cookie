import { canonicalDomain } from './canonicalDomain'

// Dumped from ip-regex@4.0.0, with the following changes:
// * all capturing groups converted to non-capturing -- "(?:)"
// * support for IPv6 Scoped Literal ("%eth1") removed
// * lowercase hexadecimal only
const IP_REGEX_LOWERCASE =
  /(?:^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$)|(?:^(?:(?:[a-f\d]{1,4}:){7}(?:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,2}|:)|(?:[a-f\d]{1,4}:){4}(?:(?::[a-f\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,3}|:)|(?:[a-f\d]{1,4}:){3}(?:(?::[a-f\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,4}|:)|(?:[a-f\d]{1,4}:){2}(?:(?::[a-f\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,5}|:)|(?:[a-f\d]{1,4}:){1}(?:(?::[a-f\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,6}|:)|(?::(?:(?::[a-f\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,7}|:)))$)/

// S5.1.3 Domain Matching
export function domainMatch(
  str?: string | null,
  domStr?: string | null,
  canonicalize?: boolean,
): boolean | null {
  if (str == null || domStr == null) {
    return null
  }

  let _str: string | null
  let _domStr: string | null

  if (canonicalize !== false) {
    _str = canonicalDomain(str)
    _domStr = canonicalDomain(domStr)
  } else {
    _str = str
    _domStr = domStr
  }

  if (_str == null || _domStr == null) {
    return null
  }

  /*
   * S5.1.3:
   * "A string domain-matches a given domain string if at least one of the
   * following conditions hold:"
   *
   * " o The domain string and the string are identical. (Note that both the
   * domain string and the string will have been canonicalized to lower case at
   * this point)"
   */
  if (_str == _domStr) {
    return true
  }

  /* " o All of the following [three] conditions hold:" */

  /* "* The domain string is a suffix of the string" */
  const idx = _str.lastIndexOf(domStr)
  if (idx <= 0) {
    return false // it's a non-match (-1) or prefix (0)
  }

  // next, check it's a proper suffix
  // e.g., "a.b.c".indexOf("b.c") === 2
  // 5 === 3+2
  if (_str.length !== _domStr.length + idx) {
    return false // it's not a suffix
  }

  /* "  * The last character of the string that is not included in the
   * domain string is a %x2E (".") character." */
  if (_str.substr(idx - 1, 1) !== '.') {
    return false // doesn't align on "."
  }

  /* "  * The string is a host name (i.e., not an IP address)." */
  return !IP_REGEX_LOWERCASE.test(_str)
}
