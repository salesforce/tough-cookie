/*!
 * Copyright (c) 2015-2020, Salesforce.com, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of Salesforce.com nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

// This file was too big before we added max-lines, and it's ongoing work to reduce its size.
/* eslint max-lines: [1, 750] */

import { getPublicSuffix } from '../getPublicSuffix'
import * as validators from '../validators'
import { Nullable, inOperator } from '../utils'

import { formatDate } from './formatDate'
import { parseDate } from './parseDate'
import { canonicalDomain } from './canonicalDomain'
import type { SerializedCookie } from './constants'

// From RFC6265 S4.1.1
// note that it excludes \x3B ";"
const COOKIE_OCTETS = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/

// RFC6265 S4.1.1 defines path value as 'any CHAR except CTLs or ";"'
// Note ';' is \x3B
const PATH_VALUE = /[\x20-\x3A\x3C-\x7E]+/

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1F]/

// From Chromium // '\r', '\n' and '\0' should be treated as a terminator in
// the "relaxed" mode, see:
// https://github.com/ChromiumWebApps/chromium/blob/b3d3b4da8bb94c1b2e061600df106d590fda3620/net/cookies/parsed_cookie.cc#L60
const TERMINATORS = ['\n', '\r', '\0']

function trimTerminator(str: string) {
  if (validators.isEmptyString(str)) return str
  for (let t = 0; t < TERMINATORS.length; t++) {
    const terminator = TERMINATORS[t]
    const terminatorIdx = terminator ? str.indexOf(terminator) : -1
    if (terminatorIdx !== -1) {
      str = str.slice(0, terminatorIdx)
    }
  }

  return str
}

function parseCookiePair(cookiePair: string, looseMode: boolean) {
  cookiePair = trimTerminator(cookiePair)
  validators.validate(validators.isString(cookiePair), cookiePair)

  let firstEq = cookiePair.indexOf('=')
  if (looseMode) {
    if (firstEq === 0) {
      // '=' is immediately at start
      cookiePair = cookiePair.substr(1)
      firstEq = cookiePair.indexOf('=') // might still need to split on '='
    }
  } else {
    // non-loose mode
    if (firstEq <= 0) {
      // no '=' or is at start
      return undefined // needs to have non-empty "cookie-name"
    }
  }

  let cookieName, cookieValue
  if (firstEq <= 0) {
    cookieName = ''
    cookieValue = cookiePair.trim()
  } else {
    cookieName = cookiePair.slice(0, firstEq).trim()
    cookieValue = cookiePair.slice(firstEq + 1).trim()
  }

  if (CONTROL_CHARS.test(cookieName) || CONTROL_CHARS.test(cookieValue)) {
    return undefined
  }

  const c = new Cookie()
  c.key = cookieName
  c.value = cookieValue
  return c
}

type ParseCookieOptions = {
  loose?: boolean | undefined
}

/**
 * Parses a string into a Cookie object.
 * @param str the Set-Cookie header or a Cookie string to parse. Note: when parsing a Cookie header it must be split by ';' before each Cookie string can be parsed.
 * @param options configures strict or loose mode for cookie parsing
 * @returns `Cookie` object for valid string inputs, `undefined` for invalid string inputs,
 * or `null` for non-string inputs or empty string
 */
