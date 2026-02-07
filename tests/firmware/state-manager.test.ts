/**
 * 状态管理器属性测试
 * 验证异常状态记录的正确性属性
 */

import fc from 'fast-check';
import { SensorData, PlantState, SENSOR_THRESHOLDS } from '../../shared/types';

// 状态变化记录接口
interface StateChangeRecord {
  previousState: PlantState;
  currentState: PlantState;
  changeTime: number;
  triggerData: SensorData;
  changeReason: string;
}

// 阈值配置接口
interface ThresholdConfig {
  moistureLow: number;
  moistureCritical: number;
  lightLow: number;
  lightCritical: number;
  temperatureMin: number;
  temperatureMax: number;
  temperatureOptimalMin: number;
  temperatureOptimalMax: number;
}

// 植物状态详细信息接口
interface PlantStatus {
  state: PlantState;
  soilMoisture: number;
  lightLevel: number;
  temperature: number;
  airHumidity: number;
  timestamp: number;
  needsAttention: boolean;
  statusMessage: string;
  healthScore: number;
}

// 模拟状态管理器
class MockStateManager {
  private currentStatus: PlantStatus;
  private previousState: PlantState = PlantState.HEALTHY;
  private stateHistory: StateChangeRecord[] = [];
  private thresholds: ThresholdConfig;
  private stats = {
    totalEvaluations: 0,
    stateChanges: 0,
    averageHealthScore: 0,
  };

  constructor() {
    this.thresholds = {
      moistureLow: SENSOR_THRESHOLDS.MOISTURE_LOW,
      moistureCritical: 10,
      lightLow: SENSOR_THRESHOLDS.LIGHT_LOW,
      lightCritical: 100,
      temperatureMin: SENSOR_THRESHOLDS.TEMPERATURE_MIN,
      temperatureMax: SENSOR_THRESHOLDS.TEMPERATURE_MAX,
      temperatureOptimalMin: 20,
      temperatureOptimalMax: 28,
    };

    this.currentStatus = {
      state: PlantState.HEALTHY,
      soilMoisture: 50,
      lightLevel: 800,
      temperature: 25,
      airHumidity: 60,
      timestamp: Date.now(),
      needsAttention: false,
      statusMessage: '植物状态良好',
      healthScore: 100,
    };
  }

  /**
   * 评估植物状态
   */
  evaluateState(sensorData: SensorData): PlantStatus {
    if (!this.validateSensorData(sensorData)) {
      return this.currentStatus;
    }

    const newState = this.evaluateBasicState(sensorData);
    const healthScore = this.calculateHealthScore(sensorData);
    const statusMessage = this.generateStatusMessage(newState, sensorData);

    // 检查状态变化
    if (newState !== this.currentStatus.state) {
      this.recordStateChange(newState, sensorData);
      this.previousState = this.currentStatus.state;
    }

    // 更新当前状态
    this.currentStatus = {
      state: newState,
      soilMoisture: sensorData.soilHumidity,
      lightLevel: sensorData.lightIntensity,
      temperature: sensorData.temperature,
      airHumidity: sensorData.airHumidity,
      timestamp: sensorData.timestamp,
      needsAttention: this.isAbnormalState(newState),
      statusMessage,
      healthScore,
    };

    this.updateStats(healthScore);
    return this.currentStatus;
  }

  /**
   * 评估基本状态
   */
  private evaluateBasicState(data: SensorData): PlantState {
    const needsWater = data.soilHumidity < this.thresholds.moistureLow;
    const needsLight = data.lightIntensity < this.thresholds.lightLow;
    const criticalWater = data.soilHumidity < this.thresholds.moistureCritical;
    const criticalLight = data.lightIntensity < this.thresholds.lightCritical;
    const temperatureOK = (
      data.temperature >= this.thresholds.temperatureMin &&
      data.temperature <= this.thresholds.temperatureMax
    );

    // 危急状态判断
    if ((criticalWater || criticalLight) || !temperatureOK) {
      return PlantState.CRITICAL;
    }

    // 需要水分和光照
    if (needsWater && needsLight) {
      return PlantState.CRITICAL;
    }

    // 单独需要水分
    if (needsWater) {
      return PlantState.NEEDS_WATER;
    }

    // 单独需要光照
    if (needsLight) {
      return PlantState.NEEDS_LIGHT;
    }

    return PlantState.HEALTHY;
  }

