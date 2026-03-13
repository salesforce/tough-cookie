import { describe, expect, it } from 'vitest'
import { domainMatch } from '../cookie/domainMatch.js'

describe('domainMatch', () => {
  // Library-specific behavior (not in RFC)
  describe('null and undefined inputs', () => {
    it.each([
      [null, 'example.com', undefined],
      ['example.com', null, undefined],
      [null, null, undefined],
      [undefined, undefined, undefined],
      ['', 'example.com', false],
      ['example.com', '', false],
      ['', '', true],
    ])('domainMatch(%s, %s) => %s', (domain, cookieDomain, expected) => {
      expect(domainMatch(domain, cookieDomain)).toBe(expected)
    })
  })

  describe('canonicalization', () => {
    it.each([
      // mixed case is canonicalized before comparison
      ['eXaMpLe.cOm', 'ExAmPlE.CoM', true],
      ['NOTATLD', 'notaTLD', true],
      // leading dot is stripped during canonicalization
      ['www.google.com', '.google.com', true],
      // non-ASCII hostnames are punycode-encoded during canonicalization
      ['\u{1FAE0}.com', 'xn--129h.com', true], // Emoji
      ['\u03C1\u04BB\u0456\u0455\u04BB.info', 'xn--2xa01ac71bc.info', true], // Greek + Cyrillic
      ['\u732B.cat', 'xn--z7x.cat', true], // Japanese
    ])('domainMatch(%s, %s) => %s', (domain, cookieDomain, expected) => {
      expect(domainMatch(domain, cookieDomain)).toBe(expected)
    })
  })

  // RFC 6265 Section 5.1.3 conditions
  describe('identical strings', () => {
    it.each([
      ['example.com', 'example.com', true],
      ['com', 'com', true],
      ['localhost', 'localhost', true],
      ['::1', '::1', true], // identical IPv6
      ['::3Xam:1e', '::3xaM:1e', true], // identical after canonicalization, even though malformed
      ['3xam::1e', '3xam::1e', true], // identical malformed IPv6
      ['com', 'net', false], // same length, not identical
    ])('domainMatch(%s, %s) => %s', (domain, cookieDomain, expected) => {
      expect(domainMatch(domain, cookieDomain)).toBe(expected)
    })
  })

  describe('suffix matching with dot boundary', () => {
    it.each([
      // valid suffix matches
      ['www.example.com', 'example.com', true],
      ['www.subdom.example.com', 'example.com', true],
      ['www.subdom.example.com', 'subdom.example.com', true],
      ['www.aaa.com', 'aaa.com', true],
      ['computer.com', 'com', true], // suffix string found at start of domain
      ['becoming.com', 'com', true], // suffix string found in middle of domain
      ['sitcom.com', 'com', true], // suffix string found just before '.' boundary

      // not a suffix
      ['no.ca', 'yes.ca', false],
      ['www.example.com.org', 'example.com', false], // substring but not suffix
      ['example.com', 'www.example.com.org', false], // neither

      // suffix but not on dot boundary
      ['wwwexample.com', 'example.com', false],
      ['aaaa.com', 'aaa.com', false],
      ['www.aaaa.com', 'aaa.com', false],
      ['www.aexample.com', 'example.com', false],

      // domain is super-string of string
      ['example.com', 'www.example.com', false],
      ['aaa.com', 'aaaa.com', false],

      // trailing dot
      ['example.com', 'example.com.', false], // RFC6265 S4.1.2.3

      // dot-only inputs
      ['.', '.', true],
      ['..', '.', true], // canonicalization strips leading dot from '..' leaving '.', which matches
    ])('domainMatch(%s, %s) => %s', (domain, cookieDomain, expected) => {
      expect(domainMatch(domain, cookieDomain)).toBe(expected)
    })
  })

  describe('IP address rejection', () => {
    it.each([
      // IPv4 addresses rejected for suffix matching
      ['192.168.0.1', '168.0.1', false],
      ['192.168.0.1', '68.0.1', false],
      ['192.168.0.1', '2.68.0.1', false],
      ['192.168.0.1', '92.68.0.1', false],
      ['10.1.2.3', '210.1.2.3', false],

      // IPv6 addresses rejected for suffix matching
      ['::ffff:192.168.0.1', '168.0.1', false],
      ['::ffff:192.168.0.1', '192.168.0.1', false],
      ['::FFFF:192.168.0.1', '192.168.0.1', false],
      ['::192.168.0.1', '192.168.0.1', false],
      ['2008::1', '::1', false],
      ['::1', '2008::1', false],
      ['::f00f:10.0.0.1', '10.0.0.1', false],
      ['10.0.0.1', '::f00f:10.0.0.1', false],
      [':ffff:192.168.0.1', '192.168.0.1', false],

      // malformed IPv6
      ['::3xam:1e', '2008::3xam:1e', false],
      ['::3xam::1e', '3xam::1e', false],
      ['3xam::1e', '::3xam:1e', false],

      // invalid IPs that pass as hostnames (suffix match succeeds)
      ['100.192.168.0.1', '168.0.1', true], // not a valid IPv4 (5 octets)
      ['100.192.168.0.1', '192.168.0.1', true], // not a valid IPv4 (5 octets)
      [':192.168.0.1', '168.0.1', true], // not valid IPv6 (single colon prefix)
      [':ffff:100.192.168.0.1', '192.168.0.1', true], // not valid IPv6
      [':ffff:192.168.0.1', '168.0.1', true], // not valid IPv6
      ['::Fxxx:192.168.0.1', '168.0.1', true], // not valid IPv6 (invalid hex)

      // IP-like hostnames (contain dots and numbers but are valid hostnames)
      ['1.example.com', 'example.com', true],
      ['11.example.com', 'example.com', true],
      ['192.168.0.1.example.com', 'example.com', true],
    ])('domainMatch(%s, %s) => %s', (domain, cookieDomain, expected) => {
      expect(domainMatch(domain, cookieDomain)).toBe(expected)
    })
  })

  describe('canonicalize=false', () => {
    it.each([
      // pre-canonicalized inputs match normally
      ['www.example.com', 'example.com', true],
      ['example.com', 'example.com', true],
      // mixed case is NOT canonicalized — fails identity check
      ['Example.com', 'example.com', false],
      // leading dot is NOT stripped
      ['www.google.com', '.google.com', false],
    ])('domainMatch(%s, %s, false) => %s', (domain, cookieDomain, expected) => {
      expect(domainMatch(domain, cookieDomain, false)).toBe(expected)
    })
  })
})
