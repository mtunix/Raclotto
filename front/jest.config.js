module.exports = {
  // Use ts-jest for TypeScript files
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Module paths (matching your tsconfig)
  moduleNameMapper: {
    // Handle CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
    
    // Handle path aliases from tsconfig
    '^@test-utils$': '<rootDir>/src/testUtils',
    '^@test-utils/(.*)$': '<rootDir>/src/testUtils/$1',
    
    // Fix antd locale issues
    '^@rc-component/picker/locale/(.*)$': '<rootDir>/src/__mocks__/antdLocaleMock.js',
  },
  
  // Transform files
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)'
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