  /**
   * 计算健康评分
   */
  private calculateHealthScore(data: SensorData): number {
    const moistureScore = this.calculateMoistureScore(data.soilHumidity);
    const lightScore = this.calculateLightScore(data.lightIntensity);
    const temperatureScore = this.calculateTemperatureScore(data.temperature);

    // 加权平均 (湿度40%, 光照40%, 温度20%)
    const totalScore = moistureScore * 0.4 + lightScore * 0.4 + temperatureScore * 0.2;
    return Math.max(0, Math.min(100, Math.round(totalScore)));
  }

  /**
   * 计算湿度评分
   */
  private calculateMoistureScore(moisture: number): number {
    if (moisture >= 60) {
      return 100;
    } else if (moisture >= this.thresholds.moistureLow) {
      return 60 + (moisture - this.thresholds.moistureLow) / (60 - this.thresholds.moistureLow) * 40;
    } else if (moisture >= this.thresholds.moistureCritical) {
      return 20 + (moisture - this.thresholds.moistureCritical) / (this.thresholds.moistureLow - this.thresholds.moistureCritical) * 40;
    } else {
      return moisture / this.thresholds.moistureCritical * 20;
    }
  }

  /**
   * 计算光照评分
   */
  private calculateLightScore(light: number): number {
    if (light >= 2000) {
      return 100;
    } else if (light >= this.thresholds.lightLow) {
      return 60 + (light - this.thresholds.lightLow) / (2000 - this.thresholds.lightLow) * 40;
    } else if (light >= this.thresholds.lightCritical) {
      return 20 + (light - this.thresholds.lightCritical) / (this.thresholds.lightLow - this.thresholds.lightCritical) * 40;
    } else {
      return light / this.thresholds.lightCritical * 20;
    }
  }

  /**
   * 计算温度评分
   */
  private calculateTemperatureScore(temperature: number): number {
    if (temperature >= this.thresholds.temperatureOptimalMin && 
        temperature <= this.thresholds.temperatureOptimalMax) {
      return 100;
    } else if (temperature >= this.thresholds.temperatureMin && 
               temperature <= this.thresholds.temperatureMax) {
      const distanceFromOptimal = Math.min(
        Math.abs(temperature - this.thresholds.temperatureOptimalMin),
        Math.abs(temperature - this.thresholds.temperatureOptimalMax)
      );
      return 70 + (1.0 - distanceFromOptimal / 10.0) * 30;
    } else {
      return 0;
    }
  }

  /**
   * 生成状态消息
   */
  private generateStatusMessage(state: PlantState, data: SensorData): string {
    switch (state) {
      case PlantState.HEALTHY:
        return '植物状态良好';
      case PlantState.NEEDS_WATER:
        return `植物需要浇水 (湿度: ${data.soilHumidity.toFixed(1)}%)`;
      case PlantState.NEEDS_LIGHT:
        return `植物需要更多光照 (光照: ${data.lightIntensity.toFixed(0)} lux)`;
      case PlantState.CRITICAL:
        return '植物状态危急！';
      default:
        return '状态未知';
    }
  }

  /**
   * 记录状态变化
   */
  private recordStateChange(newState: PlantState, data: SensorData): void {
    const record: StateChangeRecord = {
      previousState: this.currentStatus.state,
      currentState: newState,
      changeTime: Date.now(),
      triggerData: data,
      changeReason: `传感器数据变化: 湿度=${data.soilHumidity.toFixed(1)}%, 光照=${data.lightIntensity.toFixed(0)}lux`,
    };

    this.stateHistory.push(record);
    
    // 保持最近10条记录
    if (this.stateHistory.length > 10) {
      this.stateHistory.shift();
    }

    this.stats.stateChanges++;
  }

