/**
 * 数据同步服务
 * 处理设备数据上传、存储和同步
 */

import { Device, IDevice } from '../models/Device';
import { SensorData, ISensorData } from '../models/SensorData';
import { UserAction, IUserAction } from '../models/UserAction';

export interface DeviceDataUpload {
  deviceId: string;
  timestamp: Date;
  sensorData: {
    moisture: number;
    light: number;
    temperature?: number;
    humidity?: number;
    batteryLevel?: number;
  };
  deviceStatus: {
    isOnline: boolean;
    lastSeen: Date;
  };
  alerts?: {
    needsWater: boolean;
    needsLight: boolean;
    lowBattery: boolean;
  };
}

export interface UserActionData {
  deviceId: string;
  userId: string;
  actionType: 'water' | 'move_to_light' | 'fertilize' | 'prune' | 'repot' | 'other';
  description: string;
  timestamp: Date;
  beforeState?: {
    moisture: number;
    light: number;
    isHealthy: boolean;
  };
  afterState?: {
    moisture: number;
    light: number;
    isHealthy: boolean;
  };
  notes?: string;
}

export class DataSyncService {
  
  /**
   * 上传设备数据
   */
  async uploadDeviceData(data: DeviceDataUpload): Promise<{ success: boolean; message: string }> {
    try {
      // 验证设备是否存在
      const device = await Device.findOne({ deviceId: data.deviceId });
      if (!device) {
        return { success: false, message: '设备不存在' };
      }
      
      // 更新设备在线状态
      await Device.updateOne(
        { deviceId: data.deviceId },
        {
          isOnline: data.deviceStatus.isOnline,
          lastSeen: data.deviceStatus.lastSeen
        }
      );
      
      // 计算植物健康状态
      const isHealthy = this.calculatePlantHealth(
        data.sensorData.moisture,
        data.sensorData.light,
        device.configuration
      );
      
      // 保存传感器数据
      const sensorData = new SensorData({
        deviceId: data.deviceId,
        timestamp: data.timestamp,
        moisture: data.sensorData.moisture,
        light: data.sensorData.light,
        temperature: data.sensorData.temperature,
        humidity: data.sensorData.humidity,
        batteryLevel: data.sensorData.batteryLevel,
        isHealthy: isHealthy.isHealthy,
        needsWater: isHealthy.needsWater,
        needsLight: isHealthy.needsLight,
        alertTriggered: data.alerts ? (data.alerts.needsWater || data.alerts.needsLight) : false,
        dataSource: 'device'
      });
      
      await sensorData.save();
      
      return { success: true, message: '数据上传成功' };
      
    } catch (error) {
      console.error('上传设备数据失败:', error);
      return { success: false, message: '数据上传失败' };
    }
  }
  
  /**
   * 记录用户操作
   */
  async recordUserAction(data: UserActionData): Promise<{ success: boolean; message: string }> {
    try {
      // 验证设备是否存在
      const device = await Device.findOne({ deviceId: data.deviceId });
      if (!device) {
        return { success: false, message: '设备不存在' };
      }
      
      // 计算操作效果
      let effectiveness: 'positive' | 'negative' | 'neutral' | undefined;
      if (data.beforeState && data.afterState) {
        effectiveness = this.calculateActionEffectiveness(data.beforeState, data.afterState);
      }
      
      // 保存用户操作记录
      const userAction = new UserAction({
        deviceId: data.deviceId,
        userId: data.userId,
        actionType: data.actionType,
        description: data.description,
        timestamp: data.timestamp,
        beforeState: data.beforeState,
        afterState: data.afterState,
        effectiveness,
        notes: data.notes
      });
      
      await userAction.save();
      
      return { success: true, message: '用户操作记录成功' };
      
    } catch (error) {
      console.error('记录用户操作失败:', error);
      return { success: false, message: '操作记录失败' };
    }
  }
  
