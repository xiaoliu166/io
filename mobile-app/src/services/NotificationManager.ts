/**
 * 通知管理器
 * 负责监听设备状态变化并发送相应的推送通知
 */

import { 
  DeviceManager, 
  DeviceManagerEvents, 
  ConnectedDevice 
} from './DeviceManager';
import { NotificationService } from './NotificationService';
import { UserInteractionService } from './UserInteractionService';
import { 
  PlantState, 
  DeviceMessage, 
  MessageType, 
  SystemError, 
  ErrorType 
} from '@shared/types';

export interface NotificationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    plantState?: PlantState[];
    batteryLevel?: { min?: number; max?: number };
    offlineHours?: number;
    errorTypes?: ErrorType[];
  };
  cooldown: number; // 冷却时间（分钟）
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface NotificationContext {
  deviceId: string;
  deviceName?: string;
  lastNotificationTime?: Date;
  suppressUntil?: Date;
}

export class NotificationManager {
  private deviceManager: DeviceManager;
  private notificationService: NotificationService;
  private userInteractionService: UserInteractionService;
  
  private notificationRules: NotificationRule[] = [];
  private deviceContexts: Map<string, NotificationContext> = new Map();
  private isInitialized: boolean = false;
  
  // 通知冷却时间跟踪
  private lastNotifications: Map<string, Date> = new Map();

  constructor(
    deviceManager: DeviceManager,
    notificationService: NotificationService,
    userInteractionService: UserInteractionService
  ) {
    this.deviceManager = deviceManager;
    this.notificationService = notificationService;
    this.userInteractionService = userInteractionService;
    
    this.initializeRules();
    this.setupEventListeners();
  }

  /**
   * 初始化默认通知规则
   */
  private initializeRules(): void {
    this.notificationRules = [
      {
        id: 'plant_needs_water',
        name: '植物需要浇水',
        enabled: true,
        conditions: {
          plantState: [PlantState.NEEDS_WATER],
        },
        cooldown: 120, // 2小时
        priority: 'high',
      },
      {
        id: 'plant_needs_light',
        name: '植物需要光照',
        enabled: true,
        conditions: {
          plantState: [PlantState.NEEDS_LIGHT],
        },
        cooldown: 120, // 2小时
        priority: 'high',
      },
      {
        id: 'plant_critical',
        name: '植物状态危急',
        enabled: true,
        conditions: {
          plantState: [PlantState.CRITICAL],
        },
        cooldown: 60, // 1小时
        priority: 'urgent',
      },
      {
        id: 'low_battery_critical',
        name: '电量严重不足',
        enabled: true,
        conditions: {
          batteryLevel: { max: 10 },
        },
        cooldown: 240, // 4小时
        priority: 'high',
      },
      {
        id: 'low_battery_warning',
        name: '电量不足警告',
        enabled: true,
        conditions: {
          batteryLevel: { min: 11, max: 20 },
        },
        cooldown: 480, // 8小时
        priority: 'normal',
      },
      {
        id: 'device_offline',
        name: '设备离线',
        enabled: true,
        conditions: {
          offlineHours: 2,
        },
        cooldown: 360, // 6小时
        priority: 'normal',
      },
      {
        id: 'sensor_failure',
        name: '传感器故障',
        enabled: true,
        conditions: {
          errorTypes: [ErrorType.SENSOR_FAILURE],
        },
        cooldown: 180, // 3小时
        priority: 'high',
      },
      {
        id: 'hardware_error',
        name: '硬件错误',
        enabled: true,
        conditions: {
          errorTypes: [ErrorType.HARDWARE_ERROR],
        },
        cooldown: 120, // 2小时
        priority: 'urgent',
      },
    ];
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听设备数据接收
    this.deviceManager.on('deviceDataReceived', (deviceId: string, message: DeviceMessage) => {
      this.handleDeviceDataReceived(deviceId, message);
    });

    // 监听设备连接状态变化
    this.deviceManager.on('deviceConnected', (deviceId: string) => {
      this.handleDeviceConnected(deviceId);
    });

    this.deviceManager.on('deviceDisconnected', (deviceId: string) => {
      this.handleDeviceDisconnected(deviceId);
    });

    // 监听设备错误
    this.deviceManager.on('deviceError', (deviceId: string, error: Error) => {
      this.handleDeviceError(deviceId, error);
    });

    console.log('NotificationManager event listeners setup completed');
  }

