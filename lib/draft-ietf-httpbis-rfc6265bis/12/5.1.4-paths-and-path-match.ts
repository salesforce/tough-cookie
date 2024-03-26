import type { Url } from "url"

type RequestUri = {} & Url
type CookiePath = {} & string
type RequestPath = {} & string

// 5.1.4. Paths and Path-Match
// The user agent MUST use an algorithm equivalent to the following algorithm to compute the default-path of a cookie:
export function computeDefaultCookiePath(requestUri: RequestUri): CookiePath {
    // Let uri-path be the path portion of the request-uri if such a portion exists (and empty otherwise).
    const uriPath = requestUri.path ?? ''

    if (
        // If the uri-path is empty or
        uriPath === '' || 
        // if the first character of the uri-path is not a %x2F ("/") character
        !uriPath.startsWith('/')
    ) {
        // output %x2F ("/") and skip the remaining steps. 
        return '/'
    }

    // If the uri-path contains no more than one %x2F ("/") character, output %x2F ("/") and skip the remaining step.
    if (uriPath === '/') {  
        return '/'
    }

    // Output the characters of the uri-path from the first character up to, but not including, the right-most %x2F ("/").
    return uriPath.substring(0, uriPath.lastIndexOf('/'))
}

// A request-path path-matches a given cookie-path if at least one of the following conditions holds:
export function pathMatches(requestPath: RequestPath, cookiePath: CookiePath): boolean {
    // The cookie-path and the request-path are identical.
    // Note that this differs from the rules in [RFC3986] for equivalence of the path component, and hence 
    // two equivalent paths can have different cookies.
    if (requestPath === cookiePath) {
        return true
    }

    // The cookie-path is a prefix of the request-path, and the last character of the cookie-path is %x2F ("/").
    if (requestPath.startsWith(cookiePath) && /\x2f$/.test(cookiePath)) {
        return true
    }

    // The cookie-path is a prefix of the request-path, and the first character of the request-path that is 
    // not included in the cookie-path is a %x2F ("/") character.
    if (requestPath.startsWith(cookiePath) && requestPath[cookiePath.length] === '/') {
        return true
    }

    return false
} 
