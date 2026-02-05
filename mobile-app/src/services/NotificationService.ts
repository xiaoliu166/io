/**
 * 推送通知服务
 * 负责管理推送通知的发送、权限管理和消息处理
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification, { Importance } from 'react-native-push-notification';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { 
  PlantState, 
  DeviceMessage, 
  MessageType,
  SystemError,
  ErrorType 
} from '@shared/types';

export interface NotificationConfig {
  enabled: boolean;
  quietHours: {
    start: string; // "22:00"
    end: string;   // "08:00"
  };
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  categories: {
    plantCare: boolean;
    systemAlerts: boolean;
    lowBattery: boolean;
    deviceOffline: boolean;
  };
}

export interface PushNotificationData {
  id: string;
  title: string;
  message: string;
  type: 'plant_care' | 'system_alert' | 'low_battery' | 'device_offline';
  deviceId?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: any;
}

export interface NotificationHistory {
  id: string;
  notification: PushNotificationData;
  timestamp: Date;
  delivered: boolean;
  opened: boolean;
  deviceId?: string;
}

export class NotificationService {
  private readonly CONFIG_KEY = 'notification_config';
  private readonly HISTORY_KEY = 'notification_history';
  private readonly TOKEN_KEY = 'fcm_token';
  
  private config: NotificationConfig;
  private isInitialized: boolean = false;
  private fcmToken?: string;

  constructor() {
    this.config = this.getDefaultConfig();
    this.initializeService();
  }

  /**
   * 初始化通知服务
   */
  private async initializeService(): Promise<void> {
    try {
      // 加载配置
      await this.loadConfig();
      
      // 请求通知权限
      await this.requestNotificationPermissions();
      
      // 配置推送通知
      this.configurePushNotifications();
      
      // 初始化FCM（如果可用）
      await this.initializeFCM();
      
      this.isInitialized = true;
      console.log('NotificationService initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
      throw error;
    }
  }

  /**
   * 请求通知权限
   */
  private async requestNotificationPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const apiLevel = 33; // Android 13+
        
        if (apiLevel >= 33) {
          const granted = await PermissionsAndroid.request(
            'android.permission.POST_NOTIFICATIONS' as any
          );
          
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert(
              '通知权限',
              '需要通知权限来发送植物照料提醒。请在设置中开启通知权限。',
              [{ text: '确定' }]
            );
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * 配置推送通知
   */
  private configurePushNotifications(): void {
    // 在测试环境中跳过真实的PushNotification配置
    if (process.env.NODE_ENV === 'test') {
      console.log('Skipping PushNotification configuration in test environment');
      return;
    }

    PushNotification.configure({
      // FCM配置
      onRegister: (token) => {
        console.log('FCM Token:', token.token);
        this.fcmToken = token.token;
        this.saveFCMToken(token.token);
      },

      // 通知接收处理
      onNotification: (notification) => {
        console.log('Notification received:', notification);
        this.handleNotificationReceived(notification);
      },

      // 权限配置
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // 弹出初始通知
      popInitialNotification: true,

      // 请求权限
      requestPermissions: Platform.OS === 'ios',
    });

    // 创建通知频道（Android）
    if (Platform.OS === 'android') {
      this.createNotificationChannels();
    }
  }

  /**
   * 创建通知频道（Android）
   */
  private createNotificationChannels(): void {
    // 在测试环境中跳过
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const channels = [
      {
        channelId: 'plant_care',
        channelName: '植物照料提醒',
        channelDescription: '植物需要浇水、光照等照料提醒',
        importance: Importance.HIGH,
        vibrate: true,
      },
      {
        channelId: 'system_alerts',
        channelName: '系统警告',
        channelDescription: '设备故障、传感器异常等系统警告',
        importance: Importance.HIGH,
        vibrate: true,
      },
      {
        channelId: 'low_battery',
        channelName: '低电量提醒',
        channelDescription: '设备电量不足提醒',
        importance: Importance.DEFAULT,
        vibrate: false,
      },
      {
        channelId: 'device_offline',
        channelName: '设备离线',
        channelDescription: '设备连接断开提醒',
        importance: Importance.DEFAULT,
        vibrate: false,
      },
    ];

    channels.forEach(channel => {
      PushNotification.createChannel(
        {
          channelId: channel.channelId,
          channelName: channel.channelName,
          channelDescription: channel.channelDescription,
          importance: channel.importance,
          vibrate: channel.vibrate,
        },
        (created) => {
          console.log(`Channel ${channel.channelId} created:`, created);
        }
      );
    });
  }

  /**
   * 初始化FCM
   */
  private async initializeFCM(): Promise<void> {
    try {
      // 这里应该集成实际的FCM SDK
      // 由于这是模拟实现，我们使用本地通知
      console.log('FCM initialization simulated');
      
      // 加载保存的FCM token
      const savedToken = await AsyncStorage.getItem(this.TOKEN_KEY);
      if (savedToken) {
        this.fcmToken = savedToken;
      }
    } catch (error) {
      console.error('Failed to initialize FCM:', error);
    }
  }

  /**
   * 发送本地通知
   */
  async sendLocalNotification(notificationData: PushNotificationData): Promise<boolean> {
    try {
      if (!this.config.enabled) {
        console.log('Notifications disabled, skipping notification');
        return false;
      }

      // 检查静音时段
      if (this.isInQuietHours()) {
        console.log('In quiet hours, skipping notification');
        return false;
      }

      // 检查分类设置
      if (!this.isCategoryEnabled(notificationData.type)) {
        console.log(`Category ${notificationData.type} disabled, skipping notification`);
        return false;
      }

      // 发送通知
      if (process.env.NODE_ENV === 'test') {
        // 在测试环境中模拟通知发送
        console.log('Mock notification sent:', notificationData);
      } else {
        PushNotification.localNotification({
          id: notificationData.id,
          title: notificationData.title,
          message: notificationData.message,
          channelId: this.getChannelId(notificationData.type),
          priority: this.getPriority(notificationData.priority),
          importance: this.getImportance(notificationData.priority),
          playSound: this.config.soundEnabled,
          vibrate: this.config.vibrationEnabled,
          userInfo: {
            type: notificationData.type,
            deviceId: notificationData.deviceId,
            data: notificationData.data,
          },
        });
      }

      // 记录通知历史
      await this.recordNotificationHistory({
        id: this.generateId(),
        notification: notificationData,
        timestamp: new Date(),
        delivered: true,
        opened: false,
        deviceId: notificationData.deviceId,
      });

      console.log('Local notification sent:', notificationData.id);
      return true;

    } catch (error) {
      console.error('Failed to send local notification:', error);
      return false;
    }
  }

  /**
   * 发送推送通知（通过FCM）
   */
  async sendPushNotification(notificationData: PushNotificationData): Promise<boolean> {
    try {
      if (!this.fcmToken) {
        console.warn('No FCM token available, falling back to local notification');
        return await this.sendLocalNotification(notificationData);
      }

      // 这里应该调用FCM API发送推送通知
      // 由于这是模拟实现，我们使用本地通知
      console.log('Simulating FCM push notification:', notificationData);
      
      return await this.sendLocalNotification(notificationData);

    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  /**
   * 处理植物状态变化通知
   */
  async sendPlantCareNotification(
    deviceId: string, 
    plantState: PlantState, 
    deviceName?: string
  ): Promise<boolean> {
    const notifications = this.createPlantCareNotifications(deviceId, plantState, deviceName);
    
    let success = true;
    for (const notification of notifications) {
      const result = await this.sendPushNotification(notification);
      if (!result) success = false;
    }
    
    return success;
  }

  /**
   * 处理系统错误通知
   */
  async sendSystemErrorNotification(
    error: SystemError, 
    deviceName?: string
  ): Promise<boolean> {
    const notification = this.createSystemErrorNotification(error, deviceName);
    return await this.sendPushNotification(notification);
  }

  /**
   * 处理低电量通知
   */
  async sendLowBatteryNotification(
    deviceId: string, 
    batteryLevel: number, 
    deviceName?: string
  ): Promise<boolean> {
    const notification = this.createLowBatteryNotification(deviceId, batteryLevel, deviceName);
    return await this.sendPushNotification(notification);
  }

  /**
   * 处理设备离线通知
   */
  async sendDeviceOfflineNotification(
    deviceId: string, 
    lastSeen: Date, 
    deviceName?: string
  ): Promise<boolean> {
    const notification = this.createDeviceOfflineNotification(deviceId, lastSeen, deviceName);
    return await this.sendPushNotification(notification);
  }

  /**
   * 创建植物照料通知
   */
  private createPlantCareNotifications(
    deviceId: string, 
    plantState: PlantState, 
    deviceName?: string
  ): PushNotificationData[] {
    const name = deviceName || `设备 ${deviceId.slice(-4)}`;
    const notifications: PushNotificationData[] = [];

    switch (plantState) {
      case PlantState.NEEDS_WATER:
        notifications.push({
          id: `water_${deviceId}_${Date.now()}`,
          title: '🌱 植物需要浇水',
          message: `${name} 的土壤湿度过低，请及时浇水`,
          type: 'plant_care',
          deviceId,
          priority: 'high',
          data: { plantState, action: 'water' },
        });
        break;

      case PlantState.NEEDS_LIGHT:
        notifications.push({
          id: `light_${deviceId}_${Date.now()}`,
          title: '☀️ 植物需要光照',
          message: `${name} 的光照不足，请移至光照充足的地方`,
          type: 'plant_care',
          deviceId,
          priority: 'high',
          data: { plantState, action: 'move_to_light' },
        });
        break;

      case PlantState.CRITICAL:
        notifications.push({
          id: `critical_${deviceId}_${Date.now()}`,
          title: '🚨 植物状态危急',
          message: `${name} 的状态非常糟糕，需要立即照料！`,
          type: 'plant_care',
          deviceId,
          priority: 'urgent',
          data: { plantState, action: 'immediate_care' },
        });
        break;
    }

    return notifications;
  }

  /**
   * 创建系统错误通知
   */
  private createSystemErrorNotification(
    error: SystemError, 
    deviceName?: string
  ): PushNotificationData {
    const name = deviceName || `设备 ${error.deviceId.slice(-4)}`;
    
    let title = '⚠️ 系统警告';
    let message = error.message;
    let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal';

    switch (error.type) {
      case ErrorType.SENSOR_FAILURE:
        title = '🔧 传感器故障';
        message = `${name} 的传感器出现故障：${error.message}`;
        priority = error.severity === 'critical' ? 'urgent' : 'high';
        break;

      case ErrorType.HARDWARE_ERROR:
        title = '⚡ 硬件错误';
        message = `${name} 出现硬件错误：${error.message}`;
        priority = 'high';
        break;

      case ErrorType.NETWORK_ERROR:
        title = '📶 网络错误';
        message = `${name} 网络连接异常：${error.message}`;
        priority = 'normal';
        break;
    }

    return {
      id: `error_${error.deviceId}_${Date.now()}`,
      title,
      message,
      type: 'system_alert',
      deviceId: error.deviceId,
      priority,
      data: { error },
    };
  }

  /**
   * 创建低电量通知
   */
  private createLowBatteryNotification(
    deviceId: string, 
    batteryLevel: number, 
    deviceName?: string
  ): PushNotificationData {
    const name = deviceName || `设备 ${deviceId.slice(-4)}`;
    
    return {
      id: `battery_${deviceId}_${Date.now()}`,
      title: '🔋 电量不足',
      message: `${name} 电量剩余 ${batteryLevel}%，请及时充电`,
      type: 'low_battery',
      deviceId,
      priority: batteryLevel < 10 ? 'high' : 'normal',
      data: { batteryLevel },
    };
  }

  /**
   * 创建设备离线通知
   */
  private createDeviceOfflineNotification(
    deviceId: string, 
    lastSeen: Date, 
    deviceName?: string
  ): PushNotificationData {
    const name = deviceName || `设备 ${deviceId.slice(-4)}`;
    const hoursOffline = Math.floor((Date.now() - lastSeen.getTime()) / (1000 * 60 * 60));
    
    return {
      id: `offline_${deviceId}_${Date.now()}`,
      title: '📵 设备离线',
      message: `${name} 已离线 ${hoursOffline} 小时，请检查设备连接`,
      type: 'device_offline',
      deviceId,
      priority: hoursOffline > 24 ? 'high' : 'normal',
      data: { lastSeen: lastSeen.toISOString(), hoursOffline },
    };
  }

  /**
   * 处理通知接收
   */
  private async handleNotificationReceived(notification: any): Promise<void> {
    try {
      console.log('Processing received notification:', notification);
      
      // 更新通知历史
      if (notification.userInfo?.notificationId) {
        await this.updateNotificationHistory(notification.userInfo.notificationId, {
          opened: notification.userInteraction || false,
        });
      }

      // 处理通知点击
      if (notification.userInteraction) {
        await this.handleNotificationTap(notification);
      }

    } catch (error) {
      console.error('Failed to handle notification received:', error);
    }
  }

  /**
   * 处理通知点击
   */
  private async handleNotificationTap(notification: any): Promise<void> {
    try {
      const { type, deviceId, data } = notification.userInfo || {};
      
      console.log('Notification tapped:', { type, deviceId, data });
      
      // 这里可以添加导航逻辑
      // 例如：跳转到对应的设备详情页面
      
    } catch (error) {
      console.error('Failed to handle notification tap:', error);
    }
  }

  /**
   * 获取通知配置
   */
  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  /**
   * 更新通知配置
   */
  async updateConfig(updates: Partial<NotificationConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...updates };
      await this.saveConfig();
      console.log('Notification config updated:', updates);
    } catch (error) {
      console.error('Failed to update notification config:', error);
      throw error;
    }
  }

  /**
   * 获取通知历史
   */
  async getNotificationHistory(days: number = 7): Promise<NotificationHistory[]> {
    try {
      const stored = await AsyncStorage.getItem(this.HISTORY_KEY);
      if (!stored) return [];

      const allHistory: NotificationHistory[] = JSON.parse(stored).map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));

      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      return allHistory
        .filter(item => item.timestamp >= cutoffTime)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }

  /**
   * 清除所有通知
   */
  clearAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
    console.log('All notifications cleared');
  }

  /**
   * 清除特定通知
   */
  clearNotification(notificationId: string): void {
    PushNotification.cancelLocalNotifications({ id: notificationId });
    console.log('Notification cleared:', notificationId);
  }

  /**
   * 获取FCM Token
   */
  getFCMToken(): string | undefined {
    return this.fcmToken;
  }

  /**
   * 检查是否在静音时段
   */
  private isInQuietHours(): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { start, end } = this.config.quietHours;
    
    if (start <= end) {
      // 同一天内的时间段
      return currentTime >= start && currentTime <= end;
    } else {
      // 跨天的时间段
      return currentTime >= start || currentTime <= end;
    }
  }

  /**
   * 检查通知分类是否启用
   */
  private isCategoryEnabled(type: string): boolean {
    switch (type) {
      case 'plant_care':
        return this.config.categories.plantCare;
      case 'system_alert':
        return this.config.categories.systemAlerts;
      case 'low_battery':
        return this.config.categories.lowBattery;
      case 'device_offline':
        return this.config.categories.deviceOffline;
      default:
        return true;
    }
  }

  /**
   * 获取通知频道ID
   */
  private getChannelId(type: string): string {
    switch (type) {
      case 'plant_care':
        return 'plant_care';
      case 'system_alert':
        return 'system_alerts';
      case 'low_battery':
        return 'low_battery';
      case 'device_offline':
        return 'device_offline';
      default:
        return 'plant_care';
    }
  }

  /**
   * 获取通知优先级
   */
  private getPriority(priority: string): 'min' | 'low' | 'default' | 'high' | 'max' {
    switch (priority) {
      case 'low':
        return 'low';
      case 'normal':
        return 'default';
      case 'high':
        return 'high';
      case 'urgent':
        return 'max';
      default:
        return 'default';
    }
  }

  /**
   * 获取通知重要性
   */
  private getImportance(priority: string): Importance {
    switch (priority) {
      case 'low':
        return Importance.LOW;
      case 'normal':
        return Importance.DEFAULT;
      case 'high':
        return Importance.HIGH;
      case 'urgent':
        return Importance.HIGH;
      default:
        return Importance.DEFAULT;
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): NotificationConfig {
    return {
      enabled: true,
      quietHours: {
        start: '22:00',
        end: '08:00',
      },
      soundEnabled: true,
      vibrationEnabled: true,
      categories: {
        plantCare: true,
        systemAlerts: true,
        lowBattery: true,
        deviceOffline: true,
      },
    };
  }

  /**
   * 加载配置
   */
  private async loadConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (stored) {
        this.config = { ...this.getDefaultConfig(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification config:', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * 保存配置
   */
  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save notification config:', error);
      throw error;
    }
  }

  /**
   * 保存FCM Token
   */
  private async saveFCMToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save FCM token:', error);
    }
  }

  /**
   * 记录通知历史
   */
  private async recordNotificationHistory(history: NotificationHistory): Promise<void> {
    try {
      const existing = await this.getNotificationHistory(90); // 保留90天
      const updated = [history, ...existing].slice(0, 1000); // 限制数量
      
      await AsyncStorage.setItem(this.HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to record notification history:', error);
    }
  }

  /**
   * 更新通知历史
   */
  private async updateNotificationHistory(
    notificationId: string, 
    updates: Partial<NotificationHistory>
  ): Promise<void> {
    try {
      const history = await this.getNotificationHistory(90);
      const index = history.findIndex(item => item.notification.id === notificationId);
      
      if (index > -1) {
        history[index] = { ...history[index], ...updates };
        await AsyncStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
      }
    } catch (error) {
      console.error('Failed to update notification history:', error);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      this.clearAllNotifications();
      console.log('NotificationService cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup NotificationService:', error);
    }
  }
}