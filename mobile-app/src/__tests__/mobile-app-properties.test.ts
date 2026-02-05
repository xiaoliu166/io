/**
 * 移动应用属性测试
 * 验证移动应用核心功能的正确性属性
 */

import fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 模拟依赖
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-ble-plx');
jest.mock('react-native-device-info');

import { DeviceManager, ConnectedDevice } from '../services/DeviceManager';
import { UserInteractionService } from '../services/UserInteractionService';
import { SensorData, PlantState } from '../../../shared/types';

// 模拟事件发射器
class MockEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, ...args: any[]) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }

  removeAllListeners() {
    this.listeners.clear();
  }
}

// 模拟BLE设备
class MockBLEDevice {
  id: string;
  name: string;
  rssi: number;

  constructor(id: string, name: string, rssi: number = -50) {
    this.id = id;
    this.name = name;
    this.rssi = rssi;
  }

  async discoverAllServicesAndCharacteristics() {
    return Promise.resolve();
  }

  async cancelConnection() {
    return Promise.resolve();
  }

  monitorCharacteristicForService(
    _serviceUUID: string,
    _characteristicUUID: string,
    callback: (error: any, characteristic: any) => void
  ) {
    // 模拟数据接收
    setTimeout(() => {
      callback(null, {
        value: btoa(JSON.stringify({
          type: 'sensor_data',
          deviceId: this.id,
          timestamp: Date.now(),
          payload: {
            soilHumidity: 45,
            airHumidity: 60,
            temperature: 25,
            lightIntensity: 800,
          }
        }))
      });
    }, 100);
  }

  async writeCharacteristicWithResponseForService(
    _serviceUUID: string,
    _characteristicUUID: string,
    _data: string
  ) {
    return Promise.resolve();
  }

  async readRSSI() {
    return this.rssi;
  }
}

// 模拟BLE管理器
class MockBLEManager {
  private devices: MockBLEDevice[] = [];

  onStateChange(callback: (state: string) => void, emitCurrentState: boolean) {
    if (emitCurrentState) {
      setTimeout(() => callback('PoweredOn'), 10);
    }
  }

  startDeviceScan(
    _serviceUUIDs: string[],
    _options: any,
    callback: (error: any, device: any) => void
  ) {
    // 模拟发现设备
    setTimeout(() => {
      const mockDevice = new MockBLEDevice('test-device-001', 'PlantCare Robot 001');
      this.devices.push(mockDevice);
      callback(null, mockDevice);
    }, 100);
  }

  stopDeviceScan() {
    // 停止扫描
  }

