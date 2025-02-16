import { URL } from 'url';
import { isIP, isIPv4, isIPv6 } from 'net';

/**
 * Checks if the given IPv4 address is in the 127.0.0.0/8 loopback range.
 *
 * @remarks
 * @param address - The IPv4 address to check.
 * @returns `true` if the address is loopback, otherwise `false`.
 */
function isLoopbackV4(address: string): boolean {
  // 127.0.0.0/8: first octet = 127
  const octets = address.split('.');
  return (
    octets.length === 4 &&
    octets[0] !== undefined &&
    parseInt(octets[0], 10) === 127
  );
}

/**
 * Checks if the given IPv6 address is the loopback address (`::1`).
 *
 * @remarks
 * @param address - The IPv6 address to check.
 * @returns `true` if the address is loopback, otherwise `false`.
 */
function isLoopbackV6(address: string): boolean {
  // new URL(...) follows the WHATWG URL Standard
  // which compresses IPv6 addresses, therefore the IPv6
  // loopback address will always be compressed to '[::1]':
  // https://url.spec.whatwg.org/#concept-ipv6-serializer
  return (address === '::1');
}

/**
 * Determines if the given address (IPv4 or IPv6) is a loopback address.
 *
 * @remarks
 * @param address - The IP address to check.
 * @returns `true` if the address is loopback, otherwise `false`.
 */
function isIpLoopback(address: string): boolean {
  if (isIPv4(address)) {
    return isLoopbackV4(address);
  }

  if (isIPv6(address)) {
    return isLoopbackV6(address);
  }

  return false;
}

/**
 * Checks if the given host ends with the `.localhost` TLD (case-insensitive).
 *
 * @remarks
 * @param host - The host string to check.
 * @returns `true` if the host ends with `.localhost`, otherwise `false`.
 */
function isNormalizedLocalhostTLD(host: string): boolean {
  return host.toLowerCase().endsWith('.localhost');
}

/**
 * Checks if the given host is `localhost` or matches `*.localhost`.
 *
 * @remarks
 * @param host - The host string to check.
 * @returns `true` if the host is considered local, otherwise `false`.
 */
function isLocalHostname(host: string): boolean {
  return host.toLowerCase() === 'localhost' ||
    isNormalizedLocalhostTLD(host);
}

/**
 * Removes leading and trailing square brackets if present.
 * Adapted from https://github.com/chromium/chromium/blob/main/url/gurl.cc#L440-L448
 *
 * @param {string} host
 * @returns {string}
 */
function hostNoBrackets(host: string): string {
  if (host.length >= 2 && host.startsWith('[') && host.endsWith(']')) {
    return host.substring(1, host.length - 1);
  }
  return host;
}

/**
 * Determines if a URL string represents a potentially trustworthy origin.
 * 
 * A URL is considered potentially trustworthy if it:
 * - Uses HTTPS or WSS schemes
 * - Points to a loopback address (IPv4 127.0.0.0/8 or IPv6 ::1)
 * - Uses localhost or *.localhost hostnames
 * 
 * @param {string} urlString - The URL to check
 * @returns {boolean}
 * @see {@link https://w3c.github.io/webappsec-secure-contexts/#potentially-trustworthy-origin W3C Spec}
 */
export function isPotentiallyTrustworthy(inputUrl: string | URL): boolean {
  let url: URL;

  // try ... catch doubles as an opaque origin check
  if (typeof inputUrl === 'string') {
    try {
      url = new URL(inputUrl);
    } catch {
      return false;
    }
  } else {
    url = inputUrl;
  }

  const scheme = url.protocol.replace(':', '').toLowerCase();
  const hostname = hostNoBrackets(
    url.hostname
  ).replace(/\.+$/, '');

  if (
    scheme === 'https' ||
    scheme === 'wss' // https://w3c.github.io/webappsec-secure-contexts/#potentially-trustworthy-origin
  ) {
    return true;
  }

  // If it's already an IP literal, check if it's a loopback address
  if (isIP(hostname)) {
    return isIpLoopback(hostname);
  }

  // RFC 6761 states that localhost names will always resolve
  // to the respective IP loopback address:
  // https://datatracker.ietf.org/doc/html/rfc6761#section-6.3
  return isLocalHostname(hostname);
}
