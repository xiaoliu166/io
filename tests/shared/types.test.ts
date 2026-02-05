/**
 * 共享类型定义测试
 * 验证核心数据结构和常量的正确性
 */

import fc from 'fast-check';
import {
  SensorData,
  PlantState,
  PlantStatus,
  LEDColor,
  SENSOR_THRESHOLDS,
  TIMING_CONSTANTS,
  LED_COLORS,
} from '../../shared/types';

describe('共享类型定义测试', () => {
  describe('传感器数据类型', () => {
    test('应该有正确的传感器数据结构', () => {
      const sensorData: SensorData = {
        soilHumidity: 45.5,
        airHumidity: 60.2,
        temperature: 23.8,
        lightIntensity: 750,
        timestamp: Date.now(),
      };

      expect(sensorData).toBeValidSensorData();
      expect(typeof sensorData.soilHumidity).toBe('number');
      expect(typeof sensorData.airHumidity).toBe('number');
      expect(typeof sensorData.temperature).toBe('number');
      expect(typeof sensorData.lightIntensity).toBe('number');
      expect(typeof sensorData.timestamp).toBe('number');
    });

    /**
     * Feature: ai-plant-care-robot, Property 1: 传感器数据有效性
     * 对于任何传感器数据，所有数值都应在合理范围内
     */
    test('Property: 传感器数据有效性', () => {
      fc.assert(
        fc.property(
          fc.record({
            soilHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
            airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
            temperature: fc.float({ min: -40, max: 80, noNaN: true }),
            lightIntensity: fc.float({ min: 0, max: 10000, noNaN: true }),
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            expect(sensorData).toBeValidSensorData();
            expect(sensorData.soilHumidity).toBeWithinRange(0, 100);
            expect(sensorData.airHumidity).toBeWithinRange(0, 100);
            expect(sensorData.temperature).toBeWithinRange(-40, 80);
            expect(sensorData.lightIntensity).toBeGreaterThanOrEqual(0);
            expect(sensorData.timestamp).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('植物状态类型', () => {
    test('应该有正确的植物状态枚举', () => {
      expect(PlantState.HEALTHY).toBe('healthy');
      expect(PlantState.NEEDS_WATER).toBe('needs_water');
      expect(PlantState.NEEDS_LIGHT).toBe('needs_light');
      expect(PlantState.CRITICAL).toBe('critical');
    });

    /**
     * Feature: ai-plant-care-robot, Property 2: 植物状态有效性
     * 对于任何植物状态，都应该是预定义的有效状态之一
     */
    test('Property: 植物状态有效性', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            PlantState.HEALTHY,
            PlantState.NEEDS_WATER,
            PlantState.NEEDS_LIGHT,
            PlantState.CRITICAL
          ),
          (state: PlantState) => {
            expect(state).toBeValidPlantState();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('应该有正确的植物状态结构', () => {
      const plantStatus: PlantStatus = {
        state: PlantState.HEALTHY,
        soilMoisture: 55,
        lightLevel: 800,
        temperature: 24,
        needsAttention: false,
        batteryLevel: 85,
      };

      expect(plantStatus.state).toBeValidPlantState();
      expect(typeof plantStatus.soilMoisture).toBe('number');
      expect(typeof plantStatus.lightLevel).toBe('number');
      expect(typeof plantStatus.temperature).toBe('number');
      expect(typeof plantStatus.needsAttention).toBe('boolean');
    });
  });

  describe('LED颜色类型', () => {
    /**
     * Feature: ai-plant-care-robot, Property 3: LED颜色有效性
     * 对于任何LED颜色，RGB值都应在0-255范围内
     */
    test('Property: LED颜色有效性', () => {
      fc.assert(
        fc.property(
          fc.record({
            r: fc.integer({ min: 0, max: 255 }),
            g: fc.integer({ min: 0, max: 255 }),
            b: fc.integer({ min: 0, max: 255 }),
          }),
          (color: LEDColor) => {
            expect(color).toBeValidLEDColor();
            expect(color.r).toBeWithinRange(0, 255);
            expect(color.g).toBeWithinRange(0, 255);
            expect(color.b).toBeWithinRange(0, 255);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('预定义LED颜色应该有效', () => {
      expect(LED_COLORS.HEALTHY).toBeValidLEDColor();
      expect(LED_COLORS.NEEDS_WATER).toBeValidLEDColor();
      expect(LED_COLORS.NEEDS_LIGHT).toBeValidLEDColor();
      expect(LED_COLORS.LOW_BATTERY).toBeValidLEDColor();
      expect(LED_COLORS.ERROR).toBeValidLEDColor();
      expect(LED_COLORS.OFF).toBeValidLEDColor();
    });
  });

  describe('常量定义', () => {
    test('传感器阈值应该在合理范围内', () => {
      expect(SENSOR_THRESHOLDS.MOISTURE_LOW).toBeWithinRange(0, 100);
      expect(SENSOR_THRESHOLDS.LIGHT_LOW).toBeGreaterThan(0);
      expect(SENSOR_THRESHOLDS.TEMPERATURE_MIN).toBeLessThan(
        SENSOR_THRESHOLDS.TEMPERATURE_MAX
      );
      expect(SENSOR_THRESHOLDS.BATTERY_LOW).toBeWithinRange(0, 100);
    });

    test('时间常量应该为正数', () => {
      expect(TIMING_CONSTANTS.DATA_COLLECTION_INTERVAL).toBeGreaterThan(0);
      expect(TIMING_CONSTANTS.ALERT_DELAY).toBeGreaterThan(0);
      expect(TIMING_CONSTANTS.REPEAT_ALERT_INTERVAL).toBeGreaterThan(0);
      expect(TIMING_CONSTANTS.STARTUP_TIMEOUT).toBeGreaterThan(0);
      expect(TIMING_CONSTANTS.RESPONSE_TIMEOUT).toBeGreaterThan(0);
    });

    test('时间常量应该有合理的相对大小', () => {
      // 数据采集间隔应该小于提醒延迟
      expect(TIMING_CONSTANTS.DATA_COLLECTION_INTERVAL).toBeLessThan(
        TIMING_CONSTANTS.ALERT_DELAY
      );
      
      // 提醒延迟应该小于重复提醒间隔
      expect(TIMING_CONSTANTS.ALERT_DELAY).toBeLessThan(
        TIMING_CONSTANTS.REPEAT_ALERT_INTERVAL
      );
      
      // 响应超时应该小于启动超时
      expect(TIMING_CONSTANTS.RESPONSE_TIMEOUT).toBeLessThan(
        TIMING_CONSTANTS.STARTUP_TIMEOUT
      );
    });
  });

  describe('边界情况测试', () => {
    test('极端传感器数值应该被正确处理', () => {
      const extremeData: SensorData = {
        soilHumidity: 0,
        airHumidity: 100,
        temperature: -40,
        lightIntensity: 0,
        timestamp: 1000000000000,
      };

      expect(extremeData).toBeValidSensorData();
    });

    test('LED颜色边界值应该有效', () => {
      const blackColor: LEDColor = { r: 0, g: 0, b: 0 };
      const whiteColor: LEDColor = { r: 255, g: 255, b: 255 };

      expect(blackColor).toBeValidLEDColor();
      expect(whiteColor).toBeValidLEDColor();
    });
  });
});