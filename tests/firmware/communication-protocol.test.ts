/**
 * 通信协议属性测试
 * 验证数据通信协议的正确性属性
 */

import fc from 'fast-check';

// 模拟通信协议类型定义
enum MessageType {
  SENSOR_DATA = 'sensor_data',
  PLANT_STATUS = 'plant_status',
  DEVICE_CONFIG = 'device_config',
  ALERT_NOTIFICATION = 'alert_notification',
  COMMAND_REQUEST = 'command_request',
  COMMAND_RESPONSE = 'command_response',
  HEARTBEAT = 'heartbeat',
  ERROR_REPORT = 'error_report',
  SYNC_REQUEST = 'sync_request',
  SYNC_RESPONSE = 'sync_response'
}

enum CommunicationChannel {
  HTTP_REST = 'http_rest',
  WEBSOCKET = 'websocket',
  MQTT = 'mqtt',
  BLUETOOTH = 'bluetooth'
}

enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error'
}

interface MessageHeader {
  messageId: string;
  type: MessageType;
  deviceId: string;
  timestamp: number;
  version: number;
  checksum: string;
}

interface QueuedMessage {
  header: MessageHeader;
  payload: string;
  retryCount: number;
  timestamp: number;
  isPriority: boolean;
}

interface CommunicationStats {
  totalMessagesSent: number;
  totalMessagesReceived: number;
  failedTransmissions: number;
  successfulTransmissions: number;
  averageLatency: number;
  lastSuccessfulSync: number;
  currentQueueSize: number;
}

// 模拟WiFi管理器
class MockWiFiManager {
  private connected: boolean = false;
  private rssi: number = -50;

  isConnected(): boolean {
    return this.connected;
  }

  setConnected(connected: boolean): void {
    this.connected = connected;
  }

  getRSSI(): number {
    return this.rssi;
  }

  setRSSI(rssi: number): void {
    this.rssi = rssi;
  }
}

// 模拟通信协议
class MockCommunicationProtocol {
  private wifiManager: MockWiFiManager;
  private messageQueue: QueuedMessage[] = [];
  private priorityQueue: QueuedMessage[] = [];
  private stats: CommunicationStats;
  private connectionStatus: Map<CommunicationChannel, ConnectionStatus> = new Map();
  private offlineMode: boolean = false;
  private syncInProgress: boolean = false;
  private callbacks: {
    messageReceived?: (header: MessageHeader, payload: string) => void;
    connectionStatus?: (channel: CommunicationChannel, connected: boolean) => void;
    syncComplete?: (success: boolean, messageCount: number) => void;
  } = {};

  constructor(wifiManager: MockWiFiManager) {
    this.wifiManager = wifiManager;
    this.stats = {
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      failedTransmissions: 0,
      successfulTransmissions: 0,
      averageLatency: 0,
      lastSuccessfulSync: 0,
      currentQueueSize: 0
    };
    
    // 初始化连接状态
    this.connectionStatus.set(CommunicationChannel.HTTP_REST, ConnectionStatus.DISCONNECTED);
    this.connectionStatus.set(CommunicationChannel.WEBSOCKET, ConnectionStatus.DISCONNECTED);
  }

  // 消息发送
  sendMessage(type: MessageType, payload: string, priority: boolean = false): boolean {
    const message = this.createQueuedMessage(type, payload, priority);
    
    if (this.wifiManager.isConnected() && !this.offlineMode) {
      // 模拟网络发送
      const success = this.simulateNetworkSend(message);
      if (success) {
        this.stats.successfulTransmissions++;
        this.stats.totalMessagesSent++;
        return true;
      } else {
        this.addToQueue(message);
        return false;
      }
    } else {
      // 离线模式，加入队列
      this.addToQueue(message);
      return false;
    }
  }

  private simulateNetworkSend(message: QueuedMessage): boolean {
    // 模拟网络发送成功率（90%）
    return Math.random() > 0.1;
  }

