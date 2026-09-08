import { IP_V6_REGEX_OBJECT } from './constants.js'
import type { Nullable } from '../utils.js'
import { canonicalizedHostName } from './canonicalizedHostName.js'

/**
 * Transforms a domain name into a canonical domain name. The canonical domain name is a domain name
 * that has been trimmed, lowercased, stripped of leading dot, and optionally punycode-encoded
 * ({@link https://www.rfc-editor.org/rfc/rfc6265.html#section-5.1.2 | Section 5.1.2 of RFC 6265}). For
 * the most part, this function is idempotent (calling the function with the output from a previous call
 * returns the same output).
 *
 * @remarks
 * This function combines library-specific pre-processing with the RFC 6265
 * Section 5.1.2 canonicalization algorithm. The pre-processing steps (trimming,
 * leading-dot removal, IPv6 handling) are not part of the RFC but are required
 * by the cookie processing pipeline (S4.1.2.3 & S5.2.3). The actual RFC
 * algorithm is delegated to `canonicalizedHostName` (see `canonicalizedHostName.ts`).
 *
 * @example
 * ```
 * canonicalDomain('.EXAMPLE.com') === 'example.com'
 * ```
 *
 * @param domainName - the domain name to generate the canonical domain from
 * @public
 */
export function canonicalDomain(
  domainName: Nullable<string>,
): string | undefined {
  if (domainName == null) {
    return undefined
  }

  // Pre-processing (library-specific, not part of the RFC algorithm):
  // Trim whitespace and strip a leading dot, per S4.1.2.3 & S5.2.3.
  const str = domainName.trim().replace(/^\./, '')

  // IPv6 addresses are not domain name labels; handle them separately.
  // The RFC algorithm assumes domain name input.
  if (IP_V6_REGEX_OBJECT.test(str)) {
    let ipv6 = str
    if (!ipv6.startsWith('[')) {
      ipv6 = '[' + ipv6
    }
    if (!ipv6.endsWith(']')) {
      ipv6 = ipv6 + ']'
    }
    try {
      return new URL(`http://${ipv6}`).hostname.slice(1, -1)
    } catch {
      return undefined
    }
  }

  // Delegate to the RFC 6265 Section 5.1.2 algorithm.
  return canonicalizedHostName(str)
}
