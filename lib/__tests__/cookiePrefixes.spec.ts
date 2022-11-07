import {Cookie, CookieJar} from "../cookie";

const {objectContaining} = expect

let cookieJar: CookieJar

describe('When `prefixSecurity` is enabled for `CookieJar`', () => {
  it('need to be redone', () => {})
  // describe(`If a cookie's name begins with a case-sensitive match for the string "__Secure-", then the cookie must be set with a "Secure" attribute`, () => {
  //   createSecurePrefixTests([
  //     {secure: false},
  //     {secure: true},
  //   ], {
  //     'when `prefixSecurity=silent`': 'expect setting cookie to fail silently',
  //     "when `prefixSecurity=strict`": 'expect setting cookie throws an error',
  //     "when `prefixSecurity=unsafe-disabled`": 'expect setting cookie works'
  //   })
  // })

  // describe(`If a cookie's name begins with a case-sensitive match for the string "__Host-", then the cookie will have been set with a "Secure" attribute, a "Path" attribute with a value of "/", and no "Domain" attribute`, () => {
  //   createHostPrefixTests([
  //     {secure: false, useDefaultPath: false, domain: false},
  //     {secure: false, useDefaultPath: false, domain: true},
  //     {secure: false, useDefaultPath: true, domain: false},
  //     {secure: false, useDefaultPath: true, domain: true},
  //     {secure: true, useDefaultPath: false, domain: false},
  //     {secure: true, useDefaultPath: false, domain: true},
  //     {secure: true, useDefaultPath: true, domain: false},
  //     {secure: true, useDefaultPath: true, domain: true},
  //   ], {
  //     "when `prefixSecurity=silent`": 'expect setting cookie to fail silently',
  //     //"when `prefixSecurity=strict`": 'expect setting cookie throws an error',
  //     // "when `prefixSecurity=unsafe-disabled`": 'expect setting cookie works'
  //   })
  // })
})

function createSecurePrefixTests(securePrefixTestCases: SecurePrefixTestCase[], expectations: PrefixTestCaseExpectations) {
  // @ts-ignore
  const prefixTestCases = ['http', 'https'].reduce((acc: PrefixTestCase[], protocol: Protocol) => {
    for (const securePrefixTestCase of securePrefixTestCases) {
      const prefixTestCase = {
        useDefaultPath: true,
        domain: false,
        cookieName: '__Secure-SID',
        cookieValue: '12345',
        ...securePrefixTestCase,
        protocol
      }

      let expectation: 'valid' | 'invalid' | 'prefixPrevented'
      if (protocol === "https" && securePrefixTestCase.secure) {
        expectation = 'valid'
      } else if (protocol === 'http' && securePrefixTestCase.secure) {
        expectation = 'invalid'
      } else {
        expectation = 'prefixPrevented'
      }

      acc.push({
        ...prefixTestCase,
        expectation
      })
    }
    return acc
  }, [])
  // @ts-ignore
  return createPrefixTests(prefixTestCases, expectations)
}

function createHostPrefixTests(securePrefixTestCases: HostPrefixTestCase[], expectations: PrefixTestCaseExpectations) {
  const prefixTestCases: PrefixTestCase[] = securePrefixTestCases.map((hostPrefixTestCase: HostPrefixTestCase) => {
    return {
      cookieName: '__Host-SID',
      cookieValue: '12345',
      ...hostPrefixTestCase
    }
  })
  return createPrefixTests(prefixTestCases, expectations)
}

function createPrefixTests(prefixTestCases: PrefixTestCase[], expectations: PrefixTestCaseExpectations) {
  const protocols: Protocol[] = ['http', 'https']
  for (const [scenario, prefixPreventionExpectation] of Object.entries(expectations) as Array<[PrefixTestScenario, PrefixTestExpectation]>) {
    describe(scenario, () => {
      const prefixSecurity = lookupPrefixSecurity(scenario)
      beforeEach(createCookieJar({ prefixSecurity }))

      protocols.forEach(protocol => {
        describe(`using ${protocol} protocol`, () => {
          const testCases = partitionCases(prefixTestCases, protocol)
          expectScenario(testCases, 'valid', 'expect setting cookie works', protocol)
          expectScenario(testCases, 'invalid', 'expect setting cookie to fail silently', protocol)
          expectScenario(testCases, 'prefixPrevented', prefixPreventionExpectation, protocol)
        })
      })
    })
  }
}

function expectScenario(partitionedTestCases: PartitionedPrefixTestCases, testCasesKey: keyof PartitionedPrefixTestCases, expectation: PrefixTestExpectation, protocol: Protocol) {
  const onTestCase = lookupExpectationHandler(expectation)
  const testCases = partitionedTestCases[testCasesKey]
  testCases.forEach(testCase => {
    it(`[${testCasesKey}] ${expectation}: ${toCookie(testCase)}`, () => {
      onTestCase(testCase, protocol)
    })
  })
}

