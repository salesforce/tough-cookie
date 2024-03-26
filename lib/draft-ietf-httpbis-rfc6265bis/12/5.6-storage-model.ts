// 5.6. Storage Model
// The user agent stores the following fields about each cookie: name, value, expiry-time, domain, 
// path, creation-time, last-access-time, persistent-flag, host-only-flag, secure-only-flag, 
// http-only-flag, and same-site-flag.

import { canonicalDomain } from "../../cookie"

// When the user agent "receives a cookie" from a request-uri with name cookie-name, value cookie-value, 
// and attributes cookie-attribute-list, the user agent MUST process the cookie as follows:
function storeCookie(
    userAgent: UserAgent, 
    requestUri: RequestUri, 
    name: CookieName, 
    value: CookieValue, 
    attributes: CookieAttributeList
) {
    // 1. A user agent MAY ignore a received cookie in its entirety. See Section 5.3.
    if (userAgent.ignoreCookie()) {
        return
    }

    // 2. If cookie-name is empty and cookie-value is empty, abort these steps and ignore the cookie entirely.
    if (name === '' && value === '') {
        return
    }

    // 3. If the cookie-name or the cookie-value contains a %x00-08 / %x0A-1F / %x7F character (CTL characters excluding HTAB),
    // abort these steps and ignore the cookie entirely.
    if (
        /(\x00-\x08|\x0a-\x1f|\x7f)/.test(name),
        /(\x00-\x08|\x0a-\x1f|\x7f)/.test(value)
    ) {
        return
    }

    // 4. If the sum of the lengths of cookie-name and cookie-value is more than 4096 octets, abort these steps and ignore the cookie entirely.
    if (Buffer.byteLength(name) + Buffer.byteLength(value) > 4096) {
        return
    }

    // 5. Create a new cookie with name cookie-name, value cookie-value. Set the creation-time and the last-access-time to the current date and time.
    const currentDateAndTime = Date.now()
    const cookie = {
        name,
        value,
        creationTime: currentDateAndTime,
        lastAccessTime: currentDateAndTime
    }

    // 6. If the cookie-attribute-list contains an attribute with an attribute-name of "Max-Age":  
    if (attributes.contains('Max-Age')) {
        // 1. Set the cookie's persistent-flag to true.
        cookie.persistedFlag = true
        // 2. Set the cookie's expiry-time to attribute-value of the last attribute in the cookie-attribute-list with an attribute-name of "Max-Age".
        cookie.expiryTime = attributes.get('Max-Age').last().value
    }
    // Otherwise, if the cookie-attribute-list contains an attribute with an attribute-name of "Expires" 
    // (and does not contain an attribute with an attribute-name of "Max-Age"):
    else if (attributes.contains('Expires')) {
        // 1. Set the cookie's persistent-flag to true.
        cookie.persistedFlag = true
        // 2. Set the cookie's expiry-time to attribute-value of the last attribute in the cookie-attribute-list with an attribute-name of "Expires".
        cookie.expiryTime = attributes.get('Expires').last().value
    }
    // Otherwise:
    else {
        // 1. Set the cookie's persistent-flag to false.
        cookie.persistedFlag = false
        // 2. Set the cookie's expiry-time to the latest representable date.
        cookie.expiryTime = currentDateAndTime
    }

    // 7. If the cookie-attribute-list contains an attribute with an attribute-name of "Domain":
    let domainAttribute;
    if (attributes.contains('Domain')) {
        // 1. Let the domain-attribute be the attribute-value of the last attribute in the cookie-attribute-list 
        // with both an attribute-name of "Domain" and an attribute-value whose length is no more than 1024 octets. 
        // (Note that a leading %x2E ("."), if present, is ignored even though that character is not permitted.)
        domainAttribute = attributes.get('Domain')
            .filter(attr => Buffer.byteLength(attr.value.startsWith('.') ? attr.value.substring(1) : attr.value) <= 1024)
            .last()
            .value
    }
    // Otherwise:
    else {
        // 1. Let the domain-attribute be the empty string.
        domainAttribute = ''
    }

    // 8. If the domain-attribute contains a character that is not in the range of [USASCII] characters, abort 
    // these steps and ignore the cookie entirely.
    if (/^ascii$/.test(domainAttribute)) {
        return
    }

    // 9. If the user agent is configured to reject "public suffixes" and the domain-attribute is a public suffix:
    if (userAgent.rejectPublicSuffixes && isPublicSuffix(domainAttribute)) {
        // 1. If the domain-attribute is identical to the canonicalized request-host:
        if (domainAttribute === canonicalDomain) {
            // 1. Let the domain-attribute be the empty string.
            domainAttribute = ''
        }
        // Otherwise:
        else {
            // 1. Abort these steps and ignore the cookie entirely.
            return
        }
        // NOTE: This step prevents attacker.example from disrupting the integrity of site.example by setting a cookie 
        // with a Domain attribute of "example".
    }

    // 10. If the domain-attribute is non-empty:
    let canonicalizedHostName = parseCanonicalizedHostName(requestUri)
    if (domainAttribute !== '') {
        // 1. If the canonicalized request-host does not domain-match the domain-attribute:
        if (domainMatches(canonicalizedHostName, domainAttribute)) {
            // 1. Abort these steps and ignore the cookie entirely.
            return
        }
        // Otherwise:
        else {
            // 1. Set the cookie's host-only-flag to false.
            cookie.hostOnly = false
            // 2. Set the cookie's domain to the domain-attribute.
            cookie.domain = domainAttribute
        }
    }
    // Otherwise:
    else {
        // 1. Set the cookie's host-only-flag to true.
        cookie.hostOnly = true
        // 2. Set the cookie's domain to the canonicalized request-host.
        cookie.domain = canonicalizedHostName
    }
}



