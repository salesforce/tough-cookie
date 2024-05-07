import { getDomain } from 'tldts'

// RFC 6761
const SPECIAL_USE_DOMAINS = ['local', 'example', 'invalid', 'localhost', 'test']

const SPECIAL_TREATMENT_DOMAINS = ['localhost', 'invalid']

/**
 * Options for configuring how {@link getPublicSuffix} behaves.
 * @public
 */
export interface GetPublicSuffixOptions {
  /**
   * If set to `true` then the following {@link https://www.rfc-editor.org/rfc/rfc6761.html | Special Use Domains} will
   * be treated as if they were valid public suffixes ('local', 'example', 'invalid', 'localhost', 'test').
   *
   * @remarks
   * In testing scenarios it's common to configure the cookie store with so that `http://localhost` can be used as a domain:
   * ```json
   * {
   *   allowSpecialUseDomain: true,
   *   rejectPublicSuffixes: false
   * }
   * ```
   *
   * @defaultValue false
   */
  allowSpecialUseDomain?: boolean | undefined
  /**
   * If set to `true` then any errors that occur while executing {@link getPublicSuffix} will be silently ignored.
   *
   * @defaultValue false
   */
  ignoreError?: boolean | undefined
}

const defaultGetPublicSuffixOptions: GetPublicSuffixOptions = {
  allowSpecialUseDomain: false,
  ignoreError: false,
}

/**
 * Returns the public suffix of this hostname. The public suffix is the shortest domain
 * name upon which a cookie can be set.
 *
 * @remarks
 * A "public suffix" is a domain that is controlled by a
 * public registry, such as "com", "co.uk", and "pvt.k12.wy.us".
 * This step is essential for preventing attacker.com from
 * disrupting the integrity of example.com by setting a cookie
 * with a Domain attribute of "com".  Unfortunately, the set of
 * public suffixes (also known as "registry controlled domains")
 * changes over time.  If feasible, user agents SHOULD use an
 * up-to-date public suffix list, such as the one maintained by
 * the Mozilla project at http://publicsuffix.org/.
 * (See {@link https://www.rfc-editor.org/rfc/rfc6265.html#section-5.3 | RFC6265 - Section 5.3})
 *
 * @example
 * ```
 * getPublicSuffix('www.example.com') === 'example.com'
 * getPublicSuffix('www.subdomain.example.com') === 'example.com'
 * ```
 *
 * @param domain - the domain attribute of a cookie
 * @param options - optional configuration for controlling how the public suffix is determined
 * @public
 */
export function getPublicSuffix(
  domain: string,
  options: GetPublicSuffixOptions = {},
): string | undefined {
  options = { ...defaultGetPublicSuffixOptions, ...options }
  const domainParts = domain.split('.')
  const topLevelDomain = domainParts[domainParts.length - 1]
  const allowSpecialUseDomain = !!options.allowSpecialUseDomain
  const ignoreError = !!options.ignoreError

  if (
    allowSpecialUseDomain &&
    topLevelDomain !== undefined &&
    SPECIAL_USE_DOMAINS.includes(topLevelDomain)
  ) {
    if (domainParts.length > 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const secondLevelDomain = domainParts[domainParts.length - 2]!
      // In aforementioned example, the eTLD/pubSuf will be apple.localhost
      return `${secondLevelDomain}.${topLevelDomain}`
    } else if (SPECIAL_TREATMENT_DOMAINS.includes(topLevelDomain)) {
      // For a single word special use domain, e.g. 'localhost' or 'invalid', per RFC 6761,
      // "Application software MAY recognize {localhost/invalid} names as special, or
      // MAY pass them to name resolution APIs as they would for other domain names."
      return topLevelDomain
    }
  }

  if (
    !ignoreError &&
    topLevelDomain !== undefined &&
    SPECIAL_USE_DOMAINS.includes(topLevelDomain)
  ) {
    throw new Error(
      `Cookie has domain set to the public suffix "${topLevelDomain}" which is a special use domain. To allow this, configure your CookieJar with {allowSpecialUseDomain: true, rejectPublicSuffixes: false}.`,
    )
  }

  const publicSuffix = getDomain(domain, {
    allowIcannDomains: true,
    allowPrivateDomains: true,
  })
  if (publicSuffix) return publicSuffix
}
