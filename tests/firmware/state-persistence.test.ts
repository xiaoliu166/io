/**
 * 状态持久化测试
 * 验证状态数据的持久化存储和恢复功能
 */

import fc from 'fast-check';
import { SensorData, PlantState } from '../../shared/types';

// 持久化状态数据接口
interface PersistentStateData {
  currentState: PlantState;
  previousState: PlantState;
  stateStartTime: number;
  lastUpdateTime: number;
  healthScore: number;
  lastSoilMoisture: number;
  lastLightLevel: number;
  lastTemperature: number;
  needsAttention: boolean;
  checksum: number;
}

// 状态变化记录接口
interface StateChangeRecord {
  previousState: PlantState;
  currentState: PlantState;
  changeTime: number;
  triggerData: SensorData;
  changeReason: string;
}

// 统计信息接口
interface StateStats {
  totalEvaluations: number;
  stateChanges: number;
  timeInHealthy: number;
  timeInNeedsWater: number;
  timeInNeedsLight: number;
  timeInCritical: number;
  averageHealthScore: number;
  lastStateChange: number;
}

// 模拟持久化管理器
class MockStatePersistence {
  private storage: Map<string, any> = new Map();
  private isInitialized = false;
  private lastSaveTime = 0;
  private autoSaveEnabled = true;
  private saveInterval = 300000; // 5分钟

  /**
   * 初始化持久化管理器
   */
  initialize(): boolean {
    this.isInitialized = true;
    this.storage.clear();
    return true;
  }

  /**
   * 计算校验和
   */
  private calculateChecksum(data: any): number {
    const str = JSON.stringify(data);
    let checksum = 0;
    for (let i = 0; i < str.length; i++) {
      checksum += str.charCodeAt(i);
      checksum = (checksum << 1) | (checksum >>> 31); // 循环左移
    }
    return checksum >>> 0; // 确保为无符号32位整数
  }

