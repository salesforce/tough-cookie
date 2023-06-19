import { canonicalDomain } from '../cookie'

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
  ])('$description: $input → $output', ({ input, output }) => {
    expect(canonicalDomain(input)).toBe(output)
  })
})