function toCookie(testCase: PrefixTestCase) {
  return [
    `${testCase.cookieName}=${testCase.cookieValue}`,
    testCase.secure ? 'Secure' : undefined,
    testCase.useDefaultPath ? undefined : 'Path=/some/path',
    testCase.domain ? 'Domain=example.com' : undefined
  ].filter(v => v).join('; ')
}

function lookupPrefixSecurity(prefixTestScenario: PrefixTestScenario): PrefixSecurityValue {
  switch (prefixTestScenario) {
    case 'when `prefixSecurity=silent`':
      return 'silent'
    case 'when `prefixSecurity=strict`':
      return 'strict'
    case 'when `prefixSecurity=unsafe-disabled`':
      return 'unsafe-disabled'
  }
}

// @ts-ignore
function lookupExpectationHandler(expectation): (testCase: PrefixTestCase, protocol: Protocol) => Promise<void> {
  switch (expectation) {
    case "expect setting cookie to fail silently":
      return expectSettingCookieToFailSilently
    case "expect setting cookie throws an error":
      return expectSettingCookieThrowsAnError
    case "expect setting cookie works":
      return expectSettingCookieWorks
  }
}

async function expectSettingCookieToFailSilently(testCase: PrefixTestCase, protocol: Protocol) {
  const cookie = await createCookieFrom(testCase, protocol)
  expect(cookie).toBeUndefined()
}

async function expectSettingCookieThrowsAnError(testCase: PrefixTestCase, protocol: Protocol) {
  const errorMessage = testCase.cookieName.startsWith('__Secure')
    ? `Cookie has __Secure prefix but Secure attribute is not set`
    : `Cookie has __Host prefix but either Secure or HostOnly attribute is not set or Path is not '/'`
  await expect(createCookieFrom(testCase, protocol))
    .rejects
    .toThrowError(errorMessage)
}

async function expectSettingCookieWorks(testCase: PrefixTestCase, protocol: Protocol) {
  const cookie = await createCookieFrom(testCase, protocol)
  expect(cookie).toEqual(objectContaining({
    key: testCase.cookieName,
    value: testCase.cookieValue
  }))
}

function createCookieJar(options: { prefixSecurity: PrefixSecurityValue }): () => void {
  return () => {
    const { prefixSecurity } = options
    cookieJar = new CookieJar(null, { prefixSecurity })
    expect(cookieJar.prefixSecurity).toBe(prefixSecurity)
  }
}

async function createCookieFrom(testCase: PrefixTestCase, protocol: Protocol): Promise<Cookie | undefined> {
  const cookie = toCookie(testCase)
  const domainWithProtocol = `${protocol}://www.example.com/${testCase.useDefaultPath ? '' : 'some/path'}`
  try {
    await cookieJar.setCookie(cookie, domainWithProtocol)
  } catch (e) {
    throw e
  }
  const cookies = await cookieJar.getCookies(domainWithProtocol)
  return cookies[0]
}

function partitionCases(testCases: PrefixTestCase[], protocol: Protocol): PartitionedPrefixTestCases {
  const valid = testCases.filter(testCase => {
    if (testCase.cookieName.startsWith('__Host')) {
      return testCase.secure && protocol === 'https' && testCase.useDefaultPath
    }
    return testCase.secure && protocol === 'https'
  })
  const invalid = testCases.filter(testCase => {
    if (testCase.cookieName.startsWith('__Host')) {
      return testCase.secure && protocol !== 'https' && !testCase.domain
    }
    return testCase.secure && protocol !== 'https'
  })
  const prefixPrevented = testCases.filter(testCase => !valid.includes(testCase) && !invalid.includes(testCase))
  expect(valid.length + invalid.length + prefixPrevented.length).toBe(testCases.length)
  return { valid, invalid, prefixPrevented }
}

type PartitionedPrefixTestCases = {
  valid: PrefixTestCase[];
  invalid: PrefixTestCase[];
  prefixPrevented: PrefixTestCase[];
}

type Protocol = 'http' | 'https';

type PrefixTestCase = {
  secure: boolean;
  useDefaultPath: boolean;
  domain: boolean;
  cookieName: string;
  cookieValue: string;
  protocol: Protocol;
  expectation: 'prefixPrevented' | 'valid' | 'invalid'
}

type PrefixSecurityValue = 'strict' | 'silent' | 'unsafe-disabled'

type PrefixTestScenario = 'when `prefixSecurity=silent`' |
  'when `prefixSecurity=strict`' |
  'when `prefixSecurity=unsafe-disabled`';

type PrefixTestExpectation = 'expect setting cookie to fail silently' |
  'expect setting cookie throws an error' |
  'expect setting cookie works';

type PrefixTestCaseExpectations = {
  [key in PrefixTestScenario]?: PrefixTestExpectation;
};

type SecurePrefixTestCase = Pick<PrefixTestCase, 'secure'>

type HostPrefixTestCase = Omit<PrefixTestCase, 'cookieName' | 'cookieValue'>
