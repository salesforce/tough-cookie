// When a user agent receives a Set-Cookie header field in an HTTP response, the user agent MAY ignore the 
// Set-Cookie header field in its entirety (see Section 5.3).

import { parseCookieDate } from "./5-1-1_dates"

// If the user agent does not ignore the Set-Cookie header field in its entirety, the user agent MUST parse 
// the field-value of the Set-Cookie header field as a set-cookie-string (defined below).

// NOTE: The algorithm below is more permissive than the grammar in Section 4.1. For example, the algorithm 
// strips leading and trailing whitespace from the cookie name and value (but maintains internal whitespace), 
// whereas the grammar in Section 4.1 forbids whitespace in these positions. In addition, the algorithm below 
// accommodates some characters that are not cookie-octets according to the grammar in Section 4.1. User agents
// use this algorithm so as to interoperate with servers that do not follow the recommendations in Section 4.

// NOTE: As set-cookie-string may originate from a non-HTTP API, it is not guaranteed to be free of CTL 
// characters, so this algorithm handles them explicitly. Horizontal tab (%x09) is excluded from the CTL 
// characters that lead to set-cookie-string rejection, as it is considered whitespace, which is handled 
// separately.

// NOTE: The set-cookie-string may contain octet sequences that appear percent-encoded as per Section 2.1 
// of [RFC3986]. However, a user agent MUST NOT decode these sequences and instead parse the individual 
// octets as specified in this algorithm.

type SetCookieString = {} & string
type CookieResult = Cookie | IgnoredCookie
type IgnoredCookie = {} & string
type Domain = {} & string
type Path = {} & string
type CookieName = {} & string
type CookieValue = {} & string
type AttributePresent = ''
type SameSiteEnforcement = 'Default' | 'None' | 'Strict' | 'Lax'

type Cookie = {
    name: CookieName
    value: CookieValue
    attributes: CookieAttributeList
}

type CookieAttributeList = Array<
    | ExpiresAttribute 
    | MaxAgeAttribute 
    | DomainAttribute
    | PathAttribute
    | SecureAttribute
    | HttpOnlyAttribute
    | SameSiteAttribute
>

interface Attribute<K extends string, V> {
    attributeName: K
    attributeValue: V
}

type ExpiresAttribute = Attribute<'Expires', Date>
type MaxAgeAttribute = Attribute<'Max-Age', Date>
type DomainAttribute = Attribute<'Domain', Domain>
type PathAttribute = Attribute<'Path', Path>
type SecureAttribute = Attribute<'Secure', AttributePresent>
type HttpOnlyAttribute = Attribute<'HttpOnly', AttributePresent>
type SameSiteAttribute = Attribute<'SameSite', SameSiteEnforcement>

