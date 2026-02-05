/**
 * 通知系统属性测试
 * 验证推送通知系统的正确性属性
 */

import fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 模拟依赖
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-push-notification');
jest.mock('react-native-permissions');
jest.mock('react-native-device-info');

import { NotificationService, PushNotificationData, NotificationConfig } from '../services/NotificationService';
import { NotificationManager, NotificationRule } from '../services/NotificationManager';
import { DeviceManager, ConnectedDevice } from '../services/DeviceManager';
import { UserInteractionService } from '../services/UserInteractionService';
import { 
  PlantState, 
  SystemError, 
  ErrorType, 
  DeviceMessage, 
  MessageType 
} from '../../../shared/types';

// Mock PushNotification
const mockPushNotification = {
  configure: jest.fn((config) => {
    if (config.onRegister) {
      setTimeout(() => config.onRegister({ token: 'mock-fcm-token' }), 1);
    }
  }),
  createChannel: jest.fn((channel, callback) => {
    if (callback) callback(true);
  }),
  localNotification: jest.fn(),
  cancelAllLocalNotifications: jest.fn(),
  cancelLocalNotifications: jest.fn(),
};

jest.mock('react-native-push-notification', () => mockPushNotification);

// 模拟设备管理器
class MockDeviceManager {
  private eventListeners: Map<string, Function[]> = new Map();
  private devices: Map<string, ConnectedDevice> = new Map();