  /**
   * 获取设备历史数据
   */
  async getDeviceHistory(
    deviceId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 1000
  ): Promise<ISensorData[]> {
    try {
      return await SensorData.find({
        deviceId,
        timestamp: { $gte: startDate, $lte: endDate }
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
      
    } catch (error) {
      console.error('获取设备历史数据失败:', error);
      return [];
    }
  }
  
  /**
   * 获取用户操作历史
   */
  async getUserActionHistory(
    deviceId: string,
    userId: string,
    limit: number = 100
  ): Promise<IUserAction[]> {
    try {
      return await UserAction.find({
        deviceId,
        userId
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
      
    } catch (error) {
      console.error('获取用户操作历史失败:', error);
      return [];
    }
  }
  
  /**
   * 同步设备配置
   */
  async syncDeviceConfiguration(
    deviceId: string,
    configuration: Partial<IDevice['configuration']>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await Device.updateOne(
        { deviceId },
        { $set: { configuration } }
      );
      
      if (result.matchedCount === 0) {
        return { success: false, message: '设备不存在' };
      }
      
      return { success: true, message: '配置同步成功' };
      
    } catch (error) {
      console.error('同步设备配置失败:', error);
      return { success: false, message: '配置同步失败' };
    }
  }
  
  /**
   * 备份设备数据
   */
  async backupDeviceData(deviceId: string): Promise<{
    device: IDevice | null;
    sensorData: ISensorData[];
    userActions: IUserAction[];
  }> {
    try {
      const device = await Device.findOne({ deviceId });
      const sensorData = await SensorData.find({ deviceId }).sort({ timestamp: -1 });
      const userActions = await UserAction.find({ deviceId }).sort({ timestamp: -1 });
      
      return { device, sensorData, userActions };
      
    } catch (error) {
      console.error('备份设备数据失败:', error);
      return { device: null, sensorData: [], userActions: [] };
    }
  }
  
  /**
   * 恢复设备数据
   */
  async restoreDeviceData(backupData: {
    device: IDevice;
    sensorData: ISensorData[];
    userActions: IUserAction[];
  }): Promise<{ success: boolean; message: string }> {
    try {
      // 恢复设备信息
      await Device.findOneAndUpdate(
        { deviceId: backupData.device.deviceId },
        backupData.device,
        { upsert: true }
      );
      
      // 恢复传感器数据
      if (backupData.sensorData.length > 0) {
        await SensorData.insertMany(backupData.sensorData, { ordered: false });
      }
      
      // 恢复用户操作记录
      if (backupData.userActions.length > 0) {
        await UserAction.insertMany(backupData.userActions, { ordered: false });
      }
      
      return { success: true, message: '数据恢复成功' };
      
    } catch (error) {
      console.error('恢复设备数据失败:', error);
      return { success: false, message: '数据恢复失败' };
    }
  }
  
  /**
   * 计算植物健康状态
   */
  private calculatePlantHealth(
    moisture: number,
    light: number,
    configuration: IDevice['configuration']
  ): { isHealthy: boolean; needsWater: boolean; needsLight: boolean } {
    const needsWater = moisture < configuration.moistureThreshold;
    const needsLight = light < configuration.lightThreshold;
    const isHealthy = !needsWater && !needsLight;
    
    return { isHealthy, needsWater, needsLight };
  }
  
  /**
   * 计算操作效果
   */
  private calculateActionEffectiveness(
    beforeState: { moisture: number; light: number; isHealthy: boolean },
    afterState: { moisture: number; light: number; isHealthy: boolean }
  ): 'positive' | 'negative' | 'neutral' {
    // 如果之前不健康，之后变健康了，则是积极的
    if (!beforeState.isHealthy && afterState.isHealthy) {
      return 'positive';
    }
    
    // 如果之前健康，之后变不健康了，则是消极的
    if (beforeState.isHealthy && !afterState.isHealthy) {
      return 'negative';
    }
    
    // 计算整体改善程度
    const moistureImprovement = afterState.moisture - beforeState.moisture;
    const lightImprovement = afterState.light - beforeState.light;
    
    const totalImprovement = moistureImprovement + (lightImprovement / 10); // 光照权重较小
    
    if (totalImprovement > 5) {
      return 'positive';
    } else if (totalImprovement < -5) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }
}