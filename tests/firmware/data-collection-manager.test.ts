/**
 * 数据采集管理器测试
 * 验证数据采集、缓存和异常处理功能
 */

import fc from 'fast-check';
import { SensorData, TIMING_CONSTANTS } from '../../shared/types';

// 模拟数据采集管理器
class MockDataCollectionManager {
  private buffer: SensorData[] = [];
  private maxBufferSize = 100;
  private collectionInterval = TIMING_CONSTANTS.DATA_COLLECTION_INTERVAL;
  private lastCollectionTime = 0;
  private isAutoCollection = false;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 5;
  private stats = {
    totalCollections: 0,
    successfulCollections: 0,
    failedCollections: 0,
    successRate: 0,
  };

  /**
   * 开始自动数据采集
   */
  startAutoCollection(interval: number = this.collectionInterval): boolean {
    this.collectionInterval = interval;
    this.isAutoCollection = true;
    return true;
  }

  /**
   * 停止自动数据采集
   */
  stopAutoCollection(): void {
    this.isAutoCollection = false;
  }

  /**
   * 执行单次数据采集
   */
  collectOnce(mockData?: SensorData): SensorData {
    const currentTime = Date.now();
    
    // 使用模拟数据或生成随机数据
    const data: SensorData = mockData || {
      soilHumidity: Math.random() * 100,
      airHumidity: Math.random() * 100,
      temperature: Math.random() * 40 + 10,
      lightIntensity: Math.random() * 10000,
      timestamp: currentTime,
    };

    // 模拟数据验证
    const isValid = this.validateSensorData(data);
    
    this.updateStats(isValid);
    
    if (isValid) {
      this.addToBuffer(data);
      this.consecutiveErrors = 0;
    } else {
      this.consecutiveErrors++;
    }
    
    this.lastCollectionTime = currentTime;
    return data;
  }