// A user agent MUST use an algorithm equivalent to the following algorithm to parse a set-cookie-string:
export function parseSetCookieString(setCookieString: SetCookieString): CookieResult {
    // If the set-cookie-string contains a: 
    if (
        // %x00-08
        /[\x00-\x08]/.test(setCookieString) ||
        // %x0A-1F
        /[\x0a-\x1f]/.test(setCookieString) ||
        // %x7F character (CTL characters excluding HTAB)
        /\x7f/.test(setCookieString)
    ) {
        // Abort these steps and ignore the set-cookie-string entirely.
        return setCookieString as IgnoredCookie
    }

    let nameValuePair: string
    let unparsedAttributes: string
    // If the set-cookie-string contains a %x3B (";") character:
    if (/\x3b/.test(setCookieString)) {
        // The name-value-pair string consists of the characters up to, but not including, 
        // the first %x3B (";"), and the unparsed-attributes consist of the remainder of 
        // the set-cookie-string (including the %x3B (";") in question).
        nameValuePair = setCookieString.substring(0, setCookieString.indexOf(';'))
        unparsedAttributes = setCookieString.substring(nameValuePair.length)
    } 
    // Otherwise:
    else { 
        // The name-value-pair string consists of all the characters contained in the set-cookie-string, 
        // and the unparsed-attributes is the empty string.
        nameValuePair = setCookieString
        unparsedAttributes = ''
    }

    let name: string
    let value: string
    // If the name-value-pair string lacks a %x3D ("=") character, 
    if (!/\x3d/.test(nameValuePair)) {
        // then the name string is empty, and the value string is the value of name-value-pair.
        name = ""
        value = nameValuePair
    }
    // Otherwise, 
    else {
        // the name string consists of the characters up to, but not including, the 
        // first %x3D ("=") character, and the (possibly empty) value string consists of the 
        // characters after the first %x3D ("=") character.
        name = nameValuePair.substring(0, nameValuePair.indexOf('='))
        value = nameValuePair.substring(name.length)
    }

    // Remove any leading or trailing WSP characters from the name string and the value string.
    name = name.trim()
    value = value.trim()

    // If the sum of the lengths of the name string and the value string is more than 4096 octets, 
    if (Buffer.from(name + value).byteLength > 4096) {
        // abort these steps and ignore the set-cookie-string entirely.
        return setCookieString as IgnoredCookie
    }

    // The cookie-name is the name string, and the cookie-value is the value string.
    const cookieName = name
    const cookieValue = value

    // The user agent MUST use an algorithm equivalent to the following algorithm to parse the unparsed-attributes:

    let cookieAttributeList: CookieAttributeList = []
    let consumedCharacters: string
    // If the unparsed-attributes string is empty, skip the rest of these steps.
    Step1: while (unparsedAttributes) {
        // Discard the first character of the unparsed-attributes (which will be a %x3B (";") character).
        unparsedAttributes = unparsedAttributes.substring(1)

        // If the remaining unparsed-attributes contains a %x3B (";") character:
        if (/\x3b/.test(unparsedAttributes)) {
            // Consume the characters of the unparsed-attributes up to, but not including, the first %x3B (";") character.
            consumedCharacters = unparsedAttributes.substring(0, unparsedAttributes.indexOf(';'))
        } 
        // Otherwise:
        else {
            // Consume the remainder of the unparsed-attributes.
            consumedCharacters = unparsedAttributes
        }
        // Let the cookie-av string be the characters consumed in this step.
        const cookieAV = consumedCharacters

        let attributeName: string
        let attributeValue: string
        // If the cookie-av string contains a %x3D ("=") character:
        if (/\x3d/.test(cookieAV)) {
            // The (possibly empty) attribute-name string consists of the characters up to, 
            // but not including, the first %x3D ("=") character, and the (possibly empty) 
            // attribute-value string consists of the characters after the first %x3D ("=") character.
            attributeName = cookieAV.substring(0, cookieAV.indexOf('='))
            attributeValue = cookieAV.substring(attributeName.length)
        } 
        // Otherwise:
        else {
            // The attribute-name string consists of the entire cookie-av string, 
            // and the attribute-value string is empty.
            attributeName = cookieAV
            attributeValue = ""
        }

        // Remove any leading or trailing WSP characters from the attribute-name string 
        // and the attribute-value string.
        attributeName = attributeName.trim()
        attributeValue = attributeValue.trim()

        // If the attribute-value is longer than 1024 octets, ignore the cookie-av string 
        // and return to Step 1 of this algorithm.
        if (Buffer.from(attributeName + attributeValue).byteLength > 1024) {
            continue Step1
        }

        // Process the attribute-name and attribute-value according to the requirements in 
        // the following subsections. (Notice that attributes with unrecognized attribute-names 
        // are ignored.)
        const caseInsenstiveAttributeName = attributeName.toLowerCase()
        switch (caseInsenstiveAttributeName) {
            case "expires": 
                parseExpiresAttribute(caseInsenstiveAttributeName, attributeValue, cookieAttributeList)
                break
            case "max-age":
                parseMaxAgeAttribute(caseInsenstiveAttributeName, attributeValue, cookieAttributeList)
                break
            case "domain":
                parseDomainAttribute(caseInsenstiveAttributeName, attributeValue, cookieAttributeList)
                break 
            case "path":
                parsePathAttribute(caseInsenstiveAttributeName, attributeValue, cookieAttributeList)
                break
            case "secure":
                parseSecureAttribute(caseInsenstiveAttributeName, attributeValue, cookieAttributeList)               
                break
            case 'httponly':
                parseHttpOnlyAttribute(caseInsenstiveAttributeName, attributeValue, cookieAttributeList)
                break
            case 'samesite':
                parseSameSiteAttribute(caseInsenstiveAttributeName, attributeValue, cookieAttributeList)
        }

        // Return to Step 1 of this algorithm.
        continue Step1
    }

    // When the user agent finishes parsing the set-cookie-string, the user agent is said to 
    // "receive a cookie" from the request-uri with name cookie-name, value cookie-value, and 
    // attributes cookie-attribute-list. (See Section 5.6 for additional requirements triggered 
    // by receiving a cookie.)
    return {
        name: cookieName,
        value: cookieValue,
        attributes: cookieAttributeList
    }
}