  /**
   * 处理设备数据接收
   */
  private async handleDeviceDataReceived(deviceId: string, message: DeviceMessage): Promise<void> {
    try {
      const device = this.deviceManager.getDevice(deviceId);
      if (!device) return;

      switch (message.type) {
        case MessageType.STATUS_UPDATE:
          await this.handlePlantStatusUpdate(device, message.payload);
          break;

        case MessageType.SENSOR_DATA:
          await this.handleSensorDataUpdate(device, message.payload);
          break;

        case MessageType.ERROR:
          await this.handleSystemError(device, message.payload);
          break;
      }

    } catch (error) {
      console.error('Failed to handle device data received:', error);
    }
  }

  /**
   * 处理植物状态更新
   */
  private async handlePlantStatusUpdate(device: ConnectedDevice, status: any): Promise<void> {
    try {
      const plantState = status.state as PlantState;
      
      // 检查植物状态通知规则
      const applicableRules = this.getApplicableRules({
        plantState: [plantState],
      });

      for (const rule of applicableRules) {
        if (await this.shouldSendNotification(device.id, rule)) {
          await this.sendPlantStateNotification(device, plantState, rule);
        }
      }

      // 检查电池电量
      if (status.batteryLevel !== undefined) {
        await this.checkBatteryLevel(device, status.batteryLevel);
      }

    } catch (error) {
      console.error('Failed to handle plant status update:', error);
    }
  }

  /**
   * 处理传感器数据更新
   */
  private async handleSensorDataUpdate(device: ConnectedDevice, sensorData: any): Promise<void> {
    try {
      // 这里可以基于传感器数据进行额外的通知逻辑
      // 例如：检测异常的传感器读数
      
      const { soilHumidity, lightIntensity, temperature } = sensorData;
      
      // 检测异常传感器读数
      if (this.isAbnormalSensorReading(sensorData)) {
        const error: SystemError = {
          type: ErrorType.SENSOR_FAILURE,
          message: '传感器读数异常',
          timestamp: Date.now(),
          deviceId: device.id,
          severity: 'medium',
        };
        
        await this.handleSystemError(device, error);
      }

    } catch (error) {
      console.error('Failed to handle sensor data update:', error);
    }
  }

  /**
   * 处理系统错误
   */
  private async handleSystemError(device: ConnectedDevice, error: SystemError): Promise<void> {
    try {
      const applicableRules = this.getApplicableRules({
        errorTypes: [error.type],
      });

      for (const rule of applicableRules) {
        if (await this.shouldSendNotification(device.id, rule)) {
          await this.sendSystemErrorNotification(device, error, rule);
        }
      }

    } catch (error) {
      console.error('Failed to handle system error:', error);
    }
  }

  /**
   * 处理设备连接
   */
  private async handleDeviceConnected(deviceId: string): Promise<void> {
    try {
      const context = this.getDeviceContext(deviceId);
      
      // 如果设备之前离线很久，发送恢复连接通知
      if (context.lastNotificationTime) {
        const offlineHours = (Date.now() - context.lastNotificationTime.getTime()) / (1000 * 60 * 60);
        
        if (offlineHours > 24) { // 离线超过24小时
          const device = this.deviceManager.getDevice(deviceId);
          if (device) {
            await this.sendDeviceReconnectedNotification(device, offlineHours);
          }
        }
      }

    } catch (error) {
      console.error('Failed to handle device connected:', error);
    }
  }

  /**
   * 处理设备断开连接
   */
  private async handleDeviceDisconnected(deviceId: string): Promise<void> {
    try {
      // 启动离线检测定时器
      setTimeout(async () => {
        const device = this.deviceManager.getDevice(deviceId);
        if (device && !device.isConnected) {
          await this.checkDeviceOffline(device);
        }
      }, 2 * 60 * 60 * 1000); // 2小时后检查

    } catch (error) {
      console.error('Failed to handle device disconnected:', error);
    }
  }

