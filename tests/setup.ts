/**
 * Jest 测试环境设置
 * 配置全局测试环境和工具
 */

import 'jest';
import fc from 'fast-check';

// 扩展 Jest 匹配器和全局函数
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSensorData(): R;
      toBeValidPlantState(): R;
      toBeValidLEDColor(): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }
  
  // 全局测试工具函数类型定义
  function createMockSensorData(overrides?: Partial<import('../shared/types').SensorData>): import('../shared/types').SensorData;
  function createMockPlantStatus(overrides?: any): any;
  function createMockDeviceConfig(overrides?: any): any;
}

// 自定义匹配器
expect.extend({
  /**
   * 验证传感器数据是否有效
   */
  toBeValidSensorData(received: any) {
    const pass = (
      typeof received === 'object' &&
      typeof received.soilHumidity === 'number' &&
      typeof received.airHumidity === 'number' &&
      typeof received.temperature === 'number' &&
      typeof received.lightIntensity === 'number' &&
      typeof received.timestamp === 'number' &&
      !isNaN(received.soilHumidity) &&
      !isNaN(received.airHumidity) &&
      !isNaN(received.temperature) &&
      !isNaN(received.lightIntensity) &&
      !isNaN(received.timestamp) &&
      received.soilHumidity >= 0 && received.soilHumidity <= 100 &&
      received.airHumidity >= 0 && received.airHumidity <= 100 &&
      received.temperature >= -40 && received.temperature <= 80 &&
      received.lightIntensity >= 0 &&
      received.timestamp > 0
    );

    return {
      message: () =>
        pass
          ? `expected ${JSON.stringify(received)} not to be valid sensor data`
          : `expected ${JSON.stringify(received)} to be valid sensor data`,
      pass,
    };
  },

  /**
   * 验证植物状态是否有效
   */
  toBeValidPlantState(received: any) {
    const validStates = ['healthy', 'needs_water', 'needs_light', 'critical'];
    const pass = validStates.includes(received);

    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid plant state`
          : `expected ${received} to be a valid plant state (one of: ${validStates.join(', ')})`,
      pass,
    };
  },

  /**
   * 验证LED颜色是否有效
   */
  toBeValidLEDColor(received: any) {
    const pass = (
      typeof received === 'object' &&
      typeof received.r === 'number' &&
      typeof received.g === 'number' &&
      typeof received.b === 'number' &&
      received.r >= 0 && received.r <= 255 &&
      received.g >= 0 && received.g <= 255 &&
      received.b >= 0 && received.b <= 255
    );

    return {
      message: () =>
        pass
          ? `expected ${JSON.stringify(received)} not to be a valid LED color`
          : `expected ${JSON.stringify(received)} to be a valid LED color (RGB values 0-255)`,
      pass,
    };
  },

  /**
   * 验证数值是否在指定范围内
   */
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;

    return {
      message: () =>
        pass
          ? `expected ${received} not to be within range ${min}-${max}`
          : `expected ${received} to be within range ${min}-${max}`,
      pass,
    };
  },
});

// 配置 fast-check 属性测试
fc.configureGlobal({
  numRuns: 100,           // 每个属性测试运行100次
  verbose: false,         // 简洁输出
  seed: Date.now(),       // 使用当前时间作为随机种子
  endOnFailure: true,     // 遇到失败时停止
});

// 全局测试工具函数
global.createMockSensorData = (overrides = {}) => ({
  soilHumidity: 50,
  airHumidity: 60,
  temperature: 25,
  lightIntensity: 800,
  timestamp: Date.now(),
  ...overrides,
});

global.createMockPlantStatus = (overrides = {}) => ({
  state: 'healthy',
  soilMoisture: 50,
  lightLevel: 800,
  temperature: 25,
  needsAttention: false,
  ...overrides,
});

global.createMockDeviceConfig = (overrides = {}) => ({
  deviceId: 'test-device-001',
  plantType: 'pothos',
  moistureThreshold: 30,
  lightThreshold: 500,
  alertInterval: 30,
  soundEnabled: true,
  ledBrightness: 128,
  ...overrides,
});

// 模拟定时器
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

// 控制台输出过滤
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // 过滤掉一些已知的无害警告
  const message = args[0];
  if (
    typeof message === 'string' &&
    (message.includes('Warning: ReactDOM.render is deprecated') ||
     message.includes('Warning: componentWillMount has been renamed'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.log('🧪 测试环境设置完成');
console.log('📊 属性测试配置: 每个测试运行100次迭代');
console.log('🎯 覆盖率目标: 80%');