type CaseInsensitiveAttributeName<T> = T extends { attributeName: infer Name }
    ? Name extends string
        ? Lowercase<Name>
        : never
    : never

// 5.5.1. The Expires Attribute
function parseExpiresAttribute(
    attributeName: CaseInsensitiveAttributeName<ExpiresAttribute>, 
    attributeValue: string, 
    cookieAttributeList: CookieAttributeList
) {
    // If the attribute-name case-insensitively matches the string "Expires", 
    // the user agent MUST process the cookie-av as follows.

    // Let the expiry-time be the result of parsing the attribute-value as cookie-date (see Section 5.1.1).
    let expiryTime: Date
    try {
        expiryTime = parseCookieDate(attributeValue)
    } 
    // If the attribute-value failed to parse as a cookie date,
    catch (e) {
        // ignore the cookie-av.
        return 
    }

    // Let cookie-age-limit be the maximum age` of the cookie (which SHOULD be 400 days in the future 
    // or sooner, see Section 4.1.2.1).
    const cookieAgeLimit = new Date(Date.now() + (400 * 1000 * 60 * 60 * 24))

    // If the expiry-time is more than cookie-age-limit, the user agent MUST set the expiry time to 
    // cookie-age-limit in seconds.
    if (expiryTime.getTime() > cookieAgeLimit.getTime()) {
        expiryTime = cookieAgeLimit
    }

    // If the expiry-time is earlier than the earliest date the user agent can represent, the user agent 
    // MAY replace the expiry-time with the earliest representable date.
    if (expiryTime.getTime() < new Date().getTime()) {
        expiryTime = new Date()
    }

    // Append an attribute to the cookie-attribute-list with an attribute-name of Expires and an 
    // attribute-value of expiry-time.
    cookieAttributeList.push({
        attributeName: 'Expires',
        attributeValue: expiryTime
    })
}

// 5.5.2. The Max-Age Attribute
function parseMaxAgeAttribute(
    attributeName: CaseInsensitiveAttributeName<MaxAgeAttribute>, 
    attributeValue: string, 
    cookieAttributeList: CookieAttributeList
) {
    // If the attribute-name case-insensitively matches the string "Max-Age", the user agent MUST process 
    // the cookie-av as follows.

    // If the attribute-value is empty, 
    if (attributeValue === '') {
        // ignore the cookie-av.
        return '' as IgnoredCookie
    }

    // If the first character of the attribute-value is neither a DIGIT, nor a "-" character followed by a DIGIT, 
    if (/^(\d|\-\d)/.test(attributeValue)) {
        // ignore the cookie-av.
        return '' as IgnoredCookie
    } 

    // If the remainder of attribute-value contains a non-DIGIT character, 
    if (/[^\d]/.test(attributeValue)) {
        // ignore the cookie-av.
        return '' as IgnoredCookie
    }

    // Let delta-seconds be the attribute-value converted to a base 10 integer.
    let deltaSeconds = parseInt(attributeValue, 10)

    // Let cookie-age-limit be the maximum age` of the cookie (which SHOULD be 400 days in the future 
    // or sooner, see Section 4.1.2.1).
    const cookieAgeLimit = Date.now() + (400 * 1000 * 60 * 60 * 24)
    
    // Set delta-seconds to the smaller of its present value and cookie-age-limit.
    if (deltaSeconds > cookieAgeLimit) {
        deltaSeconds = cookieAgeLimit
    }

    let expiryTime
    // If delta-seconds is less than or equal to zero (0), 
    if (deltaSeconds <= 0) {
        // let expiry-time be the earliest representable date and time. 
        expiryTime = new Date()
    }
    // Otherwise, 
    else {
        // let the expiry-time be the current date and time plus delta-seconds seconds.
        expiryTime = new Date(Date.now() + deltaSeconds)
    }

    // Append an attribute to the cookie-attribute-list with an attribute-name of Max-Age and an attribute-value 
    // of expiry-time.
    cookieAttributeList.push({
        attributeName: 'Max-Age',
        attributeValue: expiryTime
    })
}

