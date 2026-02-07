/**
 * 传感器管理器属性测试
 * 验证环境阈值检测的正确性属性
 */

import fc from 'fast-check';
import { SensorData, PlantState, SENSOR_THRESHOLDS } from '../../shared/types';

// 模拟传感器管理器类
class MockSensorManager {
  private moistureThreshold = SENSOR_THRESHOLDS.MOISTURE_LOW;
  private lightThreshold = SENSOR_THRESHOLDS.LIGHT_LOW;

  /**
   * 模拟状态评估逻辑（对应固件中的StateManager）
   */
  evaluateState(sensorData: SensorData): { state: PlantState; needsAttention: boolean } {
    let state = PlantState.HEALTHY;
    let needsAttention = false;

    // 检查土壤湿度
    if (sensorData.soilHumidity < this.moistureThreshold) {
      state = PlantState.NEEDS_WATER;
      needsAttention = true;
    }

    // 检查光照强度
    if (sensorData.lightIntensity < this.lightThreshold) {
      state = PlantState.NEEDS_LIGHT;
      needsAttention = true;
    }

    // 如果同时缺水和缺光，标记为危急状态
    if (sensorData.soilHumidity < this.moistureThreshold && 
        sensorData.lightIntensity < this.lightThreshold) {
      state = PlantState.CRITICAL;
      needsAttention = true;
    }

    return { state, needsAttention };
  }

  /**
   * 模拟传感器数据验证
   */
  validateSensorData(data: SensorData): boolean {
    return (
      data.soilHumidity >= 0 && data.soilHumidity <= 100 &&
      data.airHumidity >= 0 && data.airHumidity <= 100 &&
      data.temperature >= -40 && data.temperature <= 80 &&
      data.lightIntensity >= 0 && data.lightIntensity <= 50000 &&
      data.timestamp > 0
    );
  }

  /**
   * 模拟校准数据应用
   */
  applyCalibration(rawValue: number, min: number, max: number): number {
    // 简单的线性映射
    return Math.max(0, Math.min(100, ((rawValue - min) / (max - min)) * 100));
  }
}

