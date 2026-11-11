import { describe, expect, it } from 'vitest'
import { Cookie } from '../cookie/cookie.js'
import { CookieJar } from '../cookie/cookieJar.js'
import { MemoryCookieStore } from '../memstore.js'
import { Store } from '../store.js'
import type { Nullable } from '../utils.js'

class PromiseOnlyStore extends Store {
  private readonly inner = new MemoryCookieStore()

  constructor() {
    super()
    this.synchronous = false
  }

  override findCookie(
    domain: Nullable<string>,
    path: Nullable<string>,
    key: Nullable<string>,
  ): Promise<Cookie | undefined> {
    return this.inner.findCookie(domain, path, key)
  }

  override findCookies(
    domain: Nullable<string>,
    path: Nullable<string>,
    allowSpecialUseDomain?: boolean,
  ): Promise<Cookie[]> {
    return this.inner.findCookies(
      domain as string,
      path as string,
      allowSpecialUseDomain,
    )
  }

  override putCookie(cookie: Cookie): Promise<void> {
    return this.inner.putCookie(cookie)
  }

  override updateCookie(oldCookie: Cookie, newCookie: Cookie): Promise<void> {
    return this.inner.updateCookie(oldCookie, newCookie)
  }

  override removeCookie(
    domain: Nullable<string>,
    path: Nullable<string>,
    key: Nullable<string>,
  ): Promise<void> {
    return this.inner.removeCookie(domain ?? '', path ?? '', key ?? '')
  }

  override removeCookies(
    domain: string,
    path: Nullable<string>,
  ): Promise<void> {
    return this.inner.removeCookies(domain, path ?? '')
  }

  override removeAllCookies(): Promise<void> {
    return this.inner.removeAllCookies()
  }

  override getAllCookies(): Promise<Cookie[]> {
    return this.inner.getAllCookies()
  }
}

async function withDeadline<T>(promise: Promise<T>): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('store operation did not settle'))
    }, 250)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

const url = 'http://example.com/'
const serializedJar = {
  cookies: [
    new Cookie({
      key: 'a',
      value: 'b',
      domain: 'example.com',
      path: '/',
    }).toJSON(),
  ],
}

describe('CookieJar with promise-only stores', () => {
  it('settles setCookie and getCookies', async () => {
    const jar = new CookieJar(new PromiseOnlyStore())

    await withDeadline(jar.setCookie('a=b', url))
    await withDeadline(jar.setCookie('a=c', url))
    const cookies = await withDeadline(jar.getCookies(url))

    expect(cookies.map((cookie) => cookie.cookieString())).toEqual(['a=c'])
  })

  it('settles serialize', async () => {
    const jar = new CookieJar(new PromiseOnlyStore())
    await withDeadline(jar.setCookie('a=b', url))

    const serialized = await withDeadline(jar.serialize())

    expect(serialized.cookies).toHaveLength(1)
  })

  it('settles deserialize', async () => {
    const jar = await withDeadline(
      CookieJar.deserialize(serializedJar, new PromiseOnlyStore()),
    )

    expect(await withDeadline(jar.getCookies(url))).toHaveLength(1)
  })

  it('settles removeAllCookies', async () => {
    const jar = new CookieJar(new PromiseOnlyStore())
    await withDeadline(jar.setCookie('a=b', url))

    await withDeadline(jar.removeAllCookies())

    expect(await withDeadline(jar.getCookies(url))).toHaveLength(0)
  })
})
