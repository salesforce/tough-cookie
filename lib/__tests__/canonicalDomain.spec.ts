import { canonicalDomain } from '../cookie/canonicalDomain'

// port of tests/domain_and_path_test.js (canonicalDomain tests for domain normalization)
describe('canonicalDomain', () => {
  it.each([
    {
      description: 'already canonical',
      input: 'example.com',
      output: 'example.com',
    },
    {
      description: 'simple',
      input: 'EXAMPLE.com',
      output: 'example.com',
    },
    {
      description: 'leading dot stripped',
      input: '.EXAMPLE.com',
      output: 'example.com',
    },
    {
      description: 'trailing dot',
      input: 'EXAMPLE.com.',
      output: 'example.com.',
    },
    {
      description: 'leading and trailing dot',
      input: '.EXAMPLE.com.',
      output: 'example.com.',
    },
    {
      description: 'internal dots',
      input: '.EXAMPLE...com.',
      output: 'example...com.',
    },
    {
      description: 'IDN: test.test in greek',
      input: 'δοκιμή.δοκιμή',
      output: 'xn--jxalpdlp.xn--jxalpdlp',
    },

    { description: 'simple IPv6', input: '::1', output: '::1' },
    {
      description: 'full IPv6',
      input: '[::ffff:127.0.0.1]',
      output: '::ffff:7f00:1',
    },
    { description: 'invalid domain', input: 'NOTATLD', output: 'notatld' },
  ])('$description: $input → $output', ({ input, output }) => {
    expect(canonicalDomain(input)).toBe(output)
  })
})