function parse(
  str: string,
  options?: ParseCookieOptions,
  // TBD: Should we change the API to have a single "invalid input" return type? I think `undefined`
  // would be more consistent with the rest of the code, and it would be of minimal impact. Only
  // users who are passing an invalid input and doing an explicit null check would be broken, and
  // that doesn't seem like it would be a significant number of users.
): Cookie | undefined | null {
  if (validators.isEmptyString(str) || !validators.isString(str)) {
    return null
  }

  str = str.trim()

  // We use a regex to parse the "name-value-pair" part of S5.2
  const firstSemi = str.indexOf(';') // S5.2 step 1
  const cookiePair = firstSemi === -1 ? str : str.slice(0, firstSemi)
  const c = parseCookiePair(cookiePair, options?.loose ?? false)
  if (!c) {
    return undefined
  }

  if (firstSemi === -1) {
    return c
  }

  // S5.2.3 "unparsed-attributes consist of the remainder of the set-cookie-string
  // (including the %x3B (";") in question)." plus later on in the same section
  // "discard the first ";" and trim".
  const unparsed = str.slice(firstSemi + 1).trim()

  // "If the unparsed-attributes string is empty, skip the rest of these
  // steps."
  if (unparsed.length === 0) {
    return c
  }

  /*
   * S5.2 says that when looping over the items "[p]rocess the attribute-name
   * and attribute-value according to the requirements in the following
   * subsections" for every item.  Plus, for many of the individual attributes
   * in S5.3 it says to use the "attribute-value of the last attribute in the
   * cookie-attribute-list".  Therefore, in this implementation, we overwrite
   * the previous value.
   */
  const cookie_avs = unparsed.split(';')
  while (cookie_avs.length) {
    const av = (cookie_avs.shift() ?? '').trim()
    if (av.length === 0) {
      // happens if ";;" appears
      continue
    }
    const av_sep = av.indexOf('=')
    let av_key, av_value

    if (av_sep === -1) {
      av_key = av
      av_value = null
    } else {
      av_key = av.slice(0, av_sep)
      av_value = av.slice(av_sep + 1)
    }

    av_key = av_key.trim().toLowerCase()

    if (av_value) {
      av_value = av_value.trim()
    }

    switch (av_key) {
      case 'expires': // S5.2.1
        if (av_value) {
          const exp = parseDate(av_value)
          // "If the attribute-value failed to parse as a cookie date, ignore the
          // cookie-av."
          if (exp) {
            // over and underflow not realistically a concern: V8's getTime() seems to
            // store something larger than a 32-bit time_t (even with 32-bit node)
            c.expires = exp
          }
        }
        break

      case 'max-age': // S5.2.2
        if (av_value) {
          // "If the first character of the attribute-value is not a DIGIT or a "-"
          // character ...[or]... If the remainder of attribute-value contains a
          // non-DIGIT character, ignore the cookie-av."
          if (/^-?[0-9]+$/.test(av_value)) {
            const delta = parseInt(av_value, 10)
            // "If delta-seconds is less than or equal to zero (0), let expiry-time
            // be the earliest representable date and time."
            c.setMaxAge(delta)
          }
        }
        break

      case 'domain': // S5.2.3
        // "If the attribute-value is empty, the behavior is undefined.  However,
        // the user agent SHOULD ignore the cookie-av entirely."
        if (av_value) {
          // S5.2.3 "Let cookie-domain be the attribute-value without the leading %x2E
          // (".") character."
          const domain = av_value.trim().replace(/^\./, '')
          if (domain) {
            // "Convert the cookie-domain to lower case."
            c.domain = domain.toLowerCase()
          }
        }
        break

      case 'path': // S5.2.4
        /*
         * "If the attribute-value is empty or if the first character of the
         * attribute-value is not %x2F ("/"):
         *   Let cookie-path be the default-path.
         * Otherwise:
         *   Let cookie-path be the attribute-value."
         *
         * We'll represent the default-path as null since it depends on the
         * context of the parsing.
         */
        c.path = av_value && av_value[0] === '/' ? av_value : null
        break

      case 'secure': // S5.2.5
        /*
         * "If the attribute-name case-insensitively matches the string "Secure",
         * the user agent MUST append an attribute to the cookie-attribute-list
         * with an attribute-name of Secure and an empty attribute-value."
         */
        c.secure = true
        break

      case 'httponly': // S5.2.6 -- effectively the same as 'secure'
        c.httpOnly = true
        break

      case 'samesite': // RFC6265bis-02 S5.3.7
        switch (av_value ? av_value.toLowerCase() : '') {
          case 'strict':
            c.sameSite = 'strict'
            break
          case 'lax':
            c.sameSite = 'lax'
            break
          case 'none':
            c.sameSite = 'none'
            break
          default:
            c.sameSite = undefined
            break
        }
        break

      default:
        c.extensions = c.extensions || []
        c.extensions.push(av)
        break
    }
  }

  return c
}

