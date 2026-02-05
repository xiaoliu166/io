module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '../../cloud-service/src/**/*.ts',
    '!../../cloud-service/src/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  testTimeout: 10000,
};