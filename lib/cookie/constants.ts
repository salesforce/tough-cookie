/**
 * Cookie prefixes are a way to indicate that a given cookie was set with a set of attributes simply by inspecting the
 * first few characters of the cookie's name. These are defined in {@link https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-13#section-4.1.3 | RFC6265bis - Section 4.1.3}.
 *
 * The following values can be used to configure how a {@link CookieJar} enforces attribute restrictions for Cookie prefixes:
 *
 * - `silent` - Enable cookie prefix checking but silently ignores the cookie if conditions are not met. This is the default configuration for a {@link CookieJar}.
 *
 * - `strict` - Enables cookie prefix checking and will raise an error if conditions are not met.
 *
 * - `unsafe-disabled` - Disables cookie prefix checking.
 * @public
 */
export const PrefixSecurityEnum = {
  SILENT: 'silent',
  STRICT: 'strict',
  DISABLED: 'unsafe-disabled',
} as const
Object.freeze(PrefixSecurityEnum)

const IP_V6_REGEX = `
\\[?(?:
(?:[a-fA-F\\d]{1,4}:){7}(?:[a-fA-F\\d]{1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|:[a-fA-F\\d]{1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,2}|:)|
(?:[a-fA-F\\d]{1,4}:){4}(?:(?::[a-fA-F\\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,3}|:)|
(?:[a-fA-F\\d]{1,4}:){3}(?:(?::[a-fA-F\\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,4}|:)|
(?:[a-fA-F\\d]{1,4}:){2}(?:(?::[a-fA-F\\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,5}|:)|
(?:[a-fA-F\\d]{1,4}:){1}(?:(?::[a-fA-F\\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,6}|:)|
(?::(?:(?::[a-fA-F\\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}|(?::[a-fA-F\\d]{1,4}){1,7}|:))
)(?:%[0-9a-zA-Z]{1,})?\\]?
`
  .replace(/\s*\/\/.*$/gm, '')
  .replace(/\n/g, '')
  .trim()
export const IP_V6_REGEX_OBJECT: RegExp = new RegExp(`^${IP_V6_REGEX}$`)

const IP_V4_REGEX = `(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])`
export const IP_V4_REGEX_OBJECT: RegExp = new RegExp(`^${IP_V4_REGEX}$`)

/**
 * A JSON representation of a {@link CookieJar}.
 * @public
 */
export interface SerializedCookieJar {
  /**
   * The version of `tough-cookie` used during serialization.
   */
  version: string
  /**
   * The name of the store used during serialization.
   */
  storeType: string | null
  /**
   * The value of {@link CreateCookieJarOptions.rejectPublicSuffixes} configured on the {@link CookieJar}.
   */
  rejectPublicSuffixes: boolean
  /**
   * Other configuration settings on the {@link CookieJar}.
   */
  [key: string]: unknown
  /**
   * The list of {@link Cookie} values serialized as JSON objects.
   */
  cookies: SerializedCookie[]
}

/**
 * A JSON object that is created when {@link Cookie.toJSON} is called. This object will contain the properties defined in {@link Cookie.serializableProperties}.
 * @public
 */
export type SerializedCookie = {
  key?: string
  value?: string
  [key: string]: unknown
}