function fromJSON(str: unknown) {
  if (!str || validators.isEmptyString(str)) {
    return null
  }

  let obj: unknown
  if (typeof str === 'string') {
    try {
      obj = JSON.parse(str)
    } catch (e) {
      return null
    }
  } else {
    // assume it's an Object
    obj = str
  }

  const c = new Cookie()
  Cookie.serializableProperties.forEach((prop) => {
    if (obj && typeof obj === 'object' && inOperator(prop, obj)) {
      const val = obj[prop]
      if (val === undefined) {
        return
      }

      if (inOperator(prop, cookieDefaults) && val === cookieDefaults[prop]) {
        return
      }

      switch (prop) {
        case 'key':
        case 'value':
        case 'sameSite':
          if (typeof val === 'string') {
            c[prop] = val
          }
          break
        case 'expires':
        case 'creation':
        case 'lastAccessed':
          if (
            typeof val === 'number' ||
            typeof val === 'string' ||
            val instanceof Date
          ) {
            c[prop] = obj[prop] == 'Infinity' ? 'Infinity' : new Date(val)
          } else if (val === null) {
            c[prop] = null
          }
          break
        case 'maxAge':
          if (
            typeof val === 'number' ||
            val === 'Infinity' ||
            val === '-Infinity'
          ) {
            c[prop] = val
          }
          break
        case 'domain':
        case 'path':
          if (typeof val === 'string' || val === null) {
            c[prop] = val
          }
          break
        case 'secure':
        case 'httpOnly':
          if (typeof val === 'boolean') {
            c[prop] = val
          }
          break
        case 'extensions':
          if (
            Array.isArray(val) &&
            val.every((item) => typeof item === 'string')
          ) {
            c[prop] = val
          }
          break
        case 'hostOnly':
        case 'pathIsDefault':
          if (typeof val === 'boolean' || val === null) {
            c[prop] = val
          }
          break
      }
    }
  })

  return c
}

const cookieDefaults = {
  // the order in which the RFC has them:
  key: '',
  value: '',
  expires: 'Infinity',
  maxAge: null,
  domain: null,
  path: null,
  secure: false,
  httpOnly: false,
  extensions: null,
  // set by the CookieJar:
  hostOnly: null,
  pathIsDefault: null,
  creation: null,
  lastAccessed: null,
  sameSite: undefined,
}

type CreateCookieOptions = {
  key?: string
  value?: string
  expires?: Nullable<Date | 'Infinity'>
  maxAge?: number | 'Infinity' | '-Infinity'
  domain?: Nullable<string>
  path?: Nullable<string>
  secure?: boolean
  httpOnly?: boolean
  extensions?: Nullable<string[]>
  creation?: Nullable<Date | 'Infinity'>
  creationIndex?: number
  hostOnly?: Nullable<boolean>
  pathIsDefault?: Nullable<boolean>
  lastAccessed?: Nullable<Date | 'Infinity'>
  sameSite?: string | undefined
}

export class Cookie {
  key: string | undefined
  value: string | undefined
  expires: Date | 'Infinity' | null | undefined
  maxAge: number | 'Infinity' | '-Infinity' | undefined
  domain: string | null | undefined
  path: string | null | undefined
  secure: boolean | undefined
  httpOnly: boolean | undefined
  extensions: string[] | null | undefined
  creation: Date | 'Infinity' | null
  creationIndex: number | undefined
  hostOnly: boolean | null | undefined
  pathIsDefault: boolean | null | undefined
  lastAccessed: Date | 'Infinity' | null | undefined
  sameSite: string | undefined

