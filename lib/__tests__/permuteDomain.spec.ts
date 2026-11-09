import { describe, expect, it } from 'vitest'
import { permuteDomain } from '../permuteDomain.js'

describe('permuteDomain', () => {
  it.each([
    {
      domain: 'example.com',
      permutations: ['example.com'],
    },
    {
      domain: 'foo.bar.example.com',
      permutations: ['example.com', 'bar.example.com', 'foo.bar.example.com'],
    },
    {
      domain: 'foo.bar.example.localduhmain',
      permutations: [
        'example.localduhmain',
        'bar.example.localduhmain',
        'foo.bar.example.localduhmain',
      ],
    },
    {
      domain: 'foo.bar.example.com.',
      permutations: ['example.com', 'bar.example.com', 'foo.bar.example.com'],
    },
  ])('permuteDomain("%s", %s") => %o', ({ domain, permutations }) => {
    expect(permuteDomain(domain)).toEqual(permutations)
  })

  // A lookup must not throw: a request host that is itself a special-use
  // domain has no public suffix and no permutations, whatever the option.
  it.each(['local', 'example', 'test'])(
    'permuteDomain("%s", allowSpecialUseDomain) => undefined',
    (domain) => {
      expect(permuteDomain(domain, true)).toBeUndefined()
      expect(permuteDomain(domain, false)).toBeUndefined()
      expect(permuteDomain(domain)).toBeUndefined()
    },
  )

  it('permuteDomain("dev.local", false) => ["dev.local"]', () => {
    // with special-use domains disallowed the host is looked up as itself
    expect(permuteDomain('dev.local', false)).toEqual(['dev.local'])
  })
})