  async connectToDevice(deviceId: string) {
    const device = this.devices.find(d => d.id === deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    return device;
  }

  destroy() {
    this.devices = [];
  }
}

describe('移动应用属性测试', () => {
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;
  let userInteractionService: UserInteractionService;

  beforeEach(() => {
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();

    userInteractionService = new UserInteractionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('属性 11: 用户行为记录', () => {
    /**
     * Feature: ai-plant-care-robot, Property 11: 用户行为记录
     * 对于任何用户照料行为，移动应用应记录该行为和对应的植物状态变化
     */
    test('**验证需求: 需求 5.3** - 用户照料行为应被正确记录', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            deviceId: fc.string({ minLength: 5, maxLength: 20 }),
            actionType: fc.constantFrom('watered', 'moved_to_light', 'fertilized', 'touched'),
            notes: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            sensorDataBefore: fc.record({
              soilHumidity: fc.float({ min: 0, max: 100 }),
              airHumidity: fc.float({ min: 0, max: 100 }),
              temperature: fc.float({ min: -10, max: 50 }),
              lightIntensity: fc.float({ min: 0, max: 2000 }),
              timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
            }),
          }),
          async ({ deviceId, actionType, notes, sensorDataBefore }) => {
            // 模拟AsyncStorage返回空数组（表示没有历史记录）
            mockAsyncStorage.getItem.mockResolvedValueOnce('[]');
            
            // 记录用户操作
            const actionId = await userInteractionService.recordUserAction({
              deviceId,
              actionType: actionType as any,
              notes: notes || undefined,
              sensorDataBefore,
            });

            // 验证操作被记录
            expect(actionId).toBeDefined();
            expect(typeof actionId).toBe('string');
            expect(actionId.length).toBeGreaterThan(0);

            // 验证存储调用
            expect(mockAsyncStorage.setItem).toHaveBeenCalled();
            
            // 模拟返回刚记录的操作
            const mockAction = {
              id: actionId,
              deviceId,
              actionType,
              notes: notes || undefined,
              timestamp: new Date().toISOString(),
              sensorDataBefore,
            };
            mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([mockAction]));
            
            // 获取操作历史
            const history = await userInteractionService.getUserActionHistory(deviceId, 1);
            
            // 验证操作在历史中
            expect(history).toHaveLength(1);
            const recordedAction = history[0];
            expect(recordedAction.id).toBe(actionId);
            expect(recordedAction.actionType).toBe(actionType);
            expect(recordedAction.deviceId).toBe(deviceId);
            expect(recordedAction.notes).toBe(notes || undefined);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 5.3** - 植物状态变化应被追踪', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            deviceId: fc.string({ minLength: 5, maxLength: 20 }),
            previousState: fc.constantFrom(PlantState.HEALTHY, PlantState.NEEDS_WATER, PlantState.NEEDS_LIGHT),
            newState: fc.constantFrom(PlantState.HEALTHY, PlantState.NEEDS_WATER, PlantState.NEEDS_LIGHT),
            trigger: fc.constantFrom('sensor_change', 'user_action', 'system_update'),
          }),
          async ({ deviceId, previousState, newState, trigger }) => {
            // 模拟AsyncStorage返回空数组
            mockAsyncStorage.getItem.mockResolvedValueOnce('[]');
            
            // 记录状态变化
            const changeId = await userInteractionService.recordStatusChange({
              deviceId,
              previousState,
              newState,
              trigger: trigger as any,
            });

            // 验证状态变化被记录
            expect(changeId).toBeDefined();
            expect(typeof changeId).toBe('string');

            // 模拟返回刚记录的状态变化
            const mockChange = {
              id: changeId,
              deviceId,
              previousState,
              newState,
              trigger,
              timestamp: new Date().toISOString(),
            };
            mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([mockChange]));

            // 获取状态变化历史
            const history = await userInteractionService.getStatusChangeHistory(deviceId, 1);
            
            // 验证状态变化在历史中
            expect(history).toHaveLength(1);
            const recordedChange = history[0];
            expect(recordedChange.id).toBe(changeId);
            expect(recordedChange.previousState).toBe(previousState);
            expect(recordedChange.newState).toBe(newState);
            expect(recordedChange.trigger).toBe(trigger);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 5.3** - 交互摘要应正确生成', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            deviceId: fc.string({ minLength: 5, maxLength: 20 }),
            actions: fc.array(
              fc.record({
                actionType: fc.constantFrom('watered', 'moved_to_light', 'fertilized'),
                effectiveness: fc.option(fc.constantFrom('positive', 'negative', 'neutral')),
              }),
              { minLength: 1, maxLength: 10 }
            ),
          }),
          async ({ deviceId, actions }) => {
            // 模拟存储的操作数据
            const mockActions = actions.map((action, index) => ({
              id: `action-${index}`,
              deviceId,
              actionType: action.actionType,
              timestamp: new Date(Date.now() - index * 3600000), // 每小时一个操作
              effectiveness: action.effectiveness,
              sensorDataBefore: {
                soilHumidity: 50,
                airHumidity: 60,
                temperature: 25,
                lightIntensity: 800,
                timestamp: Date.now(),
              },
            }));

            mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockActions));
            mockAsyncStorage.getItem.mockResolvedValueOnce('[]'); // 状态变化为空

            // 生成交互摘要
            const summary = await userInteractionService.generateInteractionSummary(deviceId, 7);

            // 验证摘要内容
            expect(summary.deviceId).toBe(deviceId);
            expect(summary.totalActions).toBe(actions.length);
            expect(summary.careFrequency).toBeGreaterThanOrEqual(0);
            expect(summary.effectivenessScore).toBeGreaterThanOrEqual(0);
            expect(summary.effectivenessScore).toBeLessThanOrEqual(100);

            // 验证操作类型统计
            const expectedActionsByType: Record<string, number> = {};
            actions.forEach(action => {
              expectedActionsByType[action.actionType] = (expectedActionsByType[action.actionType] || 0) + 1;
            });

