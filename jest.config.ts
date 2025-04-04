import type { JestConfigWithTsJest } from 'ts-jest'

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './lib/',
  testPathIgnorePatterns: ['./lib/__tests__/data/'],
  fakeTimers: {
    enableGlobally: true,
  },
  moduleNameMapper: {
    // Required for ESM support
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
}

export default config
