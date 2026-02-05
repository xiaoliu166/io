/**
 * 云端服务测试设置
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

// 全局测试配置
beforeAll(() => {
  // 设置测试超时
  jest.setTimeout(10000);
});

afterEach(() => {
  // 清理所有模拟
  jest.clearAllMocks();
});

// 抑制控制台输出（除非需要调试）
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}