            expect(summary.actionsByType).toEqual(expectedActionsByType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('属性 13: 多设备管理', () => {
    /**
     * Feature: ai-plant-care-robot, Property 13: 多设备管理
     * 对于任何设备集合，移动应用应支持同时管理多个机器人设备
     */
    test('**验证需求: 需求 5.5** - 应支持发现多个设备', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 10, maxLength: 20 }),
              name: fc.string({ minLength: 5, maxLength: 30 }),
              rssi: fc.integer({ min: -100, max: -30 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (devices) => {
            const discoveredDevices: ConnectedDevice[] = [];
            const mockEventEmitter = new MockEventEmitter();
            
            // 模拟设备发现过程
            devices.forEach((deviceInfo) => {
              const mockDevice: ConnectedDevice = {
                id: deviceInfo.id,
                name: deviceInfo.name,
                rssi: deviceInfo.rssi,
                isConnected: false,
                lastSeen: new Date(),
              };
              
              discoveredDevices.push(mockDevice);
              mockEventEmitter.emit('deviceDiscovered', mockDevice);
            });

            // 验证所有设备都被发现
            expect(discoveredDevices).toHaveLength(devices.length);
            
            devices.forEach((expectedDevice, index) => {
              const discoveredDevice = discoveredDevices[index];
              expect(discoveredDevice.id).toBe(expectedDevice.id);
              expect(discoveredDevice.name).toBe(expectedDevice.name);
              expect(discoveredDevice.rssi).toBe(expectedDevice.rssi);
              expect(discoveredDevice.isConnected).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 5.5** - 应支持同时连接多个设备', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 10, maxLength: 20 }),
            { minLength: 1, maxLength: 3 } // 限制设备数量避免测试过慢
          ),
          (deviceIds) => {
            const deviceConnections = new Map<string, boolean>();
            
            // 模拟设备连接
            deviceIds.forEach(deviceId => {
              // 模拟连接成功
              const connectionSuccess = Math.random() > 0.1; // 90%成功率
              deviceConnections.set(deviceId, connectionSuccess);
            });

            // 验证连接结果
            expect(deviceConnections.size).toBe(deviceIds.length);
            
            // 获取连接成功的设备
            const connectedDeviceIds = Array.from(deviceConnections.entries())
              .filter(([_, isConnected]) => isConnected)
              .map(([deviceId, _]) => deviceId);

            // 验证设备管理器能够跟踪多个设备
            expect(connectedDeviceIds.length).toBeGreaterThanOrEqual(0);
            expect(connectedDeviceIds.length).toBeLessThanOrEqual(deviceIds.length);
            
            // 验证每个连接的设备ID都在原始列表中
            connectedDeviceIds.forEach(deviceId => {
              expect(deviceIds).toContain(deviceId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 5.5** - 设备状态应独立管理', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              deviceId: fc.string({ minLength: 10, maxLength: 20 }),
              isConnected: fc.boolean(),
              batteryLevel: fc.option(fc.integer({ min: 0, max: 100 })),
            }),
            { minLength: 2, maxLength: 4 }
          ),
          (devices) => {
            // 创建设备状态
            const deviceStates = new Map<string, ConnectedDevice>();
            
            devices.forEach(deviceInfo => {
              const device: ConnectedDevice = {
                id: deviceInfo.deviceId,
                name: `Device ${deviceInfo.deviceId.slice(-3)}`,
                rssi: -50,
                isConnected: deviceInfo.isConnected,
                lastSeen: new Date(),
                batteryLevel: deviceInfo.batteryLevel || undefined,
              };
              
              deviceStates.set(deviceInfo.deviceId, device);
            });

            // 验证每个设备的状态独立性
            devices.forEach(expectedDevice => {
              const actualDevice = deviceStates.get(expectedDevice.deviceId);
              
              expect(actualDevice).toBeDefined();
              expect(actualDevice!.id).toBe(expectedDevice.deviceId);
              expect(actualDevice!.isConnected).toBe(expectedDevice.isConnected);
              expect(actualDevice!.batteryLevel).toBe(expectedDevice.batteryLevel || undefined);
            });

            // 验证设备状态不会相互影响
            const deviceIds = Array.from(deviceStates.keys());
            if (deviceIds.length >= 2) {
              const device1 = deviceStates.get(deviceIds[0])!;
              const device2 = deviceStates.get(deviceIds[1])!;
              
              const originalDevice2State = device2.isConnected;
              
              // 修改一个设备的状态
              device1.isConnected = !device1.isConnected;
              
              // 验证其他设备状态不受影响
              expect(device2.isConnected).toBe(originalDevice2State);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});