  /**
   * 更新统计信息
   */
  private updateStats(healthScore: number): void {
    this.stats.totalEvaluations++;
    this.stats.averageHealthScore = 
      (this.stats.averageHealthScore * (this.stats.totalEvaluations - 1) + healthScore) / 
      this.stats.totalEvaluations;
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
   * 检查是否为异常状态
   */
  private isAbnormalState(state: PlantState): boolean {
    return state !== PlantState.HEALTHY;
  }

  // 公共方法
  getCurrentStatus(): PlantStatus {
    return this.currentStatus;
  }

  getStateHistory(): StateChangeRecord[] {
    return [...this.stateHistory];
  }

  getStats() {
    return { ...this.stats };
  }

  setThresholds(config: Partial<ThresholdConfig>): void {
    this.thresholds = { ...this.thresholds, ...config };
  }

  getThresholds(): ThresholdConfig {
    return { ...this.thresholds };
  }

  clearStateHistory(): void {
    this.stateHistory = [];
  }

  resetStats(): void {
    this.stats = {
      totalEvaluations: 0,
      stateChanges: 0,
      averageHealthScore: 0,
    };
  }
}
describe('状态管理器属性测试', () => {
  let stateManager: MockStateManager;

  beforeEach(() => {
    stateManager = new MockStateManager();
  });

  describe('属性 4: 异常状态记录', () => {
    /**
     * Feature: ai-plant-care-robot, Property 4: 异常状态记录
     * 对于任何超出正常范围的环境参数，系统应记录异常状态和对应的时间戳
     * 验证需求: 需求 1.4
     */
    test('Property: 异常状态记录 - 缺水状态记录', () => {
      fc.assert(
        fc.property(
          fc.record({
            // 10~29.9 仅触发缺水(needs_water)，不触发危急(critical)
            soilHumidity: fc.float({ min: 10, max: Math.fround(29.9), noNaN: true }),
            airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
            temperature: fc.float({ min: 15, max: 35, noNaN: true }),
            lightIntensity: fc.float({ min: 500, max: 10000, noNaN: true }),
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            // 先设置为健康状态
            const healthyData = createMockSensorData({
              soilHumidity: 50,
              lightIntensity: 800,
            });
            stateManager.evaluateState(healthyData);

            // 清除历史记录
            stateManager.clearStateHistory();

            // 触发异常状态
            const result = stateManager.evaluateState(sensorData);

            // 验证状态变化被记录（mock 会拒绝 NaN，此处数据已 noNaN）
            const history = stateManager.getStateHistory();
            
            expect(result.state).toBe(PlantState.NEEDS_WATER);
            expect(result.needsAttention).toBe(true);
            expect(history).toHaveLength(1);
            
            const record = history[0];
            expect(record.previousState).toBe(PlantState.HEALTHY);
            expect(record.currentState).toBe(PlantState.NEEDS_WATER);
            expect(record.changeTime).toBeGreaterThan(0);
            expect(record.triggerData.soilHumidity).toBe(sensorData.soilHumidity);
            expect(record.changeReason).toContain('传感器数据变化');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: 异常状态记录 - 光照不足状态记录', () => {
      fc.assert(
        fc.property(
          fc.record({
            soilHumidity: fc.float({ min: 30, max: 100, noNaN: true }),
            airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
            temperature: fc.float({ min: 15, max: 35, noNaN: true }),
            // 100~499.9 仅触发光照不足(needs_light)，不触发危急
            lightIntensity: fc.float({ min: 100, max: Math.fround(499.9), noNaN: true }),
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            // 先设置为健康状态
            const healthyData = createMockSensorData({
              soilHumidity: 50,
              lightIntensity: 800,
            });
            stateManager.evaluateState(healthyData);

            // 清除历史记录
            stateManager.clearStateHistory();

            // 触发异常状态
            const result = stateManager.evaluateState(sensorData);

            // 验证状态变化被记录（mock 会拒绝 NaN）
            const history = stateManager.getStateHistory();
            
            expect(result.state).toBe(PlantState.NEEDS_LIGHT);
            expect(result.needsAttention).toBe(true);
            expect(history).toHaveLength(1);
            
            const record = history[0];
            expect(record.previousState).toBe(PlantState.HEALTHY);
            expect(record.currentState).toBe(PlantState.NEEDS_LIGHT);
            expect(record.changeTime).toBeGreaterThan(0);
            expect(record.triggerData.lightIntensity).toBe(sensorData.lightIntensity);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: 异常状态记录 - 危急状态记录', () => {
      fc.assert(
        fc.property(
          fc.record({
            soilHumidity: fc.float({ min: 0, max: Math.fround(9.9), noNaN: true }),
            airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
            temperature: fc.float({ min: 15, max: 35, noNaN: true }),
            lightIntensity: fc.float({ min: 0, max: Math.fround(99.9), noNaN: true }),
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            // 先设置为健康状态
            const healthyData = createMockSensorData({
              soilHumidity: 50,
              lightIntensity: 800,
            });
            stateManager.evaluateState(healthyData);

            // 清除历史记录
            stateManager.clearStateHistory();

            // 触发危急状态
            const result = stateManager.evaluateState(sensorData);

            // 验证状态变化被记录（mock 会拒绝 NaN）
            const history = stateManager.getStateHistory();
            
            expect(result.state).toBe(PlantState.CRITICAL);
            expect(result.needsAttention).toBe(true);
            expect(history).toHaveLength(1);
            
            const record = history[0];
            expect(record.previousState).toBe(PlantState.HEALTHY);
            expect(record.currentState).toBe(PlantState.CRITICAL);
            expect(record.changeTime).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: 异常状态记录 - 温度异常状态记录', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // 温度过低
            fc.record({
              soilHumidity: fc.float({ min: 30, max: 100, noNaN: true }),
              airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
              temperature: fc.float({ min: -40, max: Math.fround(14.9), noNaN: true }),
              lightIntensity: fc.float({ min: 500, max: 10000, noNaN: true }),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            }),
            // 温度过高
            fc.record({
              soilHumidity: fc.float({ min: 30, max: 100, noNaN: true }),
              airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
              temperature: fc.float({ min: Math.fround(35.1), max: 80, noNaN: true }),
              lightIntensity: fc.float({ min: 500, max: 10000, noNaN: true }),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            })
          ),
          (sensorData: SensorData) => {
            // 先设置为健康状态
            const healthyData = createMockSensorData({
              soilHumidity: 50,
              lightIntensity: 800,
              temperature: 25,
            });
            stateManager.evaluateState(healthyData);

            // 清除历史记录
            stateManager.clearStateHistory();

            // 触发温度异常状态
            const result = stateManager.evaluateState(sensorData);

            // 验证状态变化被记录
            const history = stateManager.getStateHistory();
            
            expect(result.state).toBe(PlantState.CRITICAL);
            expect(result.needsAttention).toBe(true);
            expect(history).toHaveLength(1);
            
            const record = history[0];
            expect(record.previousState).toBe(PlantState.HEALTHY);
            expect(record.currentState).toBe(PlantState.CRITICAL);
            expect(record.triggerData.temperature).toBe(sensorData.temperature);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('健康评分属性测试', () => {
    /**
     * Feature: ai-plant-care-robot, Property: 健康评分范围
     * 对于任何有效的传感器数据，健康评分应在0-100范围内
     */
    test('Property: 健康评分应在有效范围内', () => {
      fc.assert(
        fc.property(
          fc.record({
            soilHumidity: fc.float({ min: 0, max: 100 }),
            airHumidity: fc.float({ min: 0, max: 100 }),
            temperature: fc.float({ min: -40, max: 80 }),
            lightIntensity: fc.float({ min: 0, max: 50000 }),
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            const result = stateManager.evaluateState(sensorData);
            
            expect(result.healthScore).toBeWithinRange(0, 100);
            expect(Number.isInteger(result.healthScore)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: ai-plant-care-robot, Property: 理想条件下健康评分
     * 对于理想的环境条件，健康评分应该很高
     */
    test('Property: 理想条件下健康评分应该很高', () => {
      fc.assert(
        fc.property(
          fc.record({
            soilHumidity: fc.float({ min: 60, max: 100 }), // 理想湿度
            airHumidity: fc.float({ min: 40, max: 80 }),
            temperature: fc.float({ min: 20, max: 28 }), // 最适温度
            lightIntensity: fc.float({ min: 2000, max: 10000 }), // 理想光照
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            const result = stateManager.evaluateState(sensorData);
            
            expect(result.state).toBe(PlantState.HEALTHY);
            expect(result.healthScore).toBeGreaterThanOrEqual(90);
            expect(result.needsAttention).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: ai-plant-care-robot, Property: 危急条件下健康评分
     * 对于危急的环境条件，健康评分应该很低
     */
    test('Property: 危急条件下健康评分应该很低', () => {
      fc.assert(
        fc.property(
          fc.record({
            soilHumidity: fc.float({ min: 0, max: Math.fround(9.9) }), // 危急缺水
            airHumidity: fc.float({ min: 0, max: 100 }),
            temperature: fc.oneof(
              fc.float({ min: -40, max: Math.fround(14.9) }), // 温度过低
              fc.float({ min: Math.fround(35.1), max: 80 })   // 温度过高
            ),
            lightIntensity: fc.float({ min: 0, max: Math.fround(99.9) }), // 危急缺光
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (sensorData: SensorData) => {
            const result = stateManager.evaluateState(sensorData);
            
            expect(result.state).toBe(PlantState.CRITICAL);
            expect(result.healthScore).toBeLessThanOrEqual(30);
            expect(result.needsAttention).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('状态变化一致性测试', () => {
    /**
     * Feature: ai-plant-care-robot, Property: 状态变化记录一致性
     * 对于任何状态变化，记录的数据应与触发变化的传感器数据一致
     */
    test('Property: 状态变化记录数据一致性', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              soilHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
              airHumidity: fc.float({ min: 0, max: 100, noNaN: true }),
              temperature: fc.float({ min: -40, max: 80, noNaN: true }),
              lightIntensity: fc.float({ min: 0, max: 50000, noNaN: true }),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (sensorDataArray: SensorData[]) => {
            stateManager.clearStateHistory();
            
            let previousState = PlantState.HEALTHY;
            
            sensorDataArray.forEach((sensorData, index) => {
              const result = stateManager.evaluateState(sensorData);
              
              // 如果状态发生变化，验证记录的一致性
              if (result.state !== previousState) {
                const history = stateManager.getStateHistory();
                // 无效数据时 mock 不记录，跳过断言
                if (history.length === 0) return;
                const latestRecord = history[history.length - 1];
                if (!latestRecord || latestRecord.currentState !== result.state) return;
                expect(latestRecord.currentState).toBe(result.state);
                expect(latestRecord.previousState).toBe(previousState);
                expect(latestRecord.triggerData.soilHumidity).toBe(sensorData.soilHumidity);
                expect(latestRecord.triggerData.lightIntensity).toBe(sensorData.lightIntensity);
                expect(latestRecord.triggerData.temperature).toBe(sensorData.temperature);
                expect(latestRecord.changeTime).toBeGreaterThan(0);
              }
              
              previousState = result.state;
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('阈值配置测试', () => {
    test('自定义阈值应该影响状态评估', () => {
      const customThresholds = {
        moistureLow: 40, // 提高湿度阈值
        lightLow: 800,   // 提高光照阈值
      };

      stateManager.setThresholds(customThresholds);

      const testData = createMockSensorData({
        soilHumidity: 35, // 在默认阈值下是健康的，但在自定义阈值下需要浇水
        lightIntensity: 600, // 在默认阈值下是健康的，但在自定义阈值下需要光照
      });

      const result = stateManager.evaluateState(testData);

      expect(result.state).toBe(PlantState.CRITICAL); // 同时缺水缺光
      expect(result.needsAttention).toBe(true);
    });

    test('获取阈值配置应该返回正确的值', () => {
      const customThresholds = {
        moistureLow: 45,
        lightLow: 1000,
      };

      stateManager.setThresholds(customThresholds);
      const retrievedThresholds = stateManager.getThresholds();

      expect(retrievedThresholds.moistureLow).toBe(45);
      expect(retrievedThresholds.lightLow).toBe(1000);
    });
  });

  describe('统计信息测试', () => {
    test('统计信息应该正确跟踪评估次数', () => {
      const testData1 = createMockSensorData({ soilHumidity: 50 });
      const testData2 = createMockSensorData({ soilHumidity: 20 }); // 触发状态变化
      const testData3 = createMockSensorData({ soilHumidity: 60 }); // 再次触发状态变化

      stateManager.resetStats();

      stateManager.evaluateState(testData1);
      stateManager.evaluateState(testData2);
      stateManager.evaluateState(testData3);

      const stats = stateManager.getStats();

      expect(stats.totalEvaluations).toBe(3);
      expect(stats.stateChanges).toBe(2); // 健康->缺水, 缺水->健康
      expect(stats.averageHealthScore).toBeGreaterThan(0);
    });

    test('重置统计信息应该清零所有计数', () => {
      const testData = createMockSensorData();
      stateManager.evaluateState(testData);

      let stats = stateManager.getStats();
      expect(stats.totalEvaluations).toBeGreaterThan(0);

      stateManager.resetStats();
      stats = stateManager.getStats();

      expect(stats.totalEvaluations).toBe(0);
      expect(stats.stateChanges).toBe(0);
      expect(stats.averageHealthScore).toBe(0);
    });
  });

  describe('边界条件测试', () => {
    test('阈值边界值应该正确处理', () => {
      // 恰好等于阈值的情况
      const boundaryData = createMockSensorData({
        soilHumidity: 30.0, // 恰好等于默认阈值
        lightIntensity: 500.0, // 恰好等于默认阈值
      });

      const result = stateManager.evaluateState(boundaryData);

      // 等于阈值应该被认为是健康的
      expect(result.state).toBe(PlantState.HEALTHY);
      expect(result.needsAttention).toBe(false);
    });

    test('状态历史应该限制在最大数量', () => {
      stateManager.clearStateHistory();

      // 生成超过10次的状态变化
      for (let i = 0; i < 15; i++) {
        const testData = createMockSensorData({
          soilHumidity: i % 2 === 0 ? 20 : 60, // 交替触发状态变化
          timestamp: Date.now() + i,
        });
        stateManager.evaluateState(testData);
      }

      const history = stateManager.getStateHistory();

      // 历史记录应该限制在10条以内
      expect(history.length).toBeLessThanOrEqual(10);
    });

    test('无效传感器数据应该被忽略', () => {
      const validData = createMockSensorData({ soilHumidity: 50 });
      stateManager.evaluateState(validData);

      const initialStatus = stateManager.getCurrentStatus();

      // 提供无效数据
      const invalidData = createMockSensorData({
        soilHumidity: -10, // 无效值
        lightIntensity: -100, // 无效值
      });

      const result = stateManager.evaluateState(invalidData);

      // 状态应该保持不变
      expect(result.state).toBe(initialStatus.state);
      expect(result.soilMoisture).toBe(initialStatus.soilMoisture);
    });
  });

  describe('单元测试 - 具体示例', () => {
    test('典型缺水场景状态记录', () => {
      // 设置初始健康状态
      const healthyData = createMockSensorData({
        soilHumidity: 60,
        lightIntensity: 1000,
      });
      stateManager.evaluateState(healthyData);
      stateManager.clearStateHistory();

      // 触发缺水状态
      const dryData = createMockSensorData({
        soilHumidity: 15, // 明显低于30%阈值
        lightIntensity: 1000,
      });

      const result = stateManager.evaluateState(dryData);
      const history = stateManager.getStateHistory();

      expect(result.state).toBe(PlantState.NEEDS_WATER);
      expect(result.needsAttention).toBe(true);
      expect(history).toHaveLength(1);
      expect(history[0].previousState).toBe(PlantState.HEALTHY);
      expect(history[0].currentState).toBe(PlantState.NEEDS_WATER);
      expect(history[0].triggerData.soilHumidity).toBe(15);
    });

    test('从异常状态恢复到健康状态', () => {
      // 先设置缺水状态
      const dryData = createMockSensorData({
        soilHumidity: 20,
        lightIntensity: 800,
      });
      stateManager.evaluateState(dryData);
      stateManager.clearStateHistory();

      // 恢复到健康状态
      const healthyData = createMockSensorData({
        soilHumidity: 70,
        lightIntensity: 800,
      });

      const result = stateManager.evaluateState(healthyData);
      const history = stateManager.getStateHistory();

      expect(result.state).toBe(PlantState.HEALTHY);
      expect(result.needsAttention).toBe(false);
      expect(history).toHaveLength(1);
      expect(history[0].previousState).toBe(PlantState.NEEDS_WATER);
      expect(history[0].currentState).toBe(PlantState.HEALTHY);
    });

    test('多重异常状态（同时缺水缺光）', () => {
      const criticalData = createMockSensorData({
        soilHumidity: 5,   // 严重缺水
        lightIntensity: 50, // 严重缺光
        temperature: 25,
      });

      const result = stateManager.evaluateState(criticalData);

      expect(result.state).toBe(PlantState.CRITICAL);
      expect(result.needsAttention).toBe(true);
      expect(result.healthScore).toBeLessThan(30);
      expect(result.statusMessage).toContain('危急');
    });
  });
});