  constructor(options: CreateCookieOptions = {}) {
    Object.assign(this, cookieDefaults, options)
    this.creation = options.creation ?? cookieDefaults.creation ?? new Date()

    // used to break creation ties in cookieCompare():
    Object.defineProperty(this, 'creationIndex', {
      configurable: false,
      enumerable: false, // important for assert.deepEqual checks
      writable: true,
      value: ++Cookie.cookiesCreated,
    })
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    const now = Date.now()
    const hostOnly = this.hostOnly != null ? this.hostOnly.toString() : '?'
    const createAge =
      this.creation && this.creation !== 'Infinity'
        ? `${now - this.creation.getTime()}ms`
        : '?'
    const accessAge =
      this.lastAccessed && this.lastAccessed !== 'Infinity'
        ? `${now - this.lastAccessed.getTime()}ms`
        : '?'
    return `Cookie="${this.toString()}; hostOnly=${hostOnly}; aAge=${accessAge}; cAge=${createAge}"`
  }

  toJSON(): SerializedCookie {
    const obj: SerializedCookie = {}

    for (const prop of Cookie.serializableProperties) {
      const val = this[prop]

      if (val === cookieDefaults[prop]) {
        continue // leave as prototype default
      }

      switch (prop) {
        case 'key':
        case 'value':
        case 'sameSite':
          if (typeof val === 'string') {
            obj[prop] = val
          }
          break
        case 'expires':
        case 'creation':
        case 'lastAccessed':
          if (
            typeof val === 'number' ||
            typeof val === 'string' ||
            val instanceof Date
          ) {
            obj[prop] =
              val == 'Infinity' ? 'Infinity' : new Date(val).toISOString()
          } else if (val === null) {
            obj[prop] = null
          }
          break
        case 'maxAge':
          if (
            typeof val === 'number' ||
            val === 'Infinity' ||
            val === '-Infinity'
          ) {
            obj[prop] = val
          }
          break
        case 'domain':
        case 'path':
          if (typeof val === 'string' || val === null) {
            obj[prop] = val
          }
          break
        case 'secure':
        case 'httpOnly':
          if (typeof val === 'boolean') {
            obj[prop] = val
          }
          break
        case 'extensions':
          if (Array.isArray(val)) {
            obj[prop] = val
          }
          break
        case 'hostOnly':
        case 'pathIsDefault':
          if (typeof val === 'boolean' || val === null) {
            obj[prop] = val
          }
          break
      }
    }

    return obj
  }

  clone() {
    return fromJSON(this.toJSON())
  }

  validate() {
    if (this.value == null || !COOKIE_OCTETS.test(this.value)) {
      return false
    }
    if (
      this.expires != 'Infinity' &&
      !(this.expires instanceof Date) &&
      !parseDate(this.expires)
    ) {
      return false
    }
    if (
      this.maxAge != null &&
      this.maxAge !== 'Infinity' &&
      (this.maxAge === '-Infinity' || this.maxAge <= 0)
    ) {
      return false // "Max-Age=" non-zero-digit *DIGIT
    }
    if (this.path != null && !PATH_VALUE.test(this.path)) {
      return false
    }

    const cdomain = this.cdomain()
    if (cdomain) {
      if (cdomain.match(/\.$/)) {
        return false // S4.1.2.3 suggests that this is bad. domainMatch() tests confirm this
      }
      const suffix = getPublicSuffix(cdomain)
      if (suffix == null) {
        // it's a public suffix
        return false
      }
    }
    return true
  }

  setExpires(exp: string | Date) {
    if (exp instanceof Date) {
      this.expires = exp
    } else {
      this.expires = parseDate(exp) || 'Infinity'
    }
  }

  setMaxAge(age: number) {
    if (age === Infinity) {
      this.maxAge = 'Infinity'
    } else if (age === -Infinity) {
      this.maxAge = '-Infinity'
    } else {
      this.maxAge = age
    }
  }

  cookieString() {
    const val = this.value ?? ''
    if (this.key) {
      return `${this.key}=${val}`
    }
    return val
  }