// If the cookie-attribute-list contains an attribute with an attribute-name of "Path", set the cookie's path to attribute-value of the last attribute in the cookie-attribute-list with both an attribute-name of "Path" and an attribute-value whose length is no more than 1024 octets. Otherwise, set the cookie's path to the default-path of the request-uri.
// If the cookie-attribute-list contains an attribute with an attribute-name of "Secure", set the cookie's secure-only-flag to true. Otherwise, set the cookie's secure-only-flag to false.
// If the scheme component of the request-uri does not denote a "secure" protocol (as defined by the user agent), and the cookie's secure-only-flag is true, then abort these steps and ignore the cookie entirely.
// If the cookie-attribute-list contains an attribute with an attribute-name of "HttpOnly", set the cookie's http-only-flag to true. Otherwise, set the cookie's http-only-flag to false.
// If the cookie was received from a "non-HTTP" API and the cookie's http-only-flag is true, abort these steps and ignore the cookie entirely.
// If the cookie's secure-only-flag is false, and the scheme component of request-uri does not denote a "secure" protocol, then abort these steps and ignore the cookie entirely if the cookie store contains one or more cookies that meet all of the following criteria:

// Their name matches the name of the newly-created cookie.
// Their secure-only-flag is true.
// Their domain domain-matches the domain of the newly-created cookie, or vice-versa.
// The path of the newly-created cookie path-matches the path of the existing cookie.
// Note: The path comparison is not symmetric, ensuring only that a newly-created, non-secure cookie does not overlay an existing secure cookie, providing some mitigation against cookie-fixing attacks. That is, given an existing secure cookie named 'a' with a path of '/login', a non-secure cookie named 'a' could be set for a path of '/' or '/foo', but not for a path of '/login' or '/login/en'.

// If the cookie-attribute-list contains an attribute with an attribute-name of "SameSite", and an attribute-value of "Strict", "Lax", or "None", set the cookie's same-site-flag to the attribute-value of the last attribute in the cookie-attribute-list with an attribute-name of "SameSite". Otherwise, set the cookie's same-site-flag to "Default".
// If the cookie's same-site-flag is not "None":

// If the cookie was received from a "non-HTTP" API, and the API was called from a navigable's active document whose "site for cookies" is not same-site with the top-level origin, then abort these steps and ignore the newly created cookie entirely.
// If the cookie was received from a "same-site" request (as defined in Section 5.2), skip the remaining substeps and continue processing the cookie.
// If the cookie was received from a request which is navigating a top-level traversable [HTML] (e.g. if the request's "reserved client" is either null or an environment whose "target browsing context"'s navigable is a top-level traversable), skip the remaining substeps and continue processing the cookie.

// Note: Top-level navigations can create a cookie with any SameSite value, even if the new cookie wouldn't have been sent along with the request had it already existed prior to the navigation.

// Abort these steps and ignore the newly created cookie entirely.
// If the cookie's "same-site-flag" is "None", abort these steps and ignore the cookie entirely unless the cookie's secure-only-flag is true.
// If the cookie-name begins with a case-insensitive match for the string "__Secure-", abort these steps and ignore the cookie entirely unless the cookie's secure-only-flag is true.
// If the cookie-name begins with a case-insensitive match for the string "__Host-", abort these steps and ignore the cookie entirely unless the cookie meets all the following criteria:

// The cookie's secure-only-flag is true.
// The cookie's host-only-flag is true.
// The cookie-attribute-list contains an attribute with an attribute-name of "Path", and the cookie's path is /.
// If the cookie-name is empty and either of the following conditions are true, abort these steps and ignore the cookie:

// the cookie-value begins with a case-insensitive match for the string "__Secure-"
// the cookie-value begins with a case-insensitive match for the string "__Host-"
// If the cookie store contains a cookie with the same name, domain, host-only-flag, and path as the newly-created cookie:

// Let old-cookie be the existing cookie with the same name, domain, host-only-flag, and path as the newly-created cookie. (Notice that this algorithm maintains the invariant that there is at most one such cookie.)
// If the newly-created cookie was received from a "non-HTTP" API and the old-cookie's http-only-flag is true, abort these steps and ignore the newly created cookie entirely.
// Update the creation-time of the newly-created cookie to match the creation-time of the old-cookie.
// Remove the old-cookie from the cookie store.
// Insert the newly-created cookie into the cookie store.
// A cookie is "expired" if the cookie has an expiry date in the past.

// The user agent MUST evict all expired cookies from the cookie store if, at any time, an expired cookie exists in the cookie store.

// At any time, the user agent MAY "remove excess cookies" from the cookie store if the number of cookies sharing a domain field exceeds some implementation-defined upper bound (such as 50 cookies).

// At any time, the user agent MAY "remove excess cookies" from the cookie store if the cookie store exceeds some predetermined upper bound (such as 3000 cookies).

// When the user agent removes excess cookies from the cookie store, the user agent MUST evict cookies in the following priority order:

// Expired cookies.
// Cookies whose secure-only-flag is false, and which share a domain field with more than a predetermined number of other cookies.
// Cookies that share a domain field with more than a predetermined number of other cookies.
// All cookies.
// If two cookies have the same removal priority, the user agent MUST evict the cookie with the earliest last-access-time first.

// When "the current session is over" (as defined by the user agent), the user agent MUST remove from the cookie store all cookies with the persistent-flag set to false.