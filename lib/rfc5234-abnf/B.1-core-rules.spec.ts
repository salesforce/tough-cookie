import {
  ALPHA,
  BIT,
  CHAR,
  CR,
  CRLF,
  CTL,
  DIGIT,
  DQUOTE,
  HEXDIG,
  HTAB,
  LF,
  LWSP,
  OCTET,
  SP,
  VCHAR,
  WSP,
} from './B.1-core-rules'
import { expectRuleSpec } from './expect-rule.spec'

type TestCase = {
  code: string
  displayName: string
}

function codeToTestCase(value: number) {
  return {
    code: String.fromCharCode(value),
    displayName: `0x${value.toString(16)}`,
  }
}
function fromCodeRange(start: number, end: number): TestCase[] {
  const values: TestCase[] = []
  for (let i = start; i < end; i++) {
    values.push(codeToTestCase(i))
  }
  return values
}

function fromCodes(...values: number[]): TestCase[] {
  return values.map(codeToTestCase)
}

describe('ALPHA', () => {
  it.each([
    ...'abcdefghijklmnopqrstuvwxyz'.split(''),
    ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  ])('should match %s', (char) => {
    expectRuleSpec(ALPHA, char).ok({
      remaining: '',
      result: char,
    })
  })

  it.each(fromCodes(0x40, 0x5b, 0x60, 0x7b))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(ALPHA, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})

describe('BIT', () => {
  it.each(['0', '1'])('should match %s', (char) => {
    expectRuleSpec(BIT, char).ok({
      remaining: '',
      result: char,
    })
  })

  it.each(['2', 'a', '.'])('should not match %s', (char) => {
    expectRuleSpec(BIT, char).fail({
      remaining: char,
    })
  })
})

describe('CHAR', () => {
  it.each(fromCodeRange(0x01, 0x7f))(
    'should match $displayName',
    (testCase) => {
      expectRuleSpec(CHAR, testCase.code).ok({
        remaining: '',
        result: testCase.code,
      })
    },
  )

  it.each(fromCodes(0x00, 0x80))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(CHAR, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})

describe('CR', () => {
  it.each(['\r'])('should match %s', (char) => {
    expectRuleSpec(CR, char).ok({
      remaining: '',
      result: char,
    })
  })

  it.each(fromCodes(0x0c, 0x0e))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(CR, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})

describe('CRLF', () => {
  it.each(['\r\n'])('should match %s', (char) => {
    expectRuleSpec(CRLF, char).ok({
      remaining: '',
      result: char,
    })
  })

  it.each(['\r', '\n', '\n\r'])('should not match %s', (char) => {
    expectRuleSpec(CRLF, char).fail({
      remaining: char,
    })
  })
})

describe('CTL', () => {
  it.each([...fromCodeRange(0x00, 0x1f), ...fromCodes(0x7f)])(
    'should match $displayName',
    (testCase) => {
      expectRuleSpec(CTL, testCase.code).ok({
        remaining: '',
        result: testCase.code,
      })
    },
  )

  it.each(fromCodes(0x20, 0x7e, 0x80))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(CTL, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})

describe('DIGIT', () => {
  it.each(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])(
    'should match %s',
    (char) => {
      expectRuleSpec(DIGIT, char).ok({
        remaining: '',
        result: char,
      })
    },
  )

  it.each(fromCodes(0x29, 0x40))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(DIGIT, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})

describe('DQUOTE', () => {
  it.each(['"'])('should match %s', (char) => {
    expectRuleSpec(DQUOTE, char).ok({
      remaining: '',
      result: char,
    })
  })

  it.each(fromCodes(0x21, 0x23))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(DQUOTE, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})

describe('HEXDIG', () => {
  it.each([
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
  ])('should match %s', (char) => {
    expectRuleSpec(HEXDIG, char).ok({
      remaining: '',
      result: char,
    })
  })

  it.each(fromCodes(0x21, 0x23))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(HEXDIG, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})

describe('HTAB', () => {
  it.each(['\t'])('should match $displayName', (char) => {
    expectRuleSpec(HTAB, char).ok({
      remaining: '',
      result: char,
    })
  })

  it.each(fromCodes(0x08, 0x10))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(HTAB, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})

describe('LF', () => {
  it.each(['\n'])('should match %s', (char) => {
    expectRuleSpec(LF, char).ok({
      remaining: '',
      result: char,
    })
  })

  it.each(fromCodes(0x09, 0x0b))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(LF, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})

describe('LWSP', () => {
  xit('should be possible to combine various forms', () => {
    expectRuleSpec(LWSP, ' \r\n hi').ok({
      remaining: 'hi',
      result: ' \r\n ',
    })
  })
})

describe('OCTET', () => {
  it.each(fromCodeRange(0x00, 0xff))(
    'should match $displayName',
    (testCase) => {
      expectRuleSpec(OCTET, testCase.code).ok({
        remaining: '',
        result: testCase.code,
      })
    },
  )
})

describe('SP', () => {
  it.each([' '])('should match %s', (char) => {
    expectRuleSpec(SP, char).ok({
      remaining: '',
      result: char,
    })
  })

  it.each(fromCodes(0x19, 0x21))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(SP, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})

describe('VCHAR', () => {
  it.each(fromCodeRange(0x21, 0x7e))(
    'should match $displayName',
    (testCase) => {
      expectRuleSpec(VCHAR, testCase.code).ok({
        remaining: '',
        result: testCase.code,
      })
    },
  )

  it.each(fromCodes(0x20, 0x80))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(VCHAR, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})

describe('WSP', () => {
  it.each([' ', '\t'])('should match %s', (char) => {
    expectRuleSpec(WSP, char).ok({
      remaining: '',
      result: char,
    })
  })

  it.each(fromCodes(0x08, 0x10, 0x19, 0x21))(
    'should not match $displayName',
    (testCase) => {
      expectRuleSpec(WSP, testCase.code).fail({
        remaining: testCase.code,
      })
    },
  )
})
