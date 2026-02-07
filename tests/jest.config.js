/**
 * Jest 测试配置
 * 支持单元测试和基于属性的测试
 */

module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 根目录
  rootDir: '../',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/tests/**/*.test.(js|ts)',
    '<rootDir>/tests/**/*.spec.(js|ts)',
    '<rootDir>/mobile-app/src/**/__tests__/**/*.(js|ts|tsx)',
    '<rootDir>/mobile-app/src/**/*.(test|spec).(js|ts|tsx)'
  ],
  
  // 忽略的测试文件（mobile-app 需在 mobile 目录内用其自身 Jest/TS 配置运行）
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/mobile-app/',
    '<rootDir>/firmware/'
  ],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/mobile-app/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  },
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],
  
  // 覆盖率收集
  collectCoverageFrom: [
    '<rootDir>/mobile-app/src/**/*.{ts,tsx}',
    '<rootDir>/shared/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!<rootDir>/tests/**'
  ],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // 转换配置
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // 模块文件扩展名
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],
  
  // 测试超时
  testTimeout: 10000,
  
  // 详细输出
  verbose: true,
  
  // 并行测试
  maxWorkers: '50%'
};