// 5.5.3. The Domain Attribute
function parseDomainAttribute(
    attributeName: CaseInsensitiveAttributeName<DomainAttribute>, 
    attributeValue: string, 
    cookieAttributeList: CookieAttributeList
) {
    // If the attribute-name case-insensitively matches the string "Domain", 
    // the user agent MUST process the cookie-av as follows.

    // Let cookie-domain be the attribute-value.
    let cookieDomain = attributeValue as Domain

    // If cookie-domain starts with %x2E ("."),
    if (cookieDomain.startsWith('.')) {
        // let cookie-domain be cookie-domain without its leading %x2E (".").
        cookieDomain = cookieDomain.substring(1)
    }

    // Convert the cookie-domain to lower case.
    cookieDomain = cookieDomain.toLowerCase()

    // Append an attribute to the cookie-attribute-list with an attribute-name of Domain 
    // and an attribute-value of cookie-domain.
    cookieAttributeList.push({
        attributeName: 'Domain',
        attributeValue: cookieDomain
    })
}

// 5.5.4. The Path Attribute
function parsePathAttribute(
    attributeName: CaseInsensitiveAttributeName<PathAttribute>, 
    attributeValue: string, 
    cookieAttributeList: CookieAttributeList
) {
    // If the attribute-name case-insensitively matches the string "Path", the user agent MUST process 
    // the cookie-av as follows.

    let cookiePath
    // If the attribute-value is empty or if the first character of the attribute-value is not %x2F ("/"):
    if (attributeValue === '' || !attributeValue.startsWith('/')) {
        // Let cookie-path be the default-path.
        cookiePath = '???'
    }
    // Otherwise:
    else {
        // Let cookie-path be the attribute-value.
        cookiePath = attributeValue
    }

    // Append an attribute to the cookie-attribute-list with an attribute-name of Path 
    // and an attribute-value of cookie-path.
    cookieAttributeList.push({
        attributeName: 'Path',
        attributeValue: cookiePath
    })
}

// 5.5.5. The Secure Attribute
function parseSecureAttribute(
    attributeName: CaseInsensitiveAttributeName<SecureAttribute>, 
    attributeValue: string, 
    cookieAttributeList: CookieAttributeList
) {
    // If the attribute-name case-insensitively matches the string "Secure", the user agent MUST 
    // append an attribute to the cookie-attribute-list with an attribute-name of Secure and an 
    // empty attribute-value.
    cookieAttributeList.push({
        attributeName: 'Secure',
        attributeValue: ''
    })
}

// 5.5.6. The HttpOnly Attribute
function parseHttpOnlyAttribute(
    attributeName: CaseInsensitiveAttributeName<HttpOnlyAttribute>, 
    attributeValue: string, 
    cookieAttributeList: CookieAttributeList
) {
    // If the attribute-name case-insensitively matches the string "HttpOnly", 
    // the user agent MUST append an attribute to the cookie-attribute-list 
    // with an attribute-name of HttpOnly and an empty attribute-value.
    cookieAttributeList.push({
        attributeName: 'HttpOnly',
        attributeValue: ''
    })
}

