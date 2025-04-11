import { IP_V4_REGEX_OBJECT, IP_V6_REGEX_OBJECT } from './constants.js'

function isLoopbackV4(address: string): boolean {
  // 127.0.0.0/8: first octet = 127
  const octets = address.split('.')
  return (
    octets.length === 4 &&
    octets[0] !== undefined &&
    parseInt(octets[0], 10) === 127
  )
}

function isLoopbackV6(address: string): boolean {
  // new URL(...) follows the WHATWG URL Standard
  // which compresses IPv6 addresses, therefore the IPv6
  // loopback address will always be compressed to '[::1]':
  // https://url.spec.whatwg.org/#concept-ipv6-serializer
  return address === '::1'
}

function isNormalizedLocalhostTLD(lowerHost: string): boolean {
  return lowerHost.endsWith('.localhost')
}

function isLocalHostname(host: string): boolean {
  const lowerHost = host.toLowerCase()
  return lowerHost === 'localhost' || isNormalizedLocalhostTLD(lowerHost)
}

// Adapted from https://github.com/chromium/chromium/blob/main/url/gurl.cc#L440-L448
function hostNoBrackets(host: string): string {
  if (host.length >= 2 && host.startsWith('[') && host.endsWith(']')) {
    return host.substring(1, host.length - 1)
  }
  return host
}

/**
 * Determines if a URL string represents a potentially trustworthy origin.
 *
 * A URL is considered potentially trustworthy if it:
 * - Uses HTTPS or WSS schemes
 * - If `allowSecureOnLocal` is `true`:
 *   - Points to a loopback address (IPv4 127.0.0.0/8 or IPv6 ::1)
 *   - Uses localhost or *.localhost hostnames
 *
 * @param inputUrl - The URL string or URL object to check.
 * @param allowSecureOnLocal - Whether to treat localhost and loopback addresses as trustworthy.
 * @returns `true` if the URL is potentially trustworthy, otherwise `false`.
 * @see {@link https://w3c.github.io/webappsec-secure-contexts/#potentially-trustworthy-origin | Potentially Trustworthy Origin algorithm}
 */
export function isPotentiallyTrustworthy(
  inputUrl: string | URL,
  allowSecureOnLocal: boolean = true,
): boolean {
  let url: URL

  // try ... catch doubles as an opaque origin check
  if (typeof inputUrl === 'string') {
    try {
      url = new URL(inputUrl)
    } catch {
      return false
    }
  } else {
    url = inputUrl
  }

  const scheme = url.protocol.replace(':', '').toLowerCase()
  const hostname = hostNoBrackets(url.hostname).replace(/\.+$/, '')

  if (
    scheme === 'https' ||
    scheme === 'wss' // https://w3c.github.io/webappsec-secure-contexts/#potentially-trustworthy-origin
  ) {
    return true
  }

  if (!allowSecureOnLocal) {
    return false
  }

  // If it's already an IP literal, check if it's a loopback address
  if (IP_V4_REGEX_OBJECT.test(hostname)) {
    return isLoopbackV4(hostname)
  }

  if (IP_V6_REGEX_OBJECT.test(hostname)) {
    return isLoopbackV6(hostname)
  }

  // RFC 6761 states that localhost names will always resolve
  // to the respective IP loopback address:
  // https://datatracker.ietf.org/doc/html/rfc6761#section-6.3
  return isLocalHostname(hostname)
}
