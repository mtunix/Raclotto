module.exports = {
  roots: ['<rootDir>/src'],

  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],

  // Module paths (matching your tsconfig)
  moduleNameMapper: {
    // Handle path aliases from tsconfig (baseUrl ".")
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@test-utils$': '<rootDir>/src/testUtils',
    '^@test-utils/(.*)$': '<rootDir>/src/testUtils/$1',
  },

  // Transform files (same babel/css/file transforms the CRA tooling uses)
  transform: {
    '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$': '<rootDir>/config/jest/babelTransform.js',
    '^.+\\.css$': '<rootDir>/config/jest/cssTransform.js',
    '^(?!.*\\.(js|jsx|mjs|cjs|ts|tsx|css|json)$)': '<rootDir>/config/jest/fileTransform.js',
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.{js,jsx,ts,tsx}',
    '**/?(*.)+(spec|test).{js,jsx,ts,tsx}'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/index.tsx',
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/'
  ],

  // Transform ignore patterns (important for antd and other ESM packages)
  transformIgnorePatterns: [
    'node_modules/(?!(antd|@ant-design|rc-.*|@rc-component|@babel/runtime)/)'
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