// 5.5.7. The SameSite Attribute
function parseSameSiteAttribute(
    // If the attribute-name case-insensitively matches the string "SameSite", 
    // the user agent MUST process the cookie-av as follows:
    _attributeName: CaseInsensitiveAttributeName<SameSiteAttribute>, 
    attributeValue: string, 
    cookieAttributeList: CookieAttributeList
) {
    // Let enforcement be "Default".
    let enforcement: SameSiteEnforcement = 'Default'

    const caseInsensitiveValue = attributeValue.toLowerCase()
    switch (caseInsensitiveValue) {
        // If cookie-av's attribute-value is a case-insensitive match for "None", 
        case 'none':
            // set enforcement to "None".
            enforcement = 'None'
            break

        // If cookie-av's attribute-value is a case-insensitive match for "Strict", 
        case 'strict':
            // set enforcement to "Strict".
            enforcement = 'Strict'
            break

        // If cookie-av's attribute-value is a case-insensitive match for "Lax", 
        case 'lax': 
            // set enforcement to "Lax".
            enforcement = 'Lax'
            break
    }

    // Append an attribute to the cookie-attribute-list with an attribute-name of 
    // "SameSite" and an attribute-value of enforcement.
    cookieAttributeList.push({
        attributeName: 'SameSite',
        attributeValue: enforcement
    })
}

// 5.5.7.1. "Strict" and "Lax" enforcement
// Same-site cookies in "Strict" enforcement mode will not be sent along with top-level 
// navigations which are triggered from a cross-site document context. As discussed in 
// Section 8.8.2, this might or might not be compatible with existing session management 
// systems. In the interests of providing a drop-in mechanism that mitigates the risk of 
// CSRF attacks, developers may set the SameSite attribute in a "Lax" enforcement mode 
// that carves out an exception which sends same-site cookies along with cross-site 
// requests if and only if they are top-level navigations which use a "safe" (in the 
// [HTTPSEM] sense) HTTP method. (Note that a request's method may be changed from POST 
// to GET for some redirects (see Sections 15.4.2 and 15.4.3 of [HTTPSEM]); in these cases, 
// a request's "safe"ness is determined based on the method of the current redirect hop.)
//
// Lax enforcement provides reasonable defense in depth against CSRF attacks that rely on 
// unsafe HTTP methods (like POST), but does not offer a robust defense against CSRF as 
// a general category of attack:
//
// Attackers can still pop up new windows or trigger top-level navigations in order to 
// create a "same-site" request (as described in Section 5.2.1), which is only a speedbump 
// along the road to exploitation.
//
// Features like <link rel='prerender'> [prerendering] can be exploited to create 
// "same-site" requests without the risk of user detection.
//
// When possible, developers should use a session management mechanism such as that 
// described in Section 8.8.2 to mitigate the risk of CSRF more completely.


// 5.5.7.2. "Lax-Allowing-Unsafe" enforcement
// As discussed in Section 8.8.6, compatibility concerns may necessitate the use of a "Lax-allowing-unsafe" enforcement mode that allows cookies to be sent with a cross-site HTTP request if and only if it is a top-level request, regardless of request method. That is, the "Lax-allowing-unsafe" enforcement mode waives the requirement for the HTTP request's method to be "safe" in the SameSite enforcement step of the retrieval algorithm in Section 5.7.3. (All cookies, regardless of SameSite enforcement mode, may be set for top-level navigations, regardless of HTTP request method, as specified in Section 5.6.)
// "Lax-allowing-unsafe" is not a distinct value of the SameSite attribute. Rather, user agents MAY apply "Lax-allowing-unsafe" enforcement only to cookies that did not explicitly specify a SameSite attribute (i.e., those whose same-site-flag was set to "Default" by default). To limit the scope of this compatibility mode, user agents which apply "Lax-allowing-unsafe" enforcement SHOULD restrict the enforcement to cookies which were created recently. Deployment experience has shown a cookie age of 2 minutes or less to be a reasonable limit.
// If the user agent uses "Lax-allowing-unsafe" enforcement, it MUST apply the following modification to the retrieval algorithm defined in Section 5.7.3:
// Replace the condition in the penultimate bullet point of step 1 of the retrieval algorithm reading
//  * The HTTP request associated with the retrieval uses a "safe"
//    method.
// with
//  * At least one of the following is true:
//    1.  The HTTP request associated with the retrieval uses a "safe"
//        method.
//    2.  The cookie's same-site-flag is "Default" and the amount of
//        time elapsed since the cookie's creation-time is at most a
//        duration of the user agent's choosing.