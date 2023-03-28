/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
  testPathIgnorePatterns: ["dist"],
  maxWorkers: 1,
  globals: {
    '*.ts': ['ts-jest', { isolatedModules: false }],
  },
}

export default config
