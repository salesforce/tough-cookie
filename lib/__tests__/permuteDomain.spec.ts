import {permuteDomain} from "../cookie";

describe('permuteDomain', () => {
  it.each([
    {
      domain: 'example.com',
      permutations: ["example.com"]
    },
    {
      domain: 'foo.bar.example.com',
      permutations: [
        "example.com",
        "bar.example.com",
        "foo.bar.example.com"
      ]
    },
    {
      domain: 'foo.bar.example.localduhmain',
      permutations: [
        "example.localduhmain",
        "bar.example.localduhmain",
        "foo.bar.example.localduhmain"
      ]
    },
    {
      domain: "foo.bar.example.com.",
      permutations: [
        "example.com",
        "bar.example.com",
        "foo.bar.example.com"
      ]
    },
  ])('permuteDomain("%s", %s") => %o', ({domain, permutations}) => {
    const allowSpecialUseDomain = undefined
    expect(permuteDomain(domain, allowSpecialUseDomain)).toEqual(permutations)
  })
})