  /**
   * 处理设备错误
   */
  private async handleDeviceError(deviceId: string, error: Error): Promise<void> {
    try {
      const device = this.deviceManager.getDevice(deviceId);
      if (!device) return;

      const systemError: SystemError = {
        type: ErrorType.NETWORK_ERROR,
        message: error.message,
        timestamp: Date.now(),
        deviceId,
        severity: 'medium',
      };

      await this.handleSystemError(device, systemError);

    } catch (error) {
      console.error('Failed to handle device error:', error);
    }
  }

  /**
   * 发送植物状态通知
   */
  private async sendPlantStateNotification(
    device: ConnectedDevice, 
    plantState: PlantState, 
    rule: NotificationRule
  ): Promise<void> {
    try {
      const success = await this.notificationService.sendPlantCareNotification(
        device.id,
        plantState,
        device.name
      );

      if (success) {
        this.recordNotificationSent(device.id, rule);
        
        // 记录用户交互（如果需要）
        await this.userInteractionService.recordStatusChange({
          deviceId: device.id,
          previousState: PlantState.HEALTHY, // 这里应该从设备状态获取
          newState: plantState,
          trigger: 'system_update',
        });
      }

    } catch (error) {
      console.error('Failed to send plant state notification:', error);
    }
  }

  /**
   * 发送系统错误通知
   */
  private async sendSystemErrorNotification(
    device: ConnectedDevice, 
    error: SystemError, 
    rule: NotificationRule
  ): Promise<void> {
    try {
      const success = await this.notificationService.sendSystemErrorNotification(
        error,
        device.name
      );

      if (success) {
        this.recordNotificationSent(device.id, rule);
      }

    } catch (error) {
      console.error('Failed to send system error notification:', error);
    }
  }

  /**
   * 发送设备重新连接通知
   */
  private async sendDeviceReconnectedNotification(
    device: ConnectedDevice, 
    offlineHours: number
  ): Promise<void> {
    try {
      await this.notificationService.sendLocalNotification({
        id: `reconnected_${device.id}_${Date.now()}`,
        title: '🔗 设备已重新连接',
        message: `${device.name || device.id} 在离线 ${Math.round(offlineHours)} 小时后重新连接`,
        type: 'system_alert',
        deviceId: device.id,
        priority: 'normal',
        data: { offlineHours },
      });

    } catch (error) {
      console.error('Failed to send device reconnected notification:', error);
    }
  }

  /**
   * 检查电池电量
   */
  private async checkBatteryLevel(device: ConnectedDevice, batteryLevel: number): Promise<void> {
    try {
      const applicableRules = this.getApplicableRules({
        batteryLevel: { min: 0, max: batteryLevel },
      });

      for (const rule of applicableRules) {
        if (await this.shouldSendNotification(device.id, rule)) {
          await this.sendBatteryNotification(device, batteryLevel, rule);
        }
      }

    } catch (error) {
      console.error('Failed to check battery level:', error);
    }
  }

  /**
   * 发送电池通知
   */
  private async sendBatteryNotification(
    device: ConnectedDevice, 
    batteryLevel: number, 
    rule: NotificationRule
  ): Promise<void> {
    try {
      const success = await this.notificationService.sendLowBatteryNotification(
        device.id,
        batteryLevel,
        device.name
      );

      if (success) {
        this.recordNotificationSent(device.id, rule);
      }

    } catch (error) {
      console.error('Failed to send battery notification:', error);
    }
  }

  /**
   * 检查设备离线
   */
  private async checkDeviceOffline(device: ConnectedDevice): Promise<void> {
    try {
      if (device.isConnected) return; // 设备已重新连接

      const offlineRule = this.notificationRules.find(rule => 
        rule.id === 'device_offline' && rule.enabled
      );

      if (offlineRule && await this.shouldSendNotification(device.id, offlineRule)) {
        const success = await this.notificationService.sendDeviceOfflineNotification(
          device.id,
          device.lastSeen,
          device.name
        );

        if (success) {
          this.recordNotificationSent(device.id, offlineRule);
        }
      }

    } catch (error) {
      console.error('Failed to check device offline:', error);
    }
  }

