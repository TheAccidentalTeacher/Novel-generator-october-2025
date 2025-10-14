import path from 'node:path';
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  rootDir: __dirname,
  testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup-after-env.ts'],
  globalSetup: '<rootDir>/tests/integration/global-setup.ts',
  globalTeardown: '<rootDir>/tests/integration/global-teardown.ts',
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: path.join(__dirname, 'tsconfig.migrations.json')
      }
    ]
  },
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1',
    '^@letswriteabook/(.*)$': path.join(__dirname, '..', '$1', 'src')
  },
  extensionsToTreatAsEsm: ['.ts']
};

export default config;
