/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node', // Use node for server-side tests
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock Convex generated files (ESM modules)
    '.*/convex/_generated/api': '<rootDir>/__mocks__/convex/_generated/api.js',
    '.*/convex/_generated/dataModel': '<rootDir>/__mocks__/convex/_generated/dataModel.js',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
};

module.exports = config;