describe('传感器管理器属性测试', () => {
  let mockSensorManager: MockSensorManager;

  beforeEach(() => {
    mockSensorManager = new MockSensorManager();
  });

  describe('属性 1: 环境阈值检测', () => {
    /**
     * Feature: ai-plant-care-robot, Property 1: 环境阈值检测
     * 对于任何传感器读数，当土壤湿度低于30%时，系统应检测到缺水状态；
     * 当光照强度低于500lux时，系统应检测到光照不足状态
     * 验证需求: 需求 1.1, 1.2
     */
    test('Property: 环境阈值检测 - 缺水状态检测', () => {
      fc.assert(
        fc.property(
          fc.record({
            soilHumidity: fc.float({ min: 0, max: Math.fround(29.9), noNaN: true }), // 低于30%阈值
            airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
            temperature: fc.float({ min: -40, max: 80, noNaN: true }),
            lightIntensity: fc.float({ min: 500, max: 10000, noNaN: true }), // 光照充足
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            const result = mockSensorManager.evaluateState(sensorData);
            
            // 当土壤湿度低于30%时，应检测到缺水状态
            expect(result.state).toBe(PlantState.NEEDS_WATER);
            expect(result.needsAttention).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: 环境阈值检测 - 光照不足状态检测', () => {
      fc.assert(
        fc.property(
          fc.record({
            soilHumidity: fc.float({ min: 30, max: 100, noNaN: true }), // 水分充足
            airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
            temperature: fc.float({ min: -40, max: 80, noNaN: true }),
            lightIntensity: fc.float({ min: 0, max: Math.fround(499.9), noNaN: true }), // 低于500lux阈值
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            const result = mockSensorManager.evaluateState(sensorData);
            
            // 当光照强度低于500lux时，应检测到光照不足状态
            expect(result.state).toBe(PlantState.NEEDS_LIGHT);
            expect(result.needsAttention).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: 环境阈值检测 - 健康状态检测', () => {
      fc.assert(
        fc.property(
          fc.record({
            soilHumidity: fc.float({ min: 30, max: 100, noNaN: true }), // 水分充足
            airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
            temperature: fc.float({ min: -40, max: 80, noNaN: true }),
            lightIntensity: fc.float({ min: 500, max: 10000, noNaN: true }), // 光照充足
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            const result = mockSensorManager.evaluateState(sensorData);
            
            // 当水分和光照都充足时，应为健康状态
            expect(result.state).toBe(PlantState.HEALTHY);
            expect(result.needsAttention).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: 环境阈值检测 - 危急状态检测', () => {
      fc.assert(
        fc.property(
          fc.record({
            soilHumidity: fc.float({ min: 0, max: Math.fround(29.9), noNaN: true }), // 缺水
            airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
            temperature: fc.float({ min: -40, max: 80, noNaN: true }),
            lightIntensity: fc.float({ min: 0, max: Math.fround(499.9), noNaN: true }), // 缺光
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            const result = mockSensorManager.evaluateState(sensorData);
            
            // 当同时缺水和缺光时，应为危急状态
            expect(result.state).toBe(PlantState.CRITICAL);
            expect(result.needsAttention).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('传感器数据验证属性', () => {
    /**
     * Feature: ai-plant-care-robot, Property: 传感器数据有效性验证
     * 对于任何传感器数据，所有数值都应在合理范围内
     */
    test('Property: 有效传感器数据应通过验证', () => {
      fc.assert(
        fc.property(
          fc.record({
            soilHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
            airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
            temperature: fc.float({ min: -40, max: 80, noNaN: true }),
            lightIntensity: fc.float({ min: 0, max: 50000, noNaN: true }),
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            const isValid = mockSensorManager.validateSensorData(sensorData);
            
            // 在有效范围内的数据应该通过验证
            expect(isValid).toBe(true);
            expect(sensorData).toBeValidSensorData();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: 无效传感器数据应被拒绝', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // 土壤湿度超出范围
            fc.record({
              soilHumidity: fc.oneof(fc.float({ min: -1000, max: Math.fround(-0.1), noNaN: true }), fc.float({ min: Math.fround(100.1), max: 1000, noNaN: true })),
              airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
              temperature: fc.float({ min: -40, max: 80, noNaN: true }),
              lightIntensity: fc.float({ min: 0, max: 50000, noNaN: true }),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            }),
            // 空气湿度超出范围
            fc.record({
              soilHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
              airHumidity: fc.oneof(fc.float({ min: -1000, max: Math.fround(-0.1), noNaN: true }), fc.float({ min: Math.fround(100.1), max: 1000, noNaN: true })),
              temperature: fc.float({ min: -40, max: 80, noNaN: true }),
              lightIntensity: fc.float({ min: 0, max: 50000, noNaN: true }),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            }),
            // 温度超出范围
            fc.record({
              soilHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
              airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
              temperature: fc.oneof(fc.float({ min: -1000, max: Math.fround(-40.1), noNaN: true }), fc.float({ min: Math.fround(80.1), max: 1000, noNaN: true })),
              lightIntensity: fc.float({ min: 0, max: 50000, noNaN: true }),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            }),
            // 光照强度为负值
            fc.record({
              soilHumidity: fc.float({ min: 0, max: 100 }),
              airHumidity: fc.float({ min: 0, max: 100 }),
              temperature: fc.float({ min: -40, max: 80 }),
              lightIntensity: fc.float({ min: Math.fround(-1000), max: Math.fround(-0.1) }),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            })
          ),
          (invalidSensorData: SensorData) => {
            const isValid = mockSensorManager.validateSensorData(invalidSensorData);
            
            // 超出有效范围的数据应该被拒绝
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('校准功能属性', () => {
    /**
     * Feature: ai-plant-care-robot, Property: 校准数据映射
     * 对于任何校准参数，映射结果应在0-100范围内
     */
    test('Property: 校准映射结果应在有效范围内', () => {
      fc.assert(
        fc.property(
          fc.record({
            rawValue: fc.integer({ min: 0, max: 4095 }), // ADC范围
            minValue: fc.integer({ min: 0, max: 2000 }),
            maxValue: fc.integer({ min: 2001, max: 4095 }),
          }),
          ({ rawValue, minValue, maxValue }) => {
            const calibratedValue = mockSensorManager.applyCalibration(rawValue, minValue, maxValue);
            
            // 校准后的值应在0-100范围内
            expect(calibratedValue).toBeWithinRange(0, 100);
            expect(typeof calibratedValue).toBe('number');
            expect(isFinite(calibratedValue)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('边界条件测试', () => {
    test('阈值边界值测试', () => {
      // 测试恰好等于阈值的情况
      const boundaryData: SensorData = {
        soilHumidity: 30.0, // 恰好等于阈值
        airHumidity: 50,
        temperature: 25,
        lightIntensity: 500.0, // 恰好等于阈值
        timestamp: Date.now(),
      };

      const result = mockSensorManager.evaluateState(boundaryData);
      
      // 等于阈值应该被认为是健康的
      expect(result.state).toBe(PlantState.HEALTHY);
      expect(result.needsAttention).toBe(false);
    });

    test('极端传感器数值测试', () => {
      const extremeData: SensorData = {
        soilHumidity: 0, // 最小值
        airHumidity: 100, // 最大值
        temperature: -40, // 最小值
        lightIntensity: 0, // 最小值
        timestamp: 1000000000000, // 最小时间戳
      };

      expect(mockSensorManager.validateSensorData(extremeData)).toBe(true);
      
      const result = mockSensorManager.evaluateState(extremeData);
      expect(result.state).toBe(PlantState.CRITICAL); // 缺水且缺光
      expect(result.needsAttention).toBe(true);
    });

    test('最大传感器数值测试', () => {
      const maxData: SensorData = {
        soilHumidity: 100, // 最大值
        airHumidity: 100, // 最大值
        temperature: 80, // 最大值
        lightIntensity: 50000, // 最大值
        timestamp: 9999999999999, // 最大时间戳
      };

      expect(mockSensorManager.validateSensorData(maxData)).toBe(true);
      
      const result = mockSensorManager.evaluateState(maxData);
      expect(result.state).toBe(PlantState.HEALTHY);
      expect(result.needsAttention).toBe(false);
    });
  });

  describe('单元测试 - 具体示例', () => {
    test('典型缺水场景', () => {
      const dryPlantData: SensorData = {
        soilHumidity: 15, // 明显低于30%阈值
        airHumidity: 45,
        temperature: 24,
        lightIntensity: 800, // 光照充足
        timestamp: Date.now(),
      };

      const result = mockSensorManager.evaluateState(dryPlantData);
      
      expect(result.state).toBe(PlantState.NEEDS_WATER);
      expect(result.needsAttention).toBe(true);
    });

    test('典型光照不足场景', () => {
      const darkPlantData: SensorData = {
        soilHumidity: 60, // 水分充足
        airHumidity: 55,
        temperature: 22,
        lightIntensity: 200, // 明显低于500lux阈值
        timestamp: Date.now(),
      };

      const result = mockSensorManager.evaluateState(darkPlantData);
      
      expect(result.state).toBe(PlantState.NEEDS_LIGHT);
      expect(result.needsAttention).toBe(true);
    });

    test('理想植物环境', () => {
      const healthyPlantData: SensorData = {
        soilHumidity: 65, // 水分充足
        airHumidity: 60,
        temperature: 25,
        lightIntensity: 1200, // 光照充足
        timestamp: Date.now(),
      };

      const result = mockSensorManager.evaluateState(healthyPlantData);
      
      expect(result.state).toBe(PlantState.HEALTHY);
      expect(result.needsAttention).toBe(false);
    });

    test('植物危急状态', () => {
      const criticalPlantData: SensorData = {
        soilHumidity: 5, // 严重缺水
        airHumidity: 30,
        temperature: 35,
        lightIntensity: 100, // 严重缺光
        timestamp: Date.now(),
      };

      const result = mockSensorManager.evaluateState(criticalPlantData);
      
      expect(result.state).toBe(PlantState.CRITICAL);
      expect(result.needsAttention).toBe(true);
    });
  });
});