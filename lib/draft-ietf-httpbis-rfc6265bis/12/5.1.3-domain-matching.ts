import type { CanonicalizedHostName, Opaque } from "./5.1.2-canonicalized-host-names";

declare const CanonicalDomainTag: unique symbol
type CanonicalDomain = Opaque<string, typeof CanonicalDomainTag>

// #name-domain-matching
// 5.1.3. Domain Matching
export function domainMatches(hostName: CanonicalizedHostName, domain: CanonicalDomain): boolean {
    // #section-5.1.3-1
    // A string domain-matches a given domain string if at least one of the following conditions hold:

    // The domain string and the string are identical. (Note that both the domain string and the string will have been canonicalized to lower case at this point.)
    // #section-5.1.3-2.1
    if (hostName as string === domain as string) {
        return true
    }

    // All of the following conditions hold:
    // #section-5.1.3-2.2.1
    if (
        // The domain string is a suffix of the string.
        // #section-5.1.3-2.2.2.1
        isDomainASuffix(hostName, domain) &&
        // The last character of the string that is not included in the domain string is a %x2E (".") character.
        // #section-5.1.3-2.2.2.2
        lastCharacterOfStringNotIncludedInDomainIsADot(hostName, domain) 
        // The string is a host name (i.e., not an IP address).
        // #section-5.1.3-2.2.2.3
        // automatically true since we restrict the function input to CanonicalizedHostName so it's not an IPAddress
    ) { 
        return true 
    }

    return false
}

function isDomainASuffix(hostName: CanonicalizedHostName, domain: CanonicalDomain): boolean {
    return hostName.endsWith(domain)
}

function lastCharacterOfStringNotIncludedInDomainIsADot(hostName: CanonicalizedHostName, domain: CanonicalDomain): boolean {
    const lastCharIndex = hostName.length - domain.length - 1
    return hostName.charAt(lastCharIndex) === '.'
}