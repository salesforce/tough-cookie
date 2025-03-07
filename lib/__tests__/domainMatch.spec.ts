import { describe, expect, it } from 'vitest'
import { domainMatch } from '../cookie/domainMatch.js'

describe('domainMatch', () => {
  it.each([
    // string,       domain,       expect
    ['example.com', 'example.com', true], // identical
    ['eXaMpLe.cOm', 'ExAmPlE.CoM', true], // both canonicalized
    ['no.ca', 'yes.ca', false],
    ['wwwexample.com', 'example.com', false],
    ['www.subdom.example.com', 'example.com', true],
    ['www.subdom.example.com', 'subdom.example.com', true],
    ['example.com', 'example.com.', false], // RFC6265 S4.1.2.3

    // nulls and undefineds
    [null, 'example.com', undefined],
    ['example.com', null, undefined],
    [null, null, undefined],
    [undefined, undefined, undefined],

    // suffix matching:
    ['www.example.com', 'example.com', true], // substr AND suffix
    ['www.example.com.org', 'example.com', false], // substr but not suffix
    ['example.com', 'www.example.com.org', false], // neither
    ['example.com', 'www.example.com', false], // super-str
    ['aaa.com', 'aaaa.com', false], // str can't be suffix of domain
    ['aaaa.com', 'aaa.com', false], // dom is suffix, but has to match on "." boundary!
    ['www.aaaa.com', 'aaa.com', false],
    ['www.aaa.com', 'aaa.com', true],
    ['www.aexample.com', 'example.com', false], // has to match on "." boundary
    ['computer.com', 'com', true], // suffix string found at start of domain
    ['becoming.com', 'com', true], // suffix string found in middle of domain
    ['sitcom.com', 'com', true], // suffix string found just before the '.' boundary

    // S5.1.3 "The string is a host name (i.e., not an IP address)"
    ['192.168.0.1', '168.0.1', false], // because str is an IP (v4)
    ['100.192.168.0.1', '168.0.1', true], // WEIRD: because str is not a valid IPv4
    ['100.192.168.0.1', '192.168.0.1', true], // WEIRD: because str is not a valid IPv4
    ['::ffff:192.168.0.1', '168.0.1', false], // because str is an IP (v6)
    ['::ffff:192.168.0.1', '192.168.0.1', false], // because str is an IP (v6)
    ['::FFFF:192.168.0.1', '192.168.0.1', false], // because str is an IP (v6)
    ['::192.168.0.1', '192.168.0.1', false], // because str is an IP (yes, v6!)
    [':192.168.0.1', '168.0.1', true], // WEIRD: because str is not valid IPv6
    [':ffff:100.192.168.0.1', '192.168.0.1', true], // WEIRD: because str is not valid IPv6
    [':ffff:192.168.0.1', '192.168.0.1', false],
    [':ffff:192.168.0.1', '168.0.1', true], // WEIRD: because str is not valid IPv6
    ['::Fxxx:192.168.0.1', '168.0.1', true], // WEIRD: because str isnt IPv6
    ['192.168.0.1', '68.0.1', false],
    ['192.168.0.1', '2.68.0.1', false],
    ['192.168.0.1', '92.68.0.1', false],
    ['10.1.2.3', '210.1.2.3', false],
    ['2008::1', '::1', false],
    ['::1', '2008::1', false],
    ['::1', '::1', true], // "are identical" rule, despite IPv6
    ['::3xam:1e', '2008::3xam:1e', false], // malformed IPv6
    ['::3Xam:1e', '::3xaM:1e', true], // identical, even though malformed
    ['3xam::1e', '3xam::1e', true], // identical
    ['::3xam::1e', '3xam::1e', false],
    ['3xam::1e', '::3xam:1e', false],
    ['::f00f:10.0.0.1', '10.0.0.1', false],
    ['10.0.0.1', '::f00f:10.0.0.1', false],

    // "IP like" hostnames:
    ['1.example.com', 'example.com', true],
    ['11.example.com', 'example.com', true],
    ['192.168.0.1.example.com', 'example.com', true],

    // exact length "TLD" tests:
    ['com', 'net', false], // same len, non-match
    ['com', 'com', true], // "are identical" rule
    ['NOTATLD', 'notaTLD', true], // "are identical" rule (after canonicalization)

    // non-ASCII hostnames
    ['🫠.com', 'xn--129h.com', true], // Emoji!
    ['ρһіѕһ.info', 'xn--2xa01ac71bc.info', true], // Greek + Cyrillic characters
    ['猫.cat', 'xn--z7x.cat', true], // Japanese characters

    // domain that needs to be canonicalized
    ['www.google.com', '.google.com', true],
  ])('domainMatch(%s, %s) => %s', (string, domain, expectedValue) => {
    expect(domainMatch(string, domain)).toBe(expectedValue)
  })
})
