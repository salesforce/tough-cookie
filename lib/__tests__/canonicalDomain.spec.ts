import { describe, expect, it } from 'vitest'
import { canonicalDomain } from '../cookie/canonicalDomain.js'

describe('canonicalDomain', () => {
  describe('null, undefined, and empty inputs', () => {
    it('should return undefined for null', () => {
      expect(canonicalDomain(null)).toBeUndefined()
    })

    it('should return undefined for undefined', () => {
      expect(canonicalDomain(undefined)).toBeUndefined()
    })

    it('should return empty string for empty string', () => {
      expect(canonicalDomain('')).toBe('')
    })

    it('should return empty string for whitespace-only', () => {
      expect(canonicalDomain('  ')).toBe('')
    })
  })

  describe('NR-LDH labels (ASCII-only domains)', () => {
    it.each([
      {
        description: 'already canonical',
        input: 'example.com',
        output: 'example.com',
      },
      {
        description: 'uppercase converted to lowercase',
        input: 'EXAMPLE.COM',
        output: 'example.com',
      },
      {
        description: 'mixed case',
        input: 'eXaMpLe.CoM',
        output: 'example.com',
      },
      {
        description: 'single label (no TLD)',
        input: 'NOTATLD',
        output: 'notatld',
      },
      {
        description: 'labels with digits',
        input: 'SUB1.EXAMPLE2.COM',
        output: 'sub1.example2.com',
      },
      {
        description: 'labels with hyphens',
        input: 'MY-HOST.EXAMPLE.COM',
        output: 'my-host.example.com',
      },
    ])('$description: $input → $output', ({ input, output }) => {
      expect(canonicalDomain(input)).toBe(output)
    })
  })

  describe('U-label to A-label conversion', () => {
    it.each([
      {
        description: 'Greek IDN',
        input: 'δοκιμή.δοκιμή',
        output: 'xn--jxalpdlp.xn--jxalpdlp',
      },
      {
        description: 'mixed ASCII and IDN labels',
        input: 'sub.δοκιμή.example.com',
        output: 'sub.xn--jxalpdlp.example.com',
      },
      {
        description: 'mixed ASCII and IDN labels with uppercase',
        input: 'SUB.δοκιμή.EXAMPLE.COM',
        output: 'sub.xn--jxalpdlp.example.com',
      },
      {
        description: 'emoji domain',
        input: '🍪.example.com',
        output: 'xn--hj8h.example.com',
      },
      {
        description: 'accented characters',
        input: 'café.example.com',
        output: 'xn--caf-dma.example.com',
      },
    ])('$description: $input → $output', ({ input, output }) => {
      expect(canonicalDomain(input)).toBe(output)
    })
  })

  describe('A-label passthrough', () => {
    it.each([
      {
        description: 'already encoded punycode',
        input: 'xn--jxalpdlp.xn--jxalpdlp',
        output: 'xn--jxalpdlp.xn--jxalpdlp',
      },
      {
        description: 'uppercase punycode prefix',
        input: 'XN--JXALPDLP.EXAMPLE.COM',
        output: 'xn--jxalpdlp.example.com',
      },
      {
        description: 'mixed A-label and NR-LDH',
        input: 'xn--jxalpdlp.example.com',
        output: 'xn--jxalpdlp.example.com',
      },
    ])('$description: $input → $output', ({ input, output }) => {
      expect(canonicalDomain(input)).toBe(output)
    })
  })

  describe('dot handling', () => {
    it.each([
      {
        description: 'leading dot stripped',
        input: '.EXAMPLE.com',
        output: 'example.com',
      },
      {
        description: 'trailing dot preserved',
        input: 'EXAMPLE.com.',
        output: 'example.com.',
      },
      {
        description: 'leading and trailing dot',
        input: '.EXAMPLE.com.',
        output: 'example.com.',
      },
      {
        description: 'consecutive dots preserved',
        input: '.EXAMPLE...com.',
        output: 'example...com.',
      },
    ])('$description: $input → $output', ({ input, output }) => {
      expect(canonicalDomain(input)).toBe(output)
    })
  })

  describe('IPv6 addresses', () => {
    it.each([
      {
        description: 'loopback without brackets',
        input: '::1',
        output: '::1',
      },
      {
        description: 'IPv4-mapped IPv6 with brackets',
        input: '[::ffff:127.0.0.1]',
        output: '::ffff:7f00:1',
      },
      {
        description: 'full IPv6 without brackets',
        input: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        output: '2001:db8:85a3::8a2e:370:7334',
      },
      {
        description: 'full IPv6 with brackets',
        input: '[2001:0db8:85a3:0000:0000:8a2e:0370:7334]',
        output: '2001:db8:85a3::8a2e:370:7334',
      },
    ])('$description: $input → $output', ({ input, output }) => {
      expect(canonicalDomain(input)).toBe(output)
    })
  })

  describe('non-NR-LDH ASCII labels (current behavior)', () => {
    it.each([
      {
        description: 'underscore in label',
        input: 'under_score.example.com',
        output: 'under_score.example.com',
      },
      {
        description: 'leading hyphen in label',
        input: '-invalid.example.com',
        output: '-invalid.example.com',
      },
      {
        description: 'trailing hyphen in label',
        input: 'invalid-.example.com',
        output: 'invalid-.example.com',
      },
    ])('$description: $input → $output', ({ input, output }) => {
      expect(canonicalDomain(input)).toBe(output)
    })
  })

  // draft-ietf-httpbis-rfc6265bis-22 expands the canonicalization algorithm with
  // validation steps that reject invalid labels. These tests document the expected
  // behavior once that validation is implemented.
  // See: https://www.ietf.org/archive/id/draft-ietf-httpbis-rfc6265bis-22.txt
  // See: https://lists.w3.org/Archives/Public/ietf-http-wg/2025JanMar/0140.html
  describe('draft bis-22 validation (future work)', () => {
    // bis-22 Step 4: "If any label is a Fake A-label then abort this algorithm
    // and fail to canonicalize the host name."
    it.skip('should reject fake A-labels (invalid punycode)', () => {
      expect(canonicalDomain('xn--abc.example.com')).toBeUndefined()
    })

    // bis-22 Step 2: "All labels must be one of U-label, A-label, or Non-Reserved
    // LDH (NR-LDH) label ... If any label is not one of these then abort this
    // algorithm and fail to canonicalize the host name."
    it.skip('should reject labels with underscores (not U-label, A-label, or NR-LDH)', () => {
      expect(canonicalDomain('under_score.example.com')).toBeUndefined()
    })

    it.skip('should reject labels with leading hyphens (not NR-LDH)', () => {
      expect(canonicalDomain('-invalid.example.com')).toBeUndefined()
    })
  })
})