  /**
   * 获取适用的规则
   */
  private getApplicableRules(conditions: any): NotificationRule[] {
    return this.notificationRules.filter(rule => {
      if (!rule.enabled) return false;

      // 检查植物状态条件
      if (conditions.plantState && rule.conditions.plantState) {
        const hasMatchingState = conditions.plantState.some((state: PlantState) =>
          rule.conditions.plantState!.includes(state)
        );
        if (hasMatchingState) return true;
      }

      // 检查电池电量条件
      if (conditions.batteryLevel && rule.conditions.batteryLevel) {
        const { min, max } = rule.conditions.batteryLevel;
        const level = conditions.batteryLevel.max || conditions.batteryLevel.min || conditions.batteryLevel;
        
        if (min !== undefined && level < min) return false;
        if (max !== undefined && level > max) return false;
        if (min !== undefined || max !== undefined) return true;
      }

      // 检查错误类型条件
      if (conditions.errorTypes && rule.conditions.errorTypes) {
        const hasMatchingError = conditions.errorTypes.some((type: ErrorType) =>
          rule.conditions.errorTypes!.includes(type)
        );
        if (hasMatchingError) return true;
      }

      return false;
    });
  }

  /**
   * 检查是否应该发送通知
   */
  private async shouldSendNotification(deviceId: string, rule: NotificationRule): Promise<boolean> {
    const notificationKey = `${deviceId}_${rule.id}`;
    const lastNotificationTime = this.lastNotifications.get(notificationKey);

    if (lastNotificationTime) {
      const cooldownMs = rule.cooldown * 60 * 1000;
      const timeSinceLastNotification = Date.now() - lastNotificationTime.getTime();
      
      if (timeSinceLastNotification < cooldownMs) {
        return false; // 还在冷却期内
      }
    }

    // 检查通知服务配置
    const config = this.notificationService.getConfig();
    if (!config.enabled) return false;

    return true;
  }

  /**
   * 记录通知发送
   */
  private recordNotificationSent(deviceId: string, rule: NotificationRule): void {
    const notificationKey = `${deviceId}_${rule.id}`;
    this.lastNotifications.set(notificationKey, new Date());
    
    // 更新设备上下文
    const context = this.getDeviceContext(deviceId);
    context.lastNotificationTime = new Date();
  }

  /**
   * 获取设备上下文
   */
  private getDeviceContext(deviceId: string): NotificationContext {
    if (!this.deviceContexts.has(deviceId)) {
      this.deviceContexts.set(deviceId, {
        deviceId,
      });
    }
    return this.deviceContexts.get(deviceId)!;
  }

  /**
   * 检测异常传感器读数
   */
  private isAbnormalSensorReading(sensorData: any): boolean {
    const { soilHumidity, airHumidity, temperature, lightIntensity } = sensorData;

    // 检查读数是否在合理范围内
    if (soilHumidity < 0 || soilHumidity > 100) return true;
    if (airHumidity < 0 || airHumidity > 100) return true;
    if (temperature < -40 || temperature > 80) return true;
    if (lightIntensity < 0 || lightIntensity > 100000) return true;

    // 检查是否有NaN或无效值
    if (isNaN(soilHumidity) || isNaN(airHumidity) || isNaN(temperature) || isNaN(lightIntensity)) {
      return true;
    }

    return false;
  }

  /**
   * 获取通知规则
   */
  getNotificationRules(): NotificationRule[] {
    return [...this.notificationRules];
  }

  /**
   * 更新通知规则
   */
  updateNotificationRule(ruleId: string, updates: Partial<NotificationRule>): boolean {
    const index = this.notificationRules.findIndex(rule => rule.id === ruleId);
    if (index === -1) return false;

    this.notificationRules[index] = { ...this.notificationRules[index], ...updates };
    return true;
  }

  /**
   * 暂停设备通知
   */
  suppressDeviceNotifications(deviceId: string, durationMinutes: number): void {
    const context = this.getDeviceContext(deviceId);
    context.suppressUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
  }

  /**
   * 恢复设备通知
   */
  resumeDeviceNotifications(deviceId: string): void {
    const context = this.getDeviceContext(deviceId);
    context.suppressUntil = undefined;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.deviceContexts.clear();
    this.lastNotifications.clear();
    console.log('NotificationManager cleanup completed');
  }
}