  /**
   * 添加数据到缓冲区
   */
  private addToBuffer(data: SensorData): void {
    this.buffer.push(data);
    
    // 如果超过最大缓冲区大小，移除最旧的数据
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * 验证传感器数据
   */
  private validateSensorData(data: SensorData): boolean {
    return (
      data.soilHumidity >= 0 && data.soilHumidity <= 100 &&
      data.airHumidity >= 0 && data.airHumidity <= 100 &&
      data.temperature >= -40 && data.temperature <= 80 &&
      data.lightIntensity >= 0 && data.lightIntensity <= 50000 &&
      data.timestamp > 0
    );
  }

  /**
   * 更新统计信息
   */
  private updateStats(success: boolean): void {
    this.stats.totalCollections++;
    
    if (success) {
      this.stats.successfulCollections++;
    } else {
      this.stats.failedCollections++;
    }
    
    this.stats.successRate = 
      (this.stats.successfulCollections / this.stats.totalCollections) * 100;
  }

  /**
   * 获取最新数据
   */
  getLatestData(): SensorData | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  /**
   * 获取历史数据
   */
  getHistoryData(count: number): SensorData[] {
    const startIndex = Math.max(0, this.buffer.length - count);
    return this.buffer.slice(startIndex);
  }

  /**
   * 获取缓冲区数据数量
   */
  getBufferCount(): number {
    return this.buffer.length;
  }

  /**
   * 检查缓冲区是否为空
   */
  isBufferEmpty(): boolean {
    return this.buffer.length === 0;
  }

  /**
   * 检查缓冲区是否已满
   */
  isBufferFull(): boolean {
    return this.buffer.length >= this.maxBufferSize;
  }

  /**
   * 清空缓冲区
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalCollections: 0,
      successfulCollections: 0,
      failedCollections: 0,
      successRate: 0,
    };
  }

  /**
   * 检查是否有错误
   */
  hasError(): boolean {
    return this.consecutiveErrors >= this.maxConsecutiveErrors;
  }

  /**
   * 清除错误状态
   */
  clearError(): void {
    this.consecutiveErrors = 0;
  }

  /**
   * 设置采集间隔
   */
  setCollectionInterval(interval: number): void {
    this.collectionInterval = Math.max(1000, interval); // 最小1秒
  }

  /**
   * 获取采集间隔
   */
  getCollectionInterval(): number {
    return this.collectionInterval;
  }

  /**
   * 检查是否到了采集时间
   */
  isTimeForCollection(): boolean {
    const currentTime = Date.now();
    return currentTime - this.lastCollectionTime >= this.collectionInterval;
  }

  /**
   * 检查自动采集是否启用
   */
  isAutoCollectionEnabled(): boolean {
    return this.isAutoCollection;
  }
}

describe('数据采集管理器测试', () => {
  let dataCollectionManager: MockDataCollectionManager;

  beforeEach(() => {
    dataCollectionManager = new MockDataCollectionManager();
  });

  describe('基本功能测试', () => {
    test('应该能够启动和停止自动采集', () => {
      expect(dataCollectionManager.isAutoCollectionEnabled()).toBe(false);
      
      const result = dataCollectionManager.startAutoCollection();
      expect(result).toBe(true);
      expect(dataCollectionManager.isAutoCollectionEnabled()).toBe(true);
      
      dataCollectionManager.stopAutoCollection();
      expect(dataCollectionManager.isAutoCollectionEnabled()).toBe(false);
    });

    test('应该能够执行单次数据采集', () => {
      const testData = createMockSensorData({
        soilHumidity: 45,
        temperature: 25,
        lightIntensity: 800,
      });

      const result = dataCollectionManager.collectOnce(testData);
      
      expect(result).toBeValidSensorData();
      expect(result.soilHumidity).toBe(45);
      expect(result.temperature).toBe(25);
      expect(result.lightIntensity).toBe(800);
    });

    test('应该能够设置和获取采集间隔', () => {
      const newInterval = 10000; // 10秒
      dataCollectionManager.setCollectionInterval(newInterval);
      
      expect(dataCollectionManager.getCollectionInterval()).toBe(newInterval);
    });

    test('采集间隔不应小于1秒', () => {
      dataCollectionManager.setCollectionInterval(500); // 0.5秒
      
      expect(dataCollectionManager.getCollectionInterval()).toBe(1000); // 应该被限制为1秒
    });
  });

  describe('数据缓冲区测试', () => {
    test('新创建的缓冲区应该为空', () => {
      expect(dataCollectionManager.isBufferEmpty()).toBe(true);
      expect(dataCollectionManager.getBufferCount()).toBe(0);
      expect(dataCollectionManager.getLatestData()).toBeNull();
    });

    test('添加数据后缓冲区不应为空', () => {
      const testData = createMockSensorData();
      dataCollectionManager.collectOnce(testData);
      
      expect(dataCollectionManager.isBufferEmpty()).toBe(false);
      expect(dataCollectionManager.getBufferCount()).toBe(1);
      expect(dataCollectionManager.getLatestData()).toEqual(testData);
    });

    test('应该能够获取历史数据', () => {
      const testData1 = createMockSensorData({ soilHumidity: 30 });
      const testData2 = createMockSensorData({ soilHumidity: 40 });
      const testData3 = createMockSensorData({ soilHumidity: 50 });

      dataCollectionManager.collectOnce(testData1);
      dataCollectionManager.collectOnce(testData2);
      dataCollectionManager.collectOnce(testData3);

      const history = dataCollectionManager.getHistoryData(2);
      expect(history).toHaveLength(2);
      expect(history[0].soilHumidity).toBe(40); // 倒数第二个
      expect(history[1].soilHumidity).toBe(50); // 最新的
    });

    test('应该能够清空缓冲区', () => {
      const testData = createMockSensorData();
      dataCollectionManager.collectOnce(testData);
      
      expect(dataCollectionManager.getBufferCount()).toBe(1);
      
      dataCollectionManager.clearBuffer();
      
      expect(dataCollectionManager.isBufferEmpty()).toBe(true);
      expect(dataCollectionManager.getBufferCount()).toBe(0);
    });
  });

  describe('统计信息测试', () => {
    test('初始统计信息应该为零', () => {
      const stats = dataCollectionManager.getStats();
      
      expect(stats.totalCollections).toBe(0);
      expect(stats.successfulCollections).toBe(0);
      expect(stats.failedCollections).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    test('成功采集应该更新统计信息', () => {
      const validData = createMockSensorData();
      dataCollectionManager.collectOnce(validData);
      
      const stats = dataCollectionManager.getStats();
      
      expect(stats.totalCollections).toBe(1);
      expect(stats.successfulCollections).toBe(1);
      expect(stats.failedCollections).toBe(0);
      expect(stats.successRate).toBe(100);
    });

    test('失败采集应该更新统计信息', () => {
      const invalidData = createMockSensorData({
        soilHumidity: -10, // 无效值
      });
      
      dataCollectionManager.collectOnce(invalidData);
      
      const stats = dataCollectionManager.getStats();
      
      expect(stats.totalCollections).toBe(1);
      expect(stats.successfulCollections).toBe(0);
      expect(stats.failedCollections).toBe(1);
      expect(stats.successRate).toBe(0);
    });

    test('应该能够重置统计信息', () => {
      const validData = createMockSensorData();
      dataCollectionManager.collectOnce(validData);
      
      let stats = dataCollectionManager.getStats();
      expect(stats.totalCollections).toBe(1);
      
      dataCollectionManager.resetStats();
      
      stats = dataCollectionManager.getStats();
      expect(stats.totalCollections).toBe(0);
      expect(stats.successfulCollections).toBe(0);
      expect(stats.failedCollections).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('错误处理测试', () => {
    test('连续错误应该触发错误状态', () => {
      const invalidData = createMockSensorData({
        soilHumidity: -10, // 无效值
      });

      // 模拟5次连续错误
      for (let i = 0; i < 5; i++) {
        dataCollectionManager.collectOnce(invalidData);
      }

      expect(dataCollectionManager.hasError()).toBe(true);
    });

    test('成功采集应该清除错误状态', () => {
      const invalidData = createMockSensorData({ soilHumidity: -10 });
      const validData = createMockSensorData({ soilHumidity: 50 });

      // 先产生一些错误
      for (let i = 0; i < 3; i++) {
        dataCollectionManager.collectOnce(invalidData);
      }

      // 然后成功采集
      dataCollectionManager.collectOnce(validData);

      expect(dataCollectionManager.hasError()).toBe(false);
    });

    test('应该能够手动清除错误状态', () => {
      const invalidData = createMockSensorData({ soilHumidity: -10 });

      // 产生足够的错误
      for (let i = 0; i < 5; i++) {
        dataCollectionManager.collectOnce(invalidData);
      }

      expect(dataCollectionManager.hasError()).toBe(true);

      dataCollectionManager.clearError();

      expect(dataCollectionManager.hasError()).toBe(false);
    });
  });

  describe('属性测试', () => {
    /**
     * Feature: ai-plant-care-robot, Property: 数据采集间隔一致性
     * 对于任何有效的采集间隔，系统应该正确设置和返回该间隔
     */
    test('Property: 数据采集间隔一致性', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 3600000 }), // 1秒到1小时
          (interval: number) => {
            dataCollectionManager.setCollectionInterval(interval);
            const actualInterval = dataCollectionManager.getCollectionInterval();
            
            expect(actualInterval).toBe(interval);
            expect(actualInterval).toBeGreaterThanOrEqual(1000);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: ai-plant-care-robot, Property: 缓冲区容量限制
     * 对于任何数量的数据添加操作，缓冲区大小不应超过最大限制
     */
    test('Property: 缓冲区容量限制', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 200 }), // 添加1-200个数据点
          (dataCount: number) => {
            // 清空缓冲区
            dataCollectionManager.clearBuffer();
            
            // 添加指定数量的数据
            for (let i = 0; i < dataCount; i++) {
              const testData = createMockSensorData({
                soilHumidity: Math.random() * 100,
                timestamp: Date.now() + i,
              });
              dataCollectionManager.collectOnce(testData);
            }
            
            const bufferCount = dataCollectionManager.getBufferCount();
            
            // 缓冲区大小不应超过100（最大缓冲区大小）
            expect(bufferCount).toBeLessThanOrEqual(100);
            expect(bufferCount).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Feature: ai-plant-care-robot, Property: 统计信息准确性
     * 对于任何采集操作序列，统计信息应该准确反映成功和失败的次数
     */
    test('Property: 统计信息准确性', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }), // 成功/失败序列
          (successSequence: boolean[]) => {
            dataCollectionManager.resetStats();
            
            let expectedSuccessful = 0;
            let expectedFailed = 0;
            
            // 执行采集序列
            successSequence.forEach((shouldSucceed) => {
              const testData = shouldSucceed
                ? createMockSensorData({ soilHumidity: 50 })
                : createMockSensorData({ soilHumidity: -10 }); // 无效数据
              
              dataCollectionManager.collectOnce(testData);
              
              if (shouldSucceed) {
                expectedSuccessful++;
              } else {
                expectedFailed++;
              }
            });
            
            const stats = dataCollectionManager.getStats();
            const expectedTotal = expectedSuccessful + expectedFailed;
            const expectedSuccessRate = expectedTotal > 0 
              ? (expectedSuccessful / expectedTotal) * 100 
              : 0;
            
            expect(stats.totalCollections).toBe(expectedTotal);
            expect(stats.successfulCollections).toBe(expectedSuccessful);
            expect(stats.failedCollections).toBe(expectedFailed);
            expect(stats.successRate).toBeCloseTo(expectedSuccessRate, 1);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('边界条件测试', () => {
    test('空缓冲区获取最新数据应返回null', () => {
      expect(dataCollectionManager.getLatestData()).toBeNull();
    });

    test('空缓冲区获取历史数据应返回空数组', () => {
      const history = dataCollectionManager.getHistoryData(10);
      expect(history).toEqual([]);
    });

    test('请求超过缓冲区大小的历史数据应返回所有可用数据', () => {
      const testData = createMockSensorData();
      dataCollectionManager.collectOnce(testData);
      
      const history = dataCollectionManager.getHistoryData(100);
      expect(history).toHaveLength(1);
    });

    test('设置过小的采集间隔应被限制为最小值', () => {
      dataCollectionManager.setCollectionInterval(100); // 0.1秒
      expect(dataCollectionManager.getCollectionInterval()).toBe(1000); // 应该是1秒
    });
  });
});