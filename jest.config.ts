import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/__tests__/integration/'],
  moduleNameMapper: {
    '^@letswriteabook/(.*)$': '<rootDir>/packages/$1/src',
  },
  collectCoverageFrom: ['packages/**/src/**/*.{ts,tsx}', '!**/__tests__/**'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
};

export default config;
