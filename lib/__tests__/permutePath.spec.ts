import {permutePath} from "../cookie";

describe('permutePath', () => {
  it.each([
    {
      path: '/',
      permutations: ["/"]
    },
    {
      path: '/foo',
      permutations: ["/foo", "/"]
    },
    {
      path: '/foo/bar',
      permutations: ["/foo/bar", "/foo", "/"]
    },
    {
      path: "/foo/bar/",
      permutations: ["/foo/bar/", "/foo/bar", "/foo", "/"]
    },
  ])('permuteDomain("%s", %s") => %o', ({path, permutations}) => {
    expect(permutePath(path)).toEqual(permutations)
  })
})