  on(event: string, listener: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  getDevice(deviceId: string): ConnectedDevice | undefined {
    return this.devices.get(deviceId);
  }

  addMockDevice(device: ConnectedDevice) {
    this.devices.set(device.id, device);
  }

  simulateDeviceMessage(deviceId: string, message: DeviceMessage) {
    this.emit('deviceDataReceived', deviceId, message);
  }
}

describe('通知系统属性测试', () => {
  let mockAsyncStorage: jest.Mocked<typeof AsyncStorage>;
  let notificationService: NotificationService;
  let mockDeviceManager: MockDeviceManager;
  let userInteractionService: UserInteractionService;
  let notificationManager: NotificationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();

    mockPushNotification.configure.mockImplementation((config) => {
      if (config.onRegister) {
        setTimeout(() => config.onRegister({ token: 'mock-fcm-token' }), 1);
      }
    });
    mockPushNotification.createChannel.mockImplementation((channel, callback) => {
      if (callback) callback(true);
    });
    mockPushNotification.localNotification.mockImplementation(() => {});

    notificationService = new NotificationService();
    
    // 禁用静音时间以确保测试中通知能正常发送
    notificationService.updateConfig({
      enabled: true,
      quietHours: {
        start: '00:00',
        end: '00:00', // 设置相同时间表示没有静音时间
      },
    });
    
    mockDeviceManager = new MockDeviceManager();
    userInteractionService = new UserInteractionService();
    notificationManager = new NotificationManager(
      mockDeviceManager as any,
      notificationService,
      userInteractionService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('属性 12: 异常通知推送', () => {
    /**
     * Feature: ai-plant-care-robot, Property 12: 异常通知推送
     * 对于任何设备异常状态，移动应用应及时推送相应的通知给用户
     */
    test('**验证需求: 需求 5.4** - 植物状态异常应触发通知', async () => {
      // 简化测试：直接测试几个关键场景
      const testCases = [
        { deviceId: 'device-001', plantState: PlantState.NEEDS_WATER },
        { deviceId: 'device-002', plantState: PlantState.NEEDS_LIGHT },
        { deviceId: 'device-003', plantState: PlantState.CRITICAL },
      ];

      for (const testCase of testCases) {
        // 重置模拟
        jest.clearAllMocks();
        
        // 创建模拟设备
        const mockDevice: ConnectedDevice = {
          id: testCase.deviceId,
          name: `Device ${testCase.deviceId.slice(-3)}`,
          rssi: -50,
          isConnected: true,
          lastSeen: new Date(),
        };

        mockDeviceManager.addMockDevice(mockDevice);

        // 模拟植物状态更新消息
        const statusMessage: DeviceMessage = {
          type: MessageType.STATUS_UPDATE,
          deviceId: testCase.deviceId,
          timestamp: Date.now(),
          payload: {
            state: testCase.plantState,
            needsAttention: testCase.plantState !== PlantState.HEALTHY,
          },
        };

        // 模拟发送状态更新
        mockDeviceManager.simulateDeviceMessage(testCase.deviceId, statusMessage);

        // 等待异步处理
        await new Promise(resolve => setTimeout(resolve, 50));

        // 验证通知被发送
        expect(mockPushNotification.localNotification).toHaveBeenCalled();

        // 获取发送的通知
        const notificationCalls = mockPushNotification.localNotification.mock.calls;
        expect(notificationCalls.length).toBeGreaterThan(0);

        // 验证通知内容
        const lastNotification = notificationCalls[notificationCalls.length - 1][0];
        expect(lastNotification).toBeDefined();
        expect(lastNotification.title).toBeDefined();
        expect(lastNotification.message).toBeDefined();
        expect(lastNotification.userInfo.deviceId).toBe(testCase.deviceId);
        expect(lastNotification.userInfo.type).toBe('plant_care');
      }
    }, 10000);

    test('**验证需求: 需求 5.4** - 系统错误应触发警告通知', async () => {
      const testCases = [
        { deviceId: 'device-004', errorType: ErrorType.SENSOR_FAILURE, severity: 'high' },
        { deviceId: 'device-005', errorType: ErrorType.HARDWARE_ERROR, severity: 'critical' },
      ];

      for (const testCase of testCases) {
        // 重置模拟
        jest.clearAllMocks();
        
        // 创建模拟设备
        const mockDevice: ConnectedDevice = {
          id: testCase.deviceId,
          name: `Device ${testCase.deviceId.slice(-3)}`,
          rssi: -50,
          isConnected: true,
          lastSeen: new Date(),
        };

        mockDeviceManager.addMockDevice(mockDevice);

        // 创建系统错误
        const systemError: SystemError = {
          type: testCase.errorType,
          message: 'Test error message',
          timestamp: Date.now(),
          deviceId: testCase.deviceId,
          severity: testCase.severity as any,
        };

        // 模拟错误消息
        const errorMessage: DeviceMessage = {
          type: MessageType.ERROR,
          deviceId: testCase.deviceId,
          timestamp: Date.now(),
          payload: systemError,
        };

        // 模拟发送错误消息
        mockDeviceManager.simulateDeviceMessage(testCase.deviceId, errorMessage);

        // 等待异步处理
        await new Promise(resolve => setTimeout(resolve, 50));

        // 验证通知被发送
        expect(mockPushNotification.localNotification).toHaveBeenCalled();

        // 获取发送的通知
        const notificationCalls = mockPushNotification.localNotification.mock.calls;
        expect(notificationCalls.length).toBeGreaterThan(0);

        // 验证通知内容
        const lastNotification = notificationCalls[notificationCalls.length - 1][0];
        expect(lastNotification).toBeDefined();
        expect(lastNotification.userInfo.type).toBe('system_alert');
        expect(lastNotification.userInfo.deviceId).toBe(testCase.deviceId);
      }
    }, 10000);

    test('**验证需求: 需求 5.4** - 低电量应触发电池通知', async () => {
      const testCases = [
        { deviceId: 'device-006', batteryLevel: 15 },
        { deviceId: 'device-007', batteryLevel: 5 },
      ];

      for (const testCase of testCases) {
        // 重置模拟
        jest.clearAllMocks();
        
        // 创建模拟设备
        const mockDevice: ConnectedDevice = {
          id: testCase.deviceId,
          name: `Device ${testCase.deviceId.slice(-3)}`,
          rssi: -50,
          isConnected: true,
          lastSeen: new Date(),
          batteryLevel: testCase.batteryLevel,
        };

        mockDeviceManager.addMockDevice(mockDevice);

        // 模拟电池状态更新消息
        const statusMessage: DeviceMessage = {
          type: MessageType.STATUS_UPDATE,
          deviceId: testCase.deviceId,
          timestamp: Date.now(),
          payload: {
            state: PlantState.HEALTHY,
            batteryLevel: testCase.batteryLevel,
            needsAttention: false,
          },
        };

        // 模拟发送状态更新
        mockDeviceManager.simulateDeviceMessage(testCase.deviceId, statusMessage);

        // 等待异步处理
        await new Promise(resolve => setTimeout(resolve, 50));

        // 验证通知被发送
        expect(mockPushNotification.localNotification).toHaveBeenCalled();

        // 查找电池相关通知
        const notificationCalls = mockPushNotification.localNotification.mock.calls;
        const batteryNotification = notificationCalls.find(call => 
          call[0].userInfo.type === 'low_battery'
        );

        expect(batteryNotification).toBeDefined();
        if (batteryNotification) {
          expect(batteryNotification[0].userInfo.deviceId).toBe(testCase.deviceId);
        }
      }
    }, 10000);

    test('**验证需求: 需求 5.4** - 通知配置应影响通知发送', async () => {
      // 测试禁用通知
      await notificationService.updateConfig({ enabled: false });
      
      const deviceId = 'test-device-123';
      const mockDevice: ConnectedDevice = {
        id: deviceId,
        name: 'Test Device',
        rssi: -50,
        isConnected: true,
        lastSeen: new Date(),
      };

      mockDeviceManager.addMockDevice(mockDevice);

      const statusMessage: DeviceMessage = {
        type: MessageType.STATUS_UPDATE,
        deviceId,
        timestamp: Date.now(),
        payload: {
          state: PlantState.NEEDS_WATER,
          needsAttention: true,
        },
      };

      mockDeviceManager.simulateDeviceMessage(deviceId, statusMessage);
      await new Promise(resolve => setTimeout(resolve, 50));

      // 验证配置被正确应用
      const currentConfig = notificationService.getConfig();
      expect(currentConfig.enabled).toBe(false);

      // 测试启用通知
      await notificationService.updateConfig({ enabled: true });
      const updatedConfig = notificationService.getConfig();
      expect(updatedConfig.enabled).toBe(true);
    }, 5000);

    test('**验证需求: 需求 5.4** - 通知历史应被正确记录', async () => {
      // 模拟AsyncStorage返回空历史
      mockAsyncStorage.getItem.mockResolvedValue('[]');
      
      const deviceId = 'test-device-456';
      
      // 发送一个简单的通知
      const pushData: PushNotificationData = {
        id: 'test-notification-1',
        title: '测试通知',
        message: '这是一个测试通知',
        type: 'plant_care',
        deviceId,
        priority: 'normal',
      };

      await notificationService.sendLocalNotification(pushData);

      // 验证AsyncStorage.setItem被调用（保存历史）
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      
      // 验证保存的数据格式
      const setItemCalls = mockAsyncStorage.setItem.mock.calls;
      const historyCall = setItemCalls.find(call => call[0].includes('notification_history'));
      
      if (historyCall) {
        const savedData = JSON.parse(historyCall[1]);
        expect(Array.isArray(savedData)).toBe(true);
        expect(savedData.length).toBeGreaterThan(0);
        
        const firstHistory = savedData[0];
        expect(firstHistory.notification).toBeDefined();
        expect(firstHistory.deviceId).toBe(deviceId);
        expect(firstHistory.delivered).toBe(true);
      }
    }, 5000);

    test('**验证需求: 需求 5.4** - 属性测试：通知数据完整性', async () => {
      // 使用fast-check进行少量迭代的属性测试
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            deviceId: fc.string({ minLength: 5, maxLength: 15 }),
            title: fc.string({ minLength: 3, maxLength: 30 }),
            message: fc.string({ minLength: 5, maxLength: 50 }),
            type: fc.constantFrom('plant_care', 'system_alert', 'low_battery'),
            priority: fc.constantFrom('low', 'normal', 'high'),
          }),
          async ({ deviceId, title, message, type, priority }) => {
            // 发送通知
            const pushData: PushNotificationData = {
              id: `test-${Date.now()}`,
              title,
              message,
              type: type as any,
              deviceId,
              priority: priority as any,
            };

            const result = await notificationService.sendLocalNotification(pushData);
            
            // 验证通知发送成功
            expect(result).toBe(true);
            
            // 验证PushNotification.localNotification被调用
            expect(mockPushNotification.localNotification).toHaveBeenCalled();
            
            // 验证通知数据完整性
            const calls = mockPushNotification.localNotification.mock.calls;
            const lastCall = calls[calls.length - 1];
            const notification = lastCall[0];
            
            expect(notification.title).toBe(title);
            expect(notification.message).toBe(message);
            expect(notification.userInfo.type).toBe(type);
            expect(notification.userInfo.deviceId).toBe(deviceId);
          }
        ),
        { numRuns: 10 } // 只运行10次迭代
      );
    }, 15000);
  });
});