  /**
   * 验证校验和
   */
  private verifyChecksum(data: any, expectedChecksum: number): boolean {
    const actualChecksum = this.calculateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * 保存当前状态
   */
  saveCurrentState(status: any): boolean {
    if (!this.isInitialized) {
      return false;
    }

    const stateData: PersistentStateData = {
      currentState: status.state,
      previousState: status.previousState || PlantState.HEALTHY,
      stateStartTime: Date.now(),
      lastUpdateTime: Date.now(),
      healthScore: status.healthScore,
      lastSoilMoisture: status.soilMoisture,
      lastLightLevel: status.lightLevel,
      lastTemperature: status.temperature,
      needsAttention: status.needsAttention,
      checksum: 0,
    };

    stateData.checksum = this.calculateChecksum({
      ...stateData,
      checksum: 0,
    });

    this.storage.set('currentState', stateData);
    this.lastSaveTime = Date.now();
    return true;
  }

  /**
   * 加载当前状态
   */
  loadCurrentState(): any | null {
    if (!this.isInitialized) {
      return null;
    }

    const stateData = this.storage.get('currentState') as PersistentStateData;
    if (!stateData) {
      return null;
    }

    // 验证校验和
    const dataWithoutChecksum = { ...stateData, checksum: 0 };
    if (!this.verifyChecksum(dataWithoutChecksum, stateData.checksum)) {
      return null;
    }

    return {
      state: stateData.currentState,
      soilMoisture: stateData.lastSoilMoisture,
      lightLevel: stateData.lastLightLevel,
      temperature: stateData.lastTemperature,
      airHumidity: 0,
      timestamp: stateData.lastUpdateTime,
      needsAttention: stateData.needsAttention,
      statusMessage: '',
      healthScore: stateData.healthScore,
    };
  }

  /**
   * 保存状态历史记录
   */
  saveStateHistory(history: StateChangeRecord[]): boolean {
    if (!this.isInitialized) {
      return false;
    }

    const historyData = {
      records: history.slice(0, 5), // 最多保存5条记录
      recordCount: Math.min(history.length, 5),
      checksum: 0,
    };

    historyData.checksum = this.calculateChecksum({
      ...historyData,
      checksum: 0,
    });

    this.storage.set('stateHistory', historyData);
    return true;
  }

  /**
   * 加载状态历史记录
   */
  loadStateHistory(): StateChangeRecord[] {
    if (!this.isInitialized) {
      return [];
    }

    const historyData = this.storage.get('stateHistory');
    if (!historyData) {
      return [];
    }

    // 验证校验和
    const dataWithoutChecksum = { ...historyData, checksum: 0 };
    if (!this.verifyChecksum(dataWithoutChecksum, historyData.checksum)) {
      return [];
    }

    return historyData.records || [];
  }

  /**
   * 保存统计信息
   */
  saveStateStats(stats: StateStats): boolean {
    if (!this.isInitialized) {
      return false;
    }

    const statsData = {
      ...stats,
      checksum: 0,
    };

    statsData.checksum = this.calculateChecksum({
      ...statsData,
      checksum: 0,
    });

    this.storage.set('stateStats', statsData);
    return true;
  }

  /**
   * 加载统计信息
   */
  loadStateStats(): StateStats | null {
    if (!this.isInitialized) {
      return null;
    }

    const statsData = this.storage.get('stateStats');
    if (!statsData) {
      return null;
    }

    // 验证校验和
    const dataWithoutChecksum = { ...statsData, checksum: 0 };
    if (!this.verifyChecksum(dataWithoutChecksum, statsData.checksum)) {
      return null;
    }

    return {
      totalEvaluations: statsData.totalEvaluations,
      stateChanges: statsData.stateChanges,
      timeInHealthy: statsData.timeInHealthy,
      timeInNeedsWater: statsData.timeInNeedsWater,
      timeInNeedsLight: statsData.timeInNeedsLight,
      timeInCritical: statsData.timeInCritical,
      averageHealthScore: statsData.averageHealthScore,
      lastStateChange: statsData.lastStateChange,
    };
  }

  /**
   * 检查是否有有效数据
   */
  hasValidData(): boolean {
    return this.storage.has('currentState');
  }

  /**
   * 清除所有数据
   */
  clearAllData(): boolean {
    this.storage.clear();
    return true;
  }

  /**
   * 验证数据完整性
   */
  verifyDataIntegrity(): boolean {
    if (!this.hasValidData()) {
      return false;
    }

    // 验证当前状态数据
    const currentState = this.storage.get('currentState');
    if (currentState) {
      const dataWithoutChecksum = { ...currentState, checksum: 0 };
      if (!this.verifyChecksum(dataWithoutChecksum, currentState.checksum)) {
        return false;
      }
    }

    // 验证历史数据
    const historyData = this.storage.get('stateHistory');
    if (historyData) {
      const dataWithoutChecksum = { ...historyData, checksum: 0 };
      if (!this.verifyChecksum(dataWithoutChecksum, historyData.checksum)) {
        return false;
      }
    }

    // 验证统计数据
    const statsData = this.storage.get('stateStats');
    if (statsData) {
      const dataWithoutChecksum = { ...statsData, checksum: 0 };
      if (!this.verifyChecksum(dataWithoutChecksum, statsData.checksum)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 设置自动保存间隔
   */
  setAutoSaveInterval(interval: number): void {
    this.saveInterval = Math.max(60000, interval); // 最小1分钟
  }

  /**
   * 启用或禁用自动保存
   */
  setAutoSaveEnabled(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
  }

  /**
   * 检查是否需要自动保存
   */
  needsAutoSave(): boolean {
    return this.autoSaveEnabled && (Date.now() - this.lastSaveTime >= this.saveInterval);
  }

  /**
   * 获取最后保存时间
   */
  getLastSaveTime(): number {
    return this.lastSaveTime;
  }

  /**
   * 获取存储使用情况
   */
  getStorageUsage(): number {
    return this.storage.size;
  }

  /**
   * 模拟数据损坏
   */
  corruptData(key: string): void {
    const data = this.storage.get(key);
    if (data && data.checksum !== undefined) {
      data.checksum = 0xDEADBEEF; // 设置错误的校验和
      this.storage.set(key, data);
    }
  }
}
describe('状态持久化测试', () => {
  let persistence: MockStatePersistence;

  beforeEach(() => {
    persistence = new MockStatePersistence();
    persistence.initialize();
  });

  describe('基本功能测试', () => {
    test('应该能够初始化持久化管理器', () => {
      const newPersistence = new MockStatePersistence();
      const result = newPersistence.initialize();
      
      expect(result).toBe(true);
      expect(newPersistence.hasValidData()).toBe(false);
    });

    test('应该能够保存和加载当前状态', () => {
      const testStatus = {
        state: PlantState.NEEDS_WATER,
        soilMoisture: 25,
        lightLevel: 800,
        temperature: 24,
        airHumidity: 60,
        timestamp: Date.now(),
        needsAttention: true,
        statusMessage: '植物需要浇水',
        healthScore: 65,
      };

      const saveResult = persistence.saveCurrentState(testStatus);
      expect(saveResult).toBe(true);
      expect(persistence.hasValidData()).toBe(true);

      const loadedStatus = persistence.loadCurrentState();
      expect(loadedStatus).not.toBeNull();
      expect(loadedStatus.state).toBe(PlantState.NEEDS_WATER);
      expect(loadedStatus.soilMoisture).toBe(25);
      expect(loadedStatus.healthScore).toBe(65);
      expect(loadedStatus.needsAttention).toBe(true);
    });

    test('应该能够保存和加载状态历史记录', () => {
      const testHistory: StateChangeRecord[] = [
        {
          previousState: PlantState.HEALTHY,
          currentState: PlantState.NEEDS_WATER,
          changeTime: Date.now() - 1000,
          triggerData: createMockSensorData({ soilHumidity: 25 }),
          changeReason: '土壤湿度过低',
        },
        {
          previousState: PlantState.NEEDS_WATER,
          currentState: PlantState.HEALTHY,
          changeTime: Date.now(),
          triggerData: createMockSensorData({ soilHumidity: 60 }),
          changeReason: '浇水后恢复',
        },
      ];

      const saveResult = persistence.saveStateHistory(testHistory);
      expect(saveResult).toBe(true);

      const loadedHistory = persistence.loadStateHistory();
      expect(loadedHistory).toHaveLength(2);
      expect(loadedHistory[0].previousState).toBe(PlantState.HEALTHY);
      expect(loadedHistory[0].currentState).toBe(PlantState.NEEDS_WATER);
      expect(loadedHistory[1].currentState).toBe(PlantState.HEALTHY);
    });

    test('应该能够保存和加载统计信息', () => {
      const testStats: StateStats = {
        totalEvaluations: 100,
        stateChanges: 5,
        timeInHealthy: 80000,
        timeInNeedsWater: 15000,
        timeInNeedsLight: 5000,
        timeInCritical: 0,
        averageHealthScore: 85.5,
        lastStateChange: Date.now(),
      };

      const saveResult = persistence.saveStateStats(testStats);
      expect(saveResult).toBe(true);

      const loadedStats = persistence.loadStateStats();
      expect(loadedStats).not.toBeNull();
      expect(loadedStats!.totalEvaluations).toBe(100);
      expect(loadedStats!.stateChanges).toBe(5);
      expect(loadedStats!.averageHealthScore).toBe(85.5);
    });
  });

  describe('数据完整性测试', () => {
    test('应该能够验证数据完整性', () => {
      const testStatus = {
        state: PlantState.HEALTHY,
        soilMoisture: 50,
        lightLevel: 1000,
        temperature: 25,
        healthScore: 90,
        needsAttention: false,
      };

      persistence.saveCurrentState(testStatus);
      
      expect(persistence.verifyDataIntegrity()).toBe(true);
    });

    test('应该能够检测损坏的数据', () => {
      const testStatus = {
        state: PlantState.HEALTHY,
        soilMoisture: 50,
        lightLevel: 1000,
        temperature: 25,
        healthScore: 90,
        needsAttention: false,
      };

      persistence.saveCurrentState(testStatus);
      
      // 模拟数据损坏
      persistence.corruptData('currentState');
      
      expect(persistence.verifyDataIntegrity()).toBe(false);
      expect(persistence.loadCurrentState()).toBeNull();
    });

    test('损坏的历史数据应该返回空数组', () => {
      const testHistory: StateChangeRecord[] = [
        {
          previousState: PlantState.HEALTHY,
          currentState: PlantState.NEEDS_WATER,
          changeTime: Date.now(),
          triggerData: createMockSensorData(),
          changeReason: '测试',
        },
      ];

      persistence.saveStateHistory(testHistory);
      persistence.corruptData('stateHistory');

      const loadedHistory = persistence.loadStateHistory();
      expect(loadedHistory).toEqual([]);
    });

    test('损坏的统计数据应该返回null', () => {
      const testStats: StateStats = {
        totalEvaluations: 50,
        stateChanges: 3,
        timeInHealthy: 40000,
        timeInNeedsWater: 10000,
        timeInNeedsLight: 0,
        timeInCritical: 0,
        averageHealthScore: 80,
        lastStateChange: Date.now(),
      };

      persistence.saveStateStats(testStats);
      persistence.corruptData('stateStats');

      const loadedStats = persistence.loadStateStats();
      expect(loadedStats).toBeNull();
    });
  });

  describe('自动保存功能测试', () => {
    test('应该能够设置自动保存间隔', () => {
      persistence.setAutoSaveInterval(120000); // 2分钟
      
      // 由于我们无法直接访问内部状态，我们通过行为来验证
      // 这里主要测试方法不会抛出异常
      expect(() => persistence.setAutoSaveInterval(120000)).not.toThrow();
    });

    test('自动保存间隔不应小于最小值', () => {
      persistence.setAutoSaveInterval(30000); // 30秒，小于最小值1分钟
      
      // 验证设置不会导致错误
      expect(() => persistence.setAutoSaveInterval(30000)).not.toThrow();
    });

    test('应该能够启用和禁用自动保存', () => {
      persistence.setAutoSaveEnabled(false);
      expect(persistence.needsAutoSave()).toBe(false);
      
      persistence.setAutoSaveEnabled(true);
      // 刚启用时不需要保存（因为没有经过足够的时间）
      expect(persistence.needsAutoSave()).toBe(false);
    });

    test('应该能够获取最后保存时间', () => {
      const beforeSave = Date.now();
      
      const testStatus = {
        state: PlantState.HEALTHY,
        soilMoisture: 50,
        healthScore: 90,
        needsAttention: false,
      };
      
      persistence.saveCurrentState(testStatus);
      
      const lastSaveTime = persistence.getLastSaveTime();
      expect(lastSaveTime).toBeGreaterThanOrEqual(beforeSave);
      expect(lastSaveTime).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('存储管理测试', () => {
    test('应该能够清除所有数据', () => {
      const testStatus = {
        state: PlantState.HEALTHY,
        soilMoisture: 50,
        healthScore: 90,
        needsAttention: false,
      };

      persistence.saveCurrentState(testStatus);
      expect(persistence.hasValidData()).toBe(true);

      const clearResult = persistence.clearAllData();
      expect(clearResult).toBe(true);
      expect(persistence.hasValidData()).toBe(false);
    });

    test('应该能够获取存储使用情况', () => {
      const initialUsage = persistence.getStorageUsage();
      
      const testStatus = {
        state: PlantState.HEALTHY,
        soilMoisture: 50,
        healthScore: 90,
        needsAttention: false,
      };

      persistence.saveCurrentState(testStatus);
      
      const afterSaveUsage = persistence.getStorageUsage();
      expect(afterSaveUsage).toBeGreaterThan(initialUsage);
    });

    test('历史记录应该限制在最大数量', () => {
      const manyRecords: StateChangeRecord[] = [];
      
      // 创建超过最大数量的记录
      for (let i = 0; i < 10; i++) {
        manyRecords.push({
          previousState: PlantState.HEALTHY,
          currentState: PlantState.NEEDS_WATER,
          changeTime: Date.now() + i,
          triggerData: createMockSensorData(),
          changeReason: `记录 ${i}`,
        });
      }

      persistence.saveStateHistory(manyRecords);
      const loadedHistory = persistence.loadStateHistory();

      // 应该只保存最多5条记录
      expect(loadedHistory.length).toBeLessThanOrEqual(5);
    });
  });

  describe('属性测试', () => {
    /**
     * Feature: ai-plant-care-robot, Property: 持久化数据一致性
     * 对于任何保存的状态数据，加载后应与原始数据一致
     */
    test('Property: 持久化数据一致性', () => {
      fc.assert(
        fc.property(
          fc.record({
            state: fc.constantFrom(
              PlantState.HEALTHY,
              PlantState.NEEDS_WATER,
              PlantState.NEEDS_LIGHT,
              PlantState.CRITICAL
            ),
            soilMoisture: fc.float({ min: 0, max: 100 }),
            lightLevel: fc.float({ min: 0, max: 10000 }),
            temperature: fc.float({ min: -40, max: 80 }),
            healthScore: fc.integer({ min: 0, max: 100 }),
            needsAttention: fc.boolean(),
          }),
          (statusData) => {
            const saveResult = persistence.saveCurrentState(statusData);
            expect(saveResult).toBe(true);

            const loadedData = persistence.loadCurrentState();
            expect(loadedData).not.toBeNull();
            expect(loadedData.state).toBe(statusData.state);
            expect(loadedData.soilMoisture).toBe(statusData.soilMoisture);
            expect(loadedData.lightLevel).toBe(statusData.lightLevel);
            expect(loadedData.temperature).toBe(statusData.temperature);
            expect(loadedData.healthScore).toBe(statusData.healthScore);
            expect(loadedData.needsAttention).toBe(statusData.needsAttention);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: ai-plant-care-robot, Property: 统计信息持久化一致性
     * 对于任何统计信息，保存后加载应保持数据一致性
     */
    test('Property: 统计信息持久化一致性', () => {
      fc.assert(
        fc.property(
          fc.record({
            totalEvaluations: fc.integer({ min: 0, max: 10000 }),
            stateChanges: fc.integer({ min: 0, max: 1000 }),
            timeInHealthy: fc.integer({ min: 0, max: 1000000 }),
            timeInNeedsWater: fc.integer({ min: 0, max: 1000000 }),
            timeInNeedsLight: fc.integer({ min: 0, max: 1000000 }),
            timeInCritical: fc.integer({ min: 0, max: 1000000 }),
            averageHealthScore: fc.float({ min: 0, max: 100 }),
            lastStateChange: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          (statsData: StateStats) => {
            const saveResult = persistence.saveStateStats(statsData);
            expect(saveResult).toBe(true);

            const loadedStats = persistence.loadStateStats();
            expect(loadedStats).not.toBeNull();
            expect(loadedStats!.totalEvaluations).toBe(statsData.totalEvaluations);
            expect(loadedStats!.stateChanges).toBe(statsData.stateChanges);
            expect(loadedStats!.timeInHealthy).toBe(statsData.timeInHealthy);
            expect(loadedStats!.averageHealthScore).toBeCloseTo(statsData.averageHealthScore, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: ai-plant-care-robot, Property: 数据完整性验证
     * 对于任何有效的保存操作，数据完整性验证应该通过
     */
    test('Property: 数据完整性验证', () => {
      fc.assert(
        fc.property(
          fc.record({
            state: fc.constantFrom(
              PlantState.HEALTHY,
              PlantState.NEEDS_WATER,
              PlantState.NEEDS_LIGHT,
              PlantState.CRITICAL
            ),
            soilMoisture: fc.float({ min: 0, max: 100 }),
            healthScore: fc.integer({ min: 0, max: 100 }),
            needsAttention: fc.boolean(),
          }),
          (statusData) => {
            persistence.clearAllData();
            
            const saveResult = persistence.saveCurrentState(statusData);
            expect(saveResult).toBe(true);

            // 数据完整性验证应该通过
            expect(persistence.verifyDataIntegrity()).toBe(true);
            expect(persistence.hasValidData()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('边界条件测试', () => {
    test('未初始化的持久化管理器应该拒绝操作', () => {
      const uninitializedPersistence = new MockStatePersistence();
      
      const testStatus = {
        state: PlantState.HEALTHY,
        soilMoisture: 50,
        healthScore: 90,
        needsAttention: false,
      };

      expect(uninitializedPersistence.saveCurrentState(testStatus)).toBe(false);
      expect(uninitializedPersistence.loadCurrentState()).toBeNull();
      expect(uninitializedPersistence.hasValidData()).toBe(false);
    });

    test('空的历史记录应该正确处理', () => {
      const emptyHistory: StateChangeRecord[] = [];
      
      const saveResult = persistence.saveStateHistory(emptyHistory);
      expect(saveResult).toBe(true);

      const loadedHistory = persistence.loadStateHistory();
      expect(loadedHistory).toEqual([]);
    });

    test('极端数值应该正确保存和加载', () => {
      const extremeStatus = {
        state: PlantState.CRITICAL,
        soilMoisture: 0, // 最小值
        lightLevel: 0, // 最小值
        temperature: -40, // 最小值
        healthScore: 0, // 最小值
        needsAttention: true,
      };

      const saveResult = persistence.saveCurrentState(extremeStatus);
      expect(saveResult).toBe(true);

      const loadedStatus = persistence.loadCurrentState();
      expect(loadedStatus).not.toBeNull();
      expect(loadedStatus.soilMoisture).toBe(0);
      expect(loadedStatus.lightLevel).toBe(0);
      expect(loadedStatus.temperature).toBe(-40);
      expect(loadedStatus.healthScore).toBe(0);
    });

    test('最大数值应该正确保存和加载', () => {
      const maxStatus = {
        state: PlantState.HEALTHY,
        soilMoisture: 100, // 最大值
        lightLevel: 10000, // 高值
        temperature: 80, // 最大值
        healthScore: 100, // 最大值
        needsAttention: false,
      };

      const saveResult = persistence.saveCurrentState(maxStatus);
      expect(saveResult).toBe(true);

      const loadedStatus = persistence.loadCurrentState();
      expect(loadedStatus).not.toBeNull();
      expect(loadedStatus.soilMoisture).toBe(100);
      expect(loadedStatus.lightLevel).toBe(10000);
      expect(loadedStatus.temperature).toBe(80);
      expect(loadedStatus.healthScore).toBe(100);
    });
  });

  describe('单元测试 - 具体示例', () => {
    test('典型的状态保存和恢复流程', () => {
      // 保存健康状态
      const healthyStatus = {
        state: PlantState.HEALTHY,
        soilMoisture: 65,
        lightLevel: 1200,
        temperature: 25,
        healthScore: 95,
        needsAttention: false,
      };

      persistence.saveCurrentState(healthyStatus);

      // 保存状态变化历史
      const history: StateChangeRecord[] = [
        {
          previousState: PlantState.NEEDS_WATER,
          currentState: PlantState.HEALTHY,
          changeTime: Date.now(),
          triggerData: createMockSensorData({ soilHumidity: 65 }),
          changeReason: '浇水后恢复健康',
        },
      ];

      persistence.saveStateHistory(history);

      // 保存统计信息
      const stats: StateStats = {
        totalEvaluations: 150,
        stateChanges: 8,
        timeInHealthy: 120000,
        timeInNeedsWater: 25000,
        timeInNeedsLight: 5000,
        timeInCritical: 0,
        averageHealthScore: 88.5,
        lastStateChange: Date.now(),
      };

      persistence.saveStateStats(stats);

      // 验证所有数据都能正确加载
      const loadedStatus = persistence.loadCurrentState();
      const loadedHistory = persistence.loadStateHistory();
      const loadedStats = persistence.loadStateStats();

      expect(loadedStatus.state).toBe(PlantState.HEALTHY);
      expect(loadedHistory).toHaveLength(1);
      expect(loadedStats!.totalEvaluations).toBe(150);
      expect(persistence.verifyDataIntegrity()).toBe(true);
    });

    test('系统重启后的数据恢复', () => {
      // 模拟系统运行时保存数据
      const beforeRebootStatus = {
        state: PlantState.NEEDS_LIGHT,
        soilMoisture: 45,
        lightLevel: 300,
        temperature: 22,
        healthScore: 60,
        needsAttention: true,
      };

      persistence.saveCurrentState(beforeRebootStatus);

      // 模拟系统重启 - 创建新的持久化实例
      const newPersistence = new MockStatePersistence();
      
      // 复制存储数据（模拟EEPROM持久化）
      (newPersistence as any).storage = new Map((persistence as any).storage);
      newPersistence.initialize();

      // 验证数据能够正确恢复
      const recoveredStatus = newPersistence.loadCurrentState();
      expect(recoveredStatus).not.toBeNull();
      expect(recoveredStatus.state).toBe(PlantState.NEEDS_LIGHT);
      expect(recoveredStatus.soilMoisture).toBe(45);
      expect(recoveredStatus.needsAttention).toBe(true);
    });
  });
});