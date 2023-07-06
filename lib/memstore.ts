/*!
 * Copyright (c) 2015, Salesforce.com, Inc.
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
'use strict'
import {
  Callback,
  Cookie,
  createPromiseCallback,
  pathMatch,
  permuteDomain,
} from './cookie'
import { Store } from './store'
import { getCustomInspectSymbol, getUtilInspect } from './utilHelper'

export type MemoryCookieStoreIndex = {
  [domain: string]: {
    [path: string]: {
      [key: string]: Cookie
    }
  }
}

export class MemoryCookieStore extends Store {
  override synchronous: boolean
  idx: MemoryCookieStoreIndex

  constructor() {
    super()
    this.synchronous = true
    this.idx = Object.create(null) as MemoryCookieStoreIndex
    const customInspectSymbol = getCustomInspectSymbol()
    if (customInspectSymbol) {
      Object.defineProperty(this, customInspectSymbol, {
        value: this.inspect.bind(this),
        enumerable: false,
        writable: false,
        configurable: false,
      })
    }
  }

  inspect() {
    const util = { inspect: getUtilInspect(inspectFallback) }
    return `{ idx: ${util.inspect(this.idx, false, 2)} }`
  }

  override findCookie(
    domain: string | null,
    path: string | null,
    key: string | undefined,
  ): Promise<Cookie | null | undefined>
  override findCookie(
    domain: string | null,
    path: string | null,
    key: string | undefined,
    callback: Callback<Cookie | null | undefined>,
  ): void
  override findCookie(
    domain: string | null,
    path: string | null,
    key: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback?: Callback<Cookie | null | undefined>,
  ): unknown {
    const promiseCallback = createPromiseCallback(arguments)
    const cb = promiseCallback.callback

    if (domain == null || path == null) {
      return promiseCallback.resolve(undefined)
    }

    const domainEntry = this.idx[domain]
    if (!domainEntry) {
      return promiseCallback.resolve(undefined)
    }

    const pathEntry = domainEntry[path]
    if (!pathEntry) {
      return promiseCallback.resolve(undefined)
    }

    if (key == null) {
      return promiseCallback.resolve(null)
    }

    cb(null, pathEntry[key] || null)
    return promiseCallback.promise
  }

  override findCookies(
    domain: string,
    path: string,
    allowSpecialUseDomain?: boolean,
  ): Promise<Cookie[]>
  override findCookies(
    domain: string,
    path: string,
    allowSpecialUseDomain?: boolean,
    callback?: Callback<Cookie[]>,
  ): void
  override findCookies(
    domain: string,
    path: string,
    allowSpecialUseDomain: boolean | Callback<Cookie[]> = false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback?: Callback<Cookie[]>,
  ): unknown {
    if (typeof allowSpecialUseDomain === 'function') {
      allowSpecialUseDomain = true
    }

    const results: Cookie[] = []
    const promiseCallback = createPromiseCallback<Cookie[]>(arguments)
    const cb = promiseCallback.callback

    if (!domain) {
      return promiseCallback.resolve([])
    }

    let pathMatcher: (
      domainIndex: { [p: string]: { [p: string]: Cookie } } | undefined,
    ) => void
    if (!path) {
      // null means "all paths"
      pathMatcher = function matchAll(domainIndex) {
        for (const curPath in domainIndex) {
          const pathIndex = domainIndex[curPath]
          for (const key in pathIndex) {
            const value = pathIndex[key]
            if (value) {
              results.push(value)
            }
          }
        }
      }
    } else {
      pathMatcher = function matchRFC(domainIndex) {
        //NOTE: we should use path-match algorithm from S5.1.4 here
        //(see : https://github.com/ChromiumWebApps/chromium/blob/b3d3b4da8bb94c1b2e061600df106d590fda3620/net/cookies/canonical_cookie.cc#L299)
        for (const cookiePath in domainIndex) {
          if (pathMatch(path, cookiePath)) {
            const pathIndex = domainIndex[cookiePath]
            for (const key in pathIndex) {
              const value = pathIndex[key]
              if (value) {
                results.push(value)
              }
            }
          }
        }
      }
    }

    const domains = permuteDomain(domain, allowSpecialUseDomain) || [domain]
    const idx = this.idx
    domains.forEach((curDomain) => {
      const domainIndex = idx[curDomain]
      if (!domainIndex) {
        return
      }
      pathMatcher(domainIndex)
    })

    cb(null, results)
    return promiseCallback.promise
  }

  override putCookie(cookie: Cookie): Promise<void>
  override putCookie(cookie: Cookie, callback: Callback<void>): void
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override putCookie(cookie: Cookie, _callback?: Callback<void>): unknown {
    const promiseCallback = createPromiseCallback<void>(arguments)
    const cb = promiseCallback.callback

    const { domain, path, key } = cookie
    if (domain == null || path == null || key == null) {
      cb(null, undefined)
      return promiseCallback.promise
    }

    const domainEntry: {
      [path: string]: {
        [key: string]: Cookie
      }
    } =
      this.idx[domain] ??
      (Object.create(null) as {
        [path: string]: {
          [key: string]: Cookie
        }
      })

    this.idx[domain] = domainEntry

    const pathEntry: { [key: string]: Cookie } =
      domainEntry[path] ?? (Object.create(null) as { [key: string]: Cookie })

    domainEntry[path] = pathEntry

    pathEntry[key] = cookie

    cb(null, undefined)

    return promiseCallback.promise
  }

  override updateCookie(oldCookie: Cookie, newCookie: Cookie): Promise<void>
  override updateCookie(
    oldCookie: Cookie,
    newCookie: Cookie,
    callback: Callback<void>,
  ): void
  override updateCookie(
    _oldCookie: Cookie,
    newCookie: Cookie,
    callback?: Callback<void>,
  ): unknown {
    // this seems wrong but it stops typescript from complaining and all the test pass...
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    callback = callback ?? function () {}

    // updateCookie() may avoid updating cookies that are identical.  For example,
    // lastAccessed may not be important to some stores and an equality
    // comparison could exclude that field.
    return this.putCookie(newCookie, callback)
  }

  override removeCookie(
    domain: string,
    path: string,
    key: string,
  ): Promise<void>
  override removeCookie(
    domain: string,
    path: string,
    key: string,
    callback: Callback<void>,
  ): void
  override removeCookie(
    domain: string,
    path: string,
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback?: Callback<void>,
  ): unknown {
    const promiseCallback = createPromiseCallback<void>(arguments)
    const cb = promiseCallback.callback

    const domainEntry = this.idx[domain]
    if (domainEntry) {
      const pathEntry = domainEntry[path]
      if (pathEntry) {
        const keyEntry = pathEntry[key]
        if (keyEntry) {
          delete pathEntry[key]
        }
      }
    }

    cb(null, undefined)
    return promiseCallback.promise
  }

  override removeCookies(domain: string, path: string): Promise<void>
  override removeCookies(
    domain: string,
    path: string,
    callback: Callback<void>,
  ): void
  override removeCookies(
    domain: string,
    path: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback?: Callback<void>,
  ): unknown {
    const promiseCallback = createPromiseCallback<void>(arguments)
    const cb = promiseCallback.callback

    const domainEntry = this.idx[domain]
    if (domainEntry) {
      if (path) {
        delete domainEntry[path]
      } else {
        delete this.idx[domain]
      }
    }

    cb(null)
    return promiseCallback.promise
  }

  override removeAllCookies(): Promise<void>
  override removeAllCookies(callback: Callback<void>): void
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override removeAllCookies(_callback?: Callback<void>): unknown {
    const promiseCallback = createPromiseCallback<void>(arguments)
    const cb = promiseCallback.callback

    this.idx = Object.create(null) as MemoryCookieStoreIndex

    cb(null)
    return promiseCallback.promise
  }

  override getAllCookies(): Promise<Cookie[]>
  override getAllCookies(callback: Callback<Cookie[]>): void
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override getAllCookies(_callback?: Callback<Cookie[]>): unknown {
    const promiseCallback = createPromiseCallback<Cookie[]>(arguments)
    const cb = promiseCallback.callback

    const cookies: Cookie[] = []
    const idx = this.idx

    const domains = Object.keys(idx)
    domains.forEach((domain) => {
      const domainEntry = idx[domain] ?? {}
      const paths = Object.keys(domainEntry)
      paths.forEach((path) => {
        const pathEntry = domainEntry[path] ?? {}
        const keys = Object.keys(pathEntry)
        keys.forEach((key) => {
          const keyEntry = pathEntry[key]
          if (keyEntry != null) {
            cookies.push(keyEntry)
          }
        })
      })
    })

    // Sort by creationIndex so deserializing retains the creation order.
    // When implementing your own store, this SHOULD retain the order too
    cookies.sort((a, b) => {
      return (a.creationIndex || 0) - (b.creationIndex || 0)
    })

    cb(null, cookies)
    return promiseCallback.promise
  }
}

export function inspectFallback(val: unknown): string {
  if (val === null) {
    return 'null'
  }

  if (val === undefined) {
    return 'undefined'
  }

  if (typeof val === 'string') {
    return `'${val}'`
  }

  if (typeof val === 'object') {
    const domains = Object.keys(val)
    if (domains.length === 0) {
      return '[Object: null prototype] {}'
    }
    let result = '[Object: null prototype] {\n'
    Object.keys(val).forEach((domain, i) => {
      if (inOperator(domain, val)) {
        result += formatDomain(domain, val[domain])
        if (i < domains.length - 1) {
          result += ','
        }
        result += '\n'
      }
    })
    result += '}'
    return result
  }

  return val.toString()
}

function formatDomain(domainName: string, domainValue: unknown) {
  if (domainValue === null) {
    return 'null'
  }

  if (domainValue === undefined) {
    return 'undefined'
  }

  if (typeof domainValue === 'string') {
    return `'${domainValue}'`
  }

  if (typeof domainValue === 'object') {
    const indent = '  '
    let result = `${indent}'${domainName}': [Object: null prototype] {\n`
    Object.keys(domainValue).forEach((path, i, paths) => {
      if (inOperator(path, domainValue)) {
        result += formatPath(path, domainValue[path])
        if (i < paths.length - 1) {
          result += ','
        }
        result += '\n'
      }
    })
    result += `${indent}}`
    return result
  }

  return domainValue.toString()
}

function formatPath(pathName: string, pathValue: unknown) {
  if (pathValue === null) {
    return 'null'
  }

  if (pathValue === undefined) {
    return 'undefined'
  }

  if (typeof pathValue === 'string') {
    return `'${pathValue}'`
  }

  if (typeof pathValue === 'object') {
    const indent = '    '
    let result = `${indent}'${pathName}': [Object: null prototype] {\n`
    Object.keys(pathValue).forEach((cookieName, i, cookieNames) => {
      if (inOperator(cookieName, pathValue)) {
        const cookie = pathValue[cookieName]
        if (
          cookie != null &&
          typeof cookie === 'object' &&
          inOperator('inspect', cookie) &&
          typeof cookie.inspect === 'function'
        ) {
          const inspectedValue: unknown = cookie.inspect()
          if (typeof inspectedValue === 'string') {
            result += `      ${cookieName}: ${inspectedValue}`
            if (i < cookieNames.length - 1) {
              result += ','
            }
            result += '\n'
          }
        }
      }
    })
    result += `${indent}}`
    return result
  }

  return pathValue.toString()
}

function inOperator<K extends string, T extends object>(
  k: K,
  o: T,
): o is T & Record<K, unknown> {
  return k in o
}