  // gives Set-Cookie header format
  toString() {
    let str = this.cookieString()

    if (this.expires != 'Infinity') {
      if (this.expires instanceof Date) {
        str += `; Expires=${formatDate(this.expires)}`
      }
    }

    if (this.maxAge != null && this.maxAge != Infinity) {
      str += `; Max-Age=${this.maxAge}`
    }

    if (this.domain && !this.hostOnly) {
      str += `; Domain=${this.domain}`
    }
    if (this.path) {
      str += `; Path=${this.path}`
    }

    if (this.secure) {
      str += '; Secure'
    }
    if (this.httpOnly) {
      str += '; HttpOnly'
    }
    if (this.sameSite && this.sameSite !== 'none') {
      if (
        this.sameSite.toLowerCase() ===
        Cookie.sameSiteCanonical.lax.toLowerCase()
      ) {
        str += `; SameSite=${Cookie.sameSiteCanonical.lax}`
      } else if (
        this.sameSite.toLowerCase() ===
        Cookie.sameSiteCanonical.strict.toLowerCase()
      ) {
        str += `; SameSite=${Cookie.sameSiteCanonical.strict}`
      } else {
        str += `; SameSite=${this.sameSite}`
      }
    }
    if (this.extensions) {
      this.extensions.forEach((ext) => {
        str += `; ${ext}`
      })
    }

    return str
  }

  // TTL() partially replaces the "expiry-time" parts of S5.3 step 3 (setCookie()
  // elsewhere)
  // S5.3 says to give the "latest representable date" for which we use Infinity
  // For "expired" we use 0
  TTL(now: number = Date.now()): number {
    /* RFC6265 S4.1.2.2 If a cookie has both the Max-Age and the Expires
     * attribute, the Max-Age attribute has precedence and controls the
     * expiration date of the cookie.
     * (Concurs with S5.3 step 3)
     */
    if (this.maxAge != null && typeof this.maxAge === 'number') {
      return this.maxAge <= 0 ? 0 : this.maxAge * 1000
    }

    const expires = this.expires
    if (expires === 'Infinity') {
      return Infinity
    }

    return (expires?.getTime() ?? now) - (now || Date.now())
  }

  // expiryTime() replaces the "expiry-time" parts of S5.3 step 3 (setCookie()
  // elsewhere)
  expiryTime(now?: Date): number | undefined {
    if (this.maxAge != null) {
      const relativeTo = now || this.lastAccessed || new Date()
      const maxAge = typeof this.maxAge === 'number' ? this.maxAge : -Infinity
      const age = maxAge <= 0 ? -Infinity : maxAge * 1000
      if (relativeTo === 'Infinity') {
        return Infinity
      }
      return relativeTo.getTime() + age
    }

    if (this.expires == 'Infinity') {
      return Infinity
    }

    return this.expires ? this.expires.getTime() : undefined
  }

  // This replaces the "persistent-flag" parts of S5.3 step 3
  isPersistent(): boolean {
    return this.maxAge != null || this.expires != 'Infinity'
  }

  // Mostly S5.1.2 and S5.2.3:
  canonicalizedDomain() {
    if (this.domain == null) {
      return null
    }
    return canonicalDomain(this.domain)
  }

  cdomain() {
    return this.canonicalizedDomain()
  }

  static parse = parse

  static fromJSON = fromJSON

  static cookiesCreated = 0

  static sameSiteLevel = {
    strict: 3,
    lax: 2,
    none: 1,
  } as const

  static sameSiteCanonical = {
    strict: 'Strict',
    lax: 'Lax',
  } as const

  static serializableProperties = [
    'key',
    'value',
    'expires',
    'maxAge',
    'domain',
    'path',
    'secure',
    'httpOnly',
    'extensions',
    'hostOnly',
    'pathIsDefault',
    'creation',
    'lastAccessed',
    'sameSite',
  ] as const
}