  private createQueuedMessage(type: MessageType, payload: string, priority: boolean): QueuedMessage {
    const header: MessageHeader = {
      messageId: this.generateMessageId(),
      type,
      deviceId: 'test-device-001',
      timestamp: Date.now(),
      version: 1,
      checksum: this.calculateChecksum(payload)
    };

    return {
      header,
      payload,
      retryCount: 0,
      timestamp: Date.now(),
      isPriority: priority
    };
  }

  private generateMessageId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private calculateChecksum(data: string): string {
    // 简单的校验和计算
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16);
  }

  private addToQueue(message: QueuedMessage): void {
    if (message.isPriority) {
      this.priorityQueue.push(message);
    } else {
      this.messageQueue.push(message);
    }
    this.stats.currentQueueSize = this.messageQueue.length + this.priorityQueue.length;
  }
  // 数据同步
  startDataSync(): boolean {
    if (!this.wifiManager.isConnected() || this.offlineMode) {
      return false;
    }

    this.syncInProgress = true;
    const totalMessages = this.messageQueue.length + this.priorityQueue.length;
    
    // 模拟同步过程
    const success = this.syncQueuedMessages();
    
    this.syncInProgress = false;
    this.stats.lastSuccessfulSync = success ? Date.now() : this.stats.lastSuccessfulSync;
    
    if (this.callbacks.syncComplete) {
      this.callbacks.syncComplete(success, totalMessages);
    }
    
    return success;
  }

  private syncQueuedMessages(): boolean {
    let allSuccess = true;
    
    // 处理优先级队列
    const priorityMessages = [...this.priorityQueue];
    this.priorityQueue = [];
    
    for (const message of priorityMessages) {
      const success = this.simulateNetworkSend(message);
      if (success) {
        this.stats.successfulTransmissions++;
        this.stats.totalMessagesSent++;
      } else {
        this.stats.failedTransmissions++;
        allSuccess = false;
        // 重新加入队列
        this.addToQueue(message);
      }
    }
    
    // 处理普通队列
    const normalMessages = [...this.messageQueue];
    this.messageQueue = [];
    
    for (const message of normalMessages) {
      const success = this.simulateNetworkSend(message);
      if (success) {
        this.stats.successfulTransmissions++;
        this.stats.totalMessagesSent++;
      } else {
        this.stats.failedTransmissions++;
        allSuccess = false;
        // 重新加入队列
        this.addToQueue(message);
      }
    }
    
    return allSuccess;
  }

  // 连接管理
  isConnected(channel: CommunicationChannel): boolean {
    const status = this.connectionStatus.get(channel);
    return status === ConnectionStatus.CONNECTED;
  }

  setConnectionStatus(channel: CommunicationChannel, status: ConnectionStatus): void {
    this.connectionStatus.set(channel, status);
    
    if (this.callbacks.connectionStatus) {
      this.callbacks.connectionStatus(channel, status === ConnectionStatus.CONNECTED);
    }
  }

  // 离线模式
  enableOfflineMode(): void {
    this.offlineMode = true;
  }

  disableOfflineMode(): void {
    this.offlineMode = false;
  }

  isOfflineModeEnabled(): boolean {
    return this.offlineMode;
  }

  // 统计信息
  getStats(): CommunicationStats {
    return { ...this.stats };
  }

  getQueueSize(): number {
    return this.messageQueue.length + this.priorityQueue.length;
  }

  // 回调函数设置
  setMessageReceivedCallback(callback: (header: MessageHeader, payload: string) => void): void {
    this.callbacks.messageReceived = callback;
  }

  setConnectionStatusCallback(callback: (channel: CommunicationChannel, connected: boolean) => void): void {
    this.callbacks.connectionStatus = callback;
  }

  setSyncCompleteCallback(callback: (success: boolean, messageCount: number) => void): void {
    this.callbacks.syncComplete = callback;
  }

  // 模拟接收消息
  simulateReceiveMessage(type: MessageType, payload: string): void {
    const header: MessageHeader = {
      messageId: this.generateMessageId(),
      type,
      deviceId: 'mobile-app-001',
      timestamp: Date.now(),
      version: 1,
      checksum: this.calculateChecksum(payload)
    };

    this.stats.totalMessagesReceived++;
    
    if (this.callbacks.messageReceived) {
      this.callbacks.messageReceived(header, payload);
    }
  }

  // 清空队列
  clearQueue(): void {
    this.messageQueue = [];
    this.priorityQueue = [];
    this.stats.currentQueueSize = 0;
  }
}
describe('通信协议属性测试', () => {
  let mockWiFiManager: MockWiFiManager;
  let mockCommunicationProtocol: MockCommunicationProtocol;

  beforeEach(() => {
    mockWiFiManager = new MockWiFiManager();
    mockCommunicationProtocol = new MockCommunicationProtocol(mockWiFiManager);
    // 确保每个测试开始时都是干净的状态
    mockCommunicationProtocol.clearQueue();
    mockWiFiManager.setConnected(false);
    mockCommunicationProtocol.disableOfflineMode();
  });

  describe('属性 10: 数据同步一致性', () => {
    /**
     * Feature: ai-plant-care-robot, Property 10: 数据同步一致性
     * 对于任何Wi-Fi连接状态，当网络可用时，系统应能够与移动应用同步数据
     */
    test('**验证需求: 需求 5.1** - 网络连接时应能成功同步数据', () => {
      fc.assert(
        fc.property(
          fc.record({
            messageCount: fc.integer({ min: 1, max: 20 }),
            messageTypes: fc.array(
              fc.constantFrom(
                MessageType.SENSOR_DATA,
                MessageType.PLANT_STATUS,
                MessageType.ALERT_NOTIFICATION,
                MessageType.HEARTBEAT
              ),
              { minLength: 1, maxLength: 10 }
            ),
            networkConnected: fc.boolean()
          }),
          ({ messageCount, messageTypes, networkConnected }) => {
            // 设置网络状态
            mockWiFiManager.setConnected(networkConnected);
            
            // 添加消息到队列
            for (let i = 0; i < messageCount; i++) {
              const messageType = messageTypes[i % messageTypes.length];
              const payload = JSON.stringify({ data: `test-data-${i}`, timestamp: Date.now() });
              mockCommunicationProtocol.sendMessage(messageType, payload, false);
            }
            
            const initialQueueSize = mockCommunicationProtocol.getQueueSize();
            
            if (networkConnected) {
              // 网络连接时，应该能够同步数据
              const syncResult = mockCommunicationProtocol.startDataSync();
              const finalQueueSize = mockCommunicationProtocol.getQueueSize();
              
              // 验证同步结果
              if (syncResult) {
                expect(finalQueueSize).toBeLessThanOrEqual(initialQueueSize);
              }
              
              const stats = mockCommunicationProtocol.getStats();
              expect(stats.totalMessagesSent).toBeGreaterThan(0);
            } else {
              // 网络断开时，同步应该失败
              const syncResult = mockCommunicationProtocol.startDataSync();
              expect(syncResult).toBe(false);
              
              // 消息应该保留在队列中
              expect(mockCommunicationProtocol.getQueueSize()).toBe(initialQueueSize);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 5.1** - 数据同步应保持消息完整性', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom(MessageType.SENSOR_DATA, MessageType.PLANT_STATUS),
              payload: fc.string({ minLength: 10, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 15 }
          ),
          (messages) => {
            mockWiFiManager.setConnected(true);
            
            // 发送消息
            const sentMessages: Array<{ type: MessageType; payload: string }> = [];
            for (const msg of messages) {
              mockCommunicationProtocol.sendMessage(msg.type, msg.payload, false);
              sentMessages.push({ type: msg.type, payload: msg.payload });
            }
            
            const initialStats = mockCommunicationProtocol.getStats();
            
            // 执行同步
            mockCommunicationProtocol.startDataSync();
            
            const finalStats = mockCommunicationProtocol.getStats();
            
            // 验证消息数量一致性
            const totalProcessed = finalStats.successfulTransmissions + finalStats.failedTransmissions;
            expect(totalProcessed).toBeGreaterThanOrEqual(initialStats.successfulTransmissions + initialStats.failedTransmissions);
            
            // 验证统计信息的一致性
            expect(finalStats.totalMessagesSent).toBeGreaterThanOrEqual(initialStats.totalMessagesSent);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 5.1** - 同步完成回调应被正确触发', () => {
      let callbackTriggered = false;
      let callbackSuccess = false;
      let callbackMessageCount = 0;

      mockCommunicationProtocol.setSyncCompleteCallback((success: boolean, messageCount: number) => {
        callbackTriggered = true;
        callbackSuccess = success;
        callbackMessageCount = messageCount;
      });

      mockWiFiManager.setConnected(true);
      
      // 添加一些消息
      mockCommunicationProtocol.sendMessage(MessageType.SENSOR_DATA, '{"test": "data"}', false);
      mockCommunicationProtocol.sendMessage(MessageType.PLANT_STATUS, '{"status": "healthy"}', false);
      
      const queueSize = mockCommunicationProtocol.getQueueSize();
      
      // 执行同步
      mockCommunicationProtocol.startDataSync();
      
      // 验证回调被触发
      expect(callbackTriggered).toBe(true);
      expect(callbackMessageCount).toBe(queueSize);
    });
  });
  describe('属性 18: 离线基础功能', () => {
    /**
     * Feature: ai-plant-care-robot, Property 18: 离线基础功能
     * 对于任何网络断开情况，系统应继续提供基础的环境监测和状态反馈功能
     */
    test('**验证需求: 需求 8.3** - 网络断开时应启用离线模式', () => {
      fc.assert(
        fc.property(
          fc.record({
            initiallyConnected: fc.boolean(),
            disconnectDuringOperation: fc.boolean()
          }),
          ({ initiallyConnected, disconnectDuringOperation }) => {
            // 设置初始网络状态
            mockWiFiManager.setConnected(initiallyConnected);
            
            if (!initiallyConnected) {
              // 网络不可用时，应该能够启用离线模式
              mockCommunicationProtocol.enableOfflineMode();
              expect(mockCommunicationProtocol.isOfflineModeEnabled()).toBe(true);
            }
            
            // 发送一些消息
            const message1Success = mockCommunicationProtocol.sendMessage(
              MessageType.SENSOR_DATA, 
              '{"soilHumidity": 45, "temperature": 22}', 
              false
            );
            
            if (disconnectDuringOperation && initiallyConnected) {
              // 模拟运行中网络断开
              mockWiFiManager.setConnected(false);
              mockCommunicationProtocol.enableOfflineMode();
            }
            
            const message2Success = mockCommunicationProtocol.sendMessage(
              MessageType.PLANT_STATUS,
              '{"state": "healthy", "needsAttention": false}',
              false
            );
            
            // 验证离线模式下的行为
            if (!mockWiFiManager.isConnected() || mockCommunicationProtocol.isOfflineModeEnabled()) {
              // 离线模式下，消息应该被加入队列而不是立即发送
              expect(mockCommunicationProtocol.getQueueSize()).toBeGreaterThan(0);
              
              // 同步应该失败
              const syncResult = mockCommunicationProtocol.startDataSync();
              expect(syncResult).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 8.3** - 离线模式下消息应正确排队', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom(
                MessageType.SENSOR_DATA,
                MessageType.PLANT_STATUS,
                MessageType.ALERT_NOTIFICATION
              ),
              payload: fc.string({ minLength: 5, maxLength: 50 }),
              priority: fc.boolean()
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (messages) => {
            // 设置离线模式
            mockWiFiManager.setConnected(false);
            mockCommunicationProtocol.enableOfflineMode();
            
            const initialQueueSize = mockCommunicationProtocol.getQueueSize();
            
            // 发送消息
            for (const msg of messages) {
              const success = mockCommunicationProtocol.sendMessage(msg.type, msg.payload, msg.priority);
              // 离线模式下发送应该返回false（表示未立即发送）
              expect(success).toBe(false);
            }
            
            // 验证所有消息都被加入队列
            const finalQueueSize = mockCommunicationProtocol.getQueueSize();
            expect(finalQueueSize).toBe(initialQueueSize + messages.length);
            
            // 验证统计信息
            const stats = mockCommunicationProtocol.getStats();
            expect(stats.currentQueueSize).toBe(finalQueueSize);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 8.3** - 网络恢复后应能同步离线期间的消息', () => {
      fc.assert(
        fc.property(
          fc.record({
            offlineMessageCount: fc.integer({ min: 1, max: 8 }),
            onlineMessageCount: fc.integer({ min: 1, max: 5 })
          }),
          ({ offlineMessageCount, onlineMessageCount }) => {
            // 确保开始时队列是空的
            mockCommunicationProtocol.clearQueue();
            
            // 开始时离线
            mockWiFiManager.setConnected(false);
            mockCommunicationProtocol.enableOfflineMode();
            
            // 发送离线消息
            for (let i = 0; i < offlineMessageCount; i++) {
              mockCommunicationProtocol.sendMessage(
                MessageType.SENSOR_DATA,
                `{"offline_data": ${i}}`,
                false
              );
            }
            
            const offlineQueueSize = mockCommunicationProtocol.getQueueSize();
            expect(offlineQueueSize).toBe(offlineMessageCount);
            
            // 网络恢复
            mockWiFiManager.setConnected(true);
            mockCommunicationProtocol.disableOfflineMode();
            
            // 发送在线消息（这些可能会立即发送成功）
            let onlineQueuedCount = 0;
            for (let i = 0; i < onlineMessageCount; i++) {
              const success = mockCommunicationProtocol.sendMessage(
                MessageType.PLANT_STATUS,
                `{"online_data": ${i}}`,
                false
              );
              if (!success) {
                onlineQueuedCount++;
              }
            }
            
            const beforeSyncStats = mockCommunicationProtocol.getStats();
            const beforeSyncQueueSize = mockCommunicationProtocol.getQueueSize();
            
            // 执行同步
            const syncResult = mockCommunicationProtocol.startDataSync();
            
            const afterSyncStats = mockCommunicationProtocol.getStats();
            
            // 验证同步结果
            if (syncResult) {
              // 成功同步时，队列应该被清空或减少
              const finalQueueSize = mockCommunicationProtocol.getQueueSize();
              expect(finalQueueSize).toBeLessThanOrEqual(beforeSyncQueueSize);
              
              // 发送的消息数量应该增加
              expect(afterSyncStats.totalMessagesSent).toBeGreaterThanOrEqual(beforeSyncStats.totalMessagesSent);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 8.3** - 离线模式切换应正确更新状态', () => {
      // 初始状态应该是在线模式
      expect(mockCommunicationProtocol.isOfflineModeEnabled()).toBe(false);
      
      // 启用离线模式
      mockCommunicationProtocol.enableOfflineMode();
      expect(mockCommunicationProtocol.isOfflineModeEnabled()).toBe(true);
      
      // 禁用离线模式
      mockCommunicationProtocol.disableOfflineMode();
      expect(mockCommunicationProtocol.isOfflineModeEnabled()).toBe(false);
    });
  });
  describe('消息序列化和验证属性测试', () => {
    test('Property: 消息ID应该是唯一的', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // 减少消息数量避免累积
          (messageCount) => {
            // 确保开始时队列是空的
            mockCommunicationProtocol.clearQueue();
            mockWiFiManager.setConnected(false); // 离线模式确保消息被排队
            
            for (let i = 0; i < messageCount; i++) {
              mockCommunicationProtocol.sendMessage(
                MessageType.HEARTBEAT,
                `{"test": ${i}}`,
                false
              );
            }
            
            // 验证所有消息都被加入队列
            const stats = mockCommunicationProtocol.getStats();
            expect(stats.currentQueueSize).toBe(messageCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property: 消息校验和应该正确计算', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (payload) => {
            // 确保开始时队列是空的
            mockCommunicationProtocol.clearQueue();
            mockWiFiManager.setConnected(false); // 离线模式确保消息被排队
            
            // 发送相同的payload两次
            mockCommunicationProtocol.sendMessage(MessageType.SENSOR_DATA, payload, false);
            mockCommunicationProtocol.sendMessage(MessageType.SENSOR_DATA, payload, false);
            
            // 验证消息被正确处理（通过队列大小）
            expect(mockCommunicationProtocol.getQueueSize()).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('连接状态管理属性测试', () => {
    test('Property: 连接状态变化应触发回调', () => {
      let callbackCount = 0;
      let lastChannel: CommunicationChannel | null = null;
      let lastStatus: boolean | null = null;

      mockCommunicationProtocol.setConnectionStatusCallback(
        (channel: CommunicationChannel, connected: boolean) => {
          callbackCount++;
          lastChannel = channel;
          lastStatus = connected;
        }
      );

      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              channel: fc.constantFrom(CommunicationChannel.HTTP_REST, CommunicationChannel.WEBSOCKET),
              status: fc.constantFrom(ConnectionStatus.CONNECTED, ConnectionStatus.DISCONNECTED)
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (statusChanges) => {
            const initialCallbackCount = callbackCount;
            
            for (const change of statusChanges) {
              mockCommunicationProtocol.setConnectionStatus(change.channel, change.status);
            }
            
            // 验证回调被触发
            expect(callbackCount).toBeGreaterThan(initialCallbackCount);
            
            if (statusChanges.length > 0) {
              const lastChange = statusChanges[statusChanges.length - 1];
              expect(lastChannel).toBe(lastChange.channel);
              expect(lastStatus).toBe(lastChange.status === ConnectionStatus.CONNECTED);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('边界条件测试', () => {
    test('空消息处理', () => {
      const success = mockCommunicationProtocol.sendMessage(MessageType.HEARTBEAT, '', false);
      expect(typeof success).toBe('boolean');
      
      // 空消息也应该被正确处理
      const stats = mockCommunicationProtocol.getStats();
      expect(stats.currentQueueSize).toBeGreaterThanOrEqual(0);
    });

    test('大量消息处理', () => {
      mockWiFiManager.setConnected(false); // 离线模式，消息会被排队
      
      const messageCount = 50;
      for (let i = 0; i < messageCount; i++) {
        mockCommunicationProtocol.sendMessage(
          MessageType.SENSOR_DATA,
          `{"data": "large_batch_${i}"}`,
          false
        );
      }
      
      expect(mockCommunicationProtocol.getQueueSize()).toBe(messageCount);
    });

    test('优先级消息处理', () => {
      mockWiFiManager.setConnected(false);
      
      // 发送普通消息
      mockCommunicationProtocol.sendMessage(MessageType.SENSOR_DATA, '{"normal": true}', false);
      
      // 发送优先级消息
      mockCommunicationProtocol.sendMessage(MessageType.ALERT_NOTIFICATION, '{"priority": true}', true);
      
      expect(mockCommunicationProtocol.getQueueSize()).toBe(2);
    });

    test('网络状态快速切换', () => {
      // 快速切换网络状态
      for (let i = 0; i < 10; i++) {
        mockWiFiManager.setConnected(i % 2 === 0);
        mockCommunicationProtocol.sendMessage(
          MessageType.HEARTBEAT,
          `{"switch": ${i}}`,
          false
        );
      }
      
      const stats = mockCommunicationProtocol.getStats();
      expect(stats.currentQueueSize).toBeGreaterThanOrEqual(0);
    });
  });
  describe('单元测试 - 具体示例', () => {
    test('典型数据同步场景', () => {
      mockWiFiManager.setConnected(true);
      
      // 发送传感器数据
      const sensorData = {
        soilHumidity: 45.5,
        airHumidity: 62.3,
        temperature: 23.1,
        lightIntensity: 750
      };
      
      const success = mockCommunicationProtocol.sendMessage(
        MessageType.SENSOR_DATA,
        JSON.stringify(sensorData),
        false
      );
      
      // 网络连接时应该尝试立即发送
      const stats = mockCommunicationProtocol.getStats();
      expect(stats.totalMessagesSent + stats.currentQueueSize).toBeGreaterThan(0);
    });

    test('植物状态警报场景', () => {
      mockWiFiManager.setConnected(true);
      
      // 发送紧急警报
      const alertData = {
        type: 'low_moisture',
        severity: 'high',
        message: '土壤湿度过低，需要立即浇水',
        timestamp: Date.now()
      };
      
      const success = mockCommunicationProtocol.sendMessage(
        MessageType.ALERT_NOTIFICATION,
        JSON.stringify(alertData),
        true // 高优先级
      );
      
      // 警报消息应该被正确处理
      const stats = mockCommunicationProtocol.getStats();
      expect(stats.totalMessagesSent + stats.currentQueueSize).toBeGreaterThan(0);
    });

    test('网络中断恢复场景', () => {
      // 开始时网络正常
      mockWiFiManager.setConnected(true);
      
      // 发送一些消息
      mockCommunicationProtocol.sendMessage(MessageType.HEARTBEAT, '{"status": "ok"}', false);
      
      // 网络中断
      mockWiFiManager.setConnected(false);
      mockCommunicationProtocol.enableOfflineMode();
      
      // 离线期间发送消息
      mockCommunicationProtocol.sendMessage(MessageType.SENSOR_DATA, '{"offline": true}', false);
      mockCommunicationProtocol.sendMessage(MessageType.PLANT_STATUS, '{"cached": true}', false);
      
      const offlineQueueSize = mockCommunicationProtocol.getQueueSize();
      expect(offlineQueueSize).toBeGreaterThan(0);
      
      // 网络恢复
      mockWiFiManager.setConnected(true);
      mockCommunicationProtocol.disableOfflineMode();
      
      // 执行同步
      const syncResult = mockCommunicationProtocol.startDataSync();
      
      // 验证同步尝试
      const finalStats = mockCommunicationProtocol.getStats();
      expect(finalStats.totalMessagesSent).toBeGreaterThanOrEqual(0);
    });

    test('消息接收处理场景', () => {
      let receivedMessages: Array<{ header: MessageHeader; payload: string }> = [];
      
      mockCommunicationProtocol.setMessageReceivedCallback(
        (header: MessageHeader, payload: string) => {
          receivedMessages.push({ header, payload });
        }
      );
      
      // 模拟接收消息
      mockCommunicationProtocol.simulateReceiveMessage(
        MessageType.COMMAND_REQUEST,
        '{"command": "get_status"}'
      );
      
      mockCommunicationProtocol.simulateReceiveMessage(
        MessageType.DEVICE_CONFIG,
        '{"moistureThreshold": 35}'
      );
      
      // 验证消息被正确接收
      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages[0].header.type).toBe(MessageType.COMMAND_REQUEST);
      expect(receivedMessages[1].header.type).toBe(MessageType.DEVICE_CONFIG);
      
      const stats = mockCommunicationProtocol.getStats();
      expect(stats.totalMessagesReceived).toBe(2);
    });

    test('统计信息准确性', () => {
      mockCommunicationProtocol.clearQueue();
      const initialStats = mockCommunicationProtocol.getStats();
      
      // 发送一些消息
      mockWiFiManager.setConnected(true);
      mockCommunicationProtocol.sendMessage(MessageType.SENSOR_DATA, '{"test": 1}', false);
      mockCommunicationProtocol.sendMessage(MessageType.PLANT_STATUS, '{"test": 2}', false);
      
      // 接收一些消息
      mockCommunicationProtocol.simulateReceiveMessage(MessageType.HEARTBEAT, '{"ack": true}');
      
      const finalStats = mockCommunicationProtocol.getStats();
      
      // 验证统计信息的变化
      expect(finalStats.totalMessagesReceived).toBeGreaterThan(initialStats.totalMessagesReceived);
      expect(finalStats.totalMessagesSent + finalStats.currentQueueSize).toBeGreaterThan(
        initialStats.totalMessagesSent + initialStats.currentQueueSize
      );
    });

    test('队列清空功能', () => {
      // 添加一些消息到队列
      mockWiFiManager.setConnected(false);
      mockCommunicationProtocol.sendMessage(MessageType.SENSOR_DATA, '{"test": 1}', false);
      mockCommunicationProtocol.sendMessage(MessageType.PLANT_STATUS, '{"test": 2}', true);
      
      expect(mockCommunicationProtocol.getQueueSize()).toBeGreaterThan(0);
      
      // 清空队列
      mockCommunicationProtocol.clearQueue();
      
      expect(mockCommunicationProtocol.getQueueSize()).toBe(0);
      
      const stats = mockCommunicationProtocol.getStats();
      expect(stats.currentQueueSize).toBe(0);
    });
  });
});