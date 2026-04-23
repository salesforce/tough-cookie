import type { Nullable } from '../utils.js'
import { canonicalDomain } from './canonicalDomain.js'

// Dumped from ip-regex@4.0.0, with the following changes:
// * all capturing groups converted to non-capturing -- "(?:)"
// * support for IPv6 Scoped Literal ("%eth1") removed
// * lowercase hexadecimal only
const IP_REGEX_LOWERCASE =
  /(?:^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$)|(?:^(?:(?:[a-f\d]{1,4}:){7}(?:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-f\d]{1,4}|:)|(?:[a-f\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,2}|:)|(?:[a-f\d]{1,4}:){4}(?:(?::[a-f\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,3}|:)|(?:[a-f\d]{1,4}:){3}(?:(?::[a-f\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,4}|:)|(?:[a-f\d]{1,4}:){2}(?:(?::[a-f\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,5}|:)|(?:[a-f\d]{1,4}:){1}(?:(?::[a-f\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,6}|:)|(?::(?:(?::[a-f\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-f\d]{1,4}){1,7}|:)))$)/

/**
 * Answers "does this real domain match the domain in a cookie?". The `domain` is the "current" domain name and the
 * `cookieDomain` is the "cookie" domain name. Matches according to {@link https://www.rfc-editor.org/rfc/rfc6265.html#section-5.1.3 | RFC6265 - Section 5.1.3},
 * but it helps to think of it as a "suffix match".
 *
 * @remarks
 * This implementation is compliant with RFC6265 Section 5.1.3 and compatible with
 * {@link https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.1.3 | draft-ietf-httpbis-rfc6265bis-22}
 * which adds a clarifying note that both inputs must be canonicalized but is otherwise identical.
 *
 * ### 5.1.3.  Domain Matching
 *
 * A string domain-matches a given domain string if at least one of the
 * following conditions hold:
 *
 * - The domain string and the string are identical.  (Note that both
 *     the domain string and the string will have been canonicalized to
 *     lower case at this point.)
 *
 * - All of the following conditions hold:
 *
 *     - The domain string is a suffix of the string.
 *
 *     - The last character of the string that is not included in the
 *         domain string is a %x2E (".") character.
 *
 *     - The string is a host name (i.e., not an IP address).
 *
 * @example
 * ```
 * domainMatch('example.com', 'example.com') === true
 * domainMatch('eXaMpLe.cOm', 'ExAmPlE.CoM') === true
 * domainMatch('no.ca', 'yes.ca') === false
 * ```
 *
 * @param domain - The domain string to test
 * @param cookieDomain - The cookie domain string to match against
 * @param canonicalize - The canonicalize parameter toggles whether the domain parameters get normalized with canonicalDomain or not
 * @public
 */
export function domainMatch(
  domain?: Nullable<string>,
  cookieDomain?: Nullable<string>,
  canonicalize?: boolean,
): boolean | undefined {
  // Library-specific: null/undefined input handling (not in RFC)
  if (domain == null || cookieDomain == null) {
    return undefined
  }

  let _str: Nullable<string>
  let _domStr: Nullable<string>

  // Library-specific: optional canonicalization (not in RFC)
  // The RFC algorithm assumes inputs are already canonicalized.
  if (canonicalize !== false) {
    _str = canonicalDomain(domain)
    _domStr = canonicalDomain(cookieDomain)
  } else {
    _str = domain
    _domStr = cookieDomain
  }

  // Library-specific: canonicalization failure handling (not in RFC)
  if (_str == null || _domStr == null) {
    return undefined
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.1.3-1
  // Note: This algorithm expects that both inputs are canonicalized.

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.1.3-2
  // A string domain-matches a given domain string if at least one of the
  // following conditions hold:

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.1.3-3.1.1
  // The domain string and the string are identical. (Note that both the
  // domain string and the string will have been canonicalized to lower case at
  // this point.)
  if (_str == _domStr) {
    return true
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.1.3-3.2.1
  // All of the following conditions hold:

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.1.3-3.2.2.1.1
  // The domain string is a suffix of the string.
  const idx = _str.lastIndexOf(_domStr)
  if (idx <= 0) {
    return false // it's a non-match (-1) or prefix (0)
  }

  // Verify it's a proper suffix (not just a substring match)
  // e.g., "a.b.c".lastIndexOf("b.c") === 2, and 5 === 3 + 2
  if (_str.length !== _domStr.length + idx) {
    return false // it's not a suffix
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.1.3-3.2.2.2.1
  // The last character of the string that is not included in the
  // domain string is a %x2E (".") character.
  if (_str.substring(idx - 1, idx) !== '.') {
    return false // doesn't align on "."
  }

  // https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-22#section-5.1.3-3.2.2.3.1
  // The string is a host name (i.e., not an IP address).
  return !IP_REGEX_LOWERCASE.test(_str)
}
