/**
 * 数据可视化服务
 * 负责处理传感器数据并生成图表数据
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  SensorData, 
  ChartData, 
  TrendData, 
  HealthReport, 
  CareRecord,
  PlantState 
} from '@shared/types';
import { subDays, format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface DataPoint {
  x: number; // 时间戳
  y: number; // 数值
  label?: string;
}

export interface ChartDataset {
  data: DataPoint[];
  color: string;
  strokeWidth?: number;
}

export interface VisualizationConfig {
  timeRange: 'day' | 'week' | 'month';
  dataType: 'soilMoisture' | 'lightLevel' | 'temperature' | 'all';
  showCareEvents: boolean;
  smoothData: boolean;
}

export class DataVisualizationService {
  private readonly STORAGE_PREFIX = 'sensor_data_';
  private readonly CARE_RECORDS_KEY = 'care_records';
  
  /**
   * 保存传感器数据
   */
  async saveSensorData(deviceId: string, data: SensorData): Promise<void> {
    try {
      const key = `${this.STORAGE_PREFIX}${deviceId}`;
      const existingData = await this.loadSensorData(deviceId, 30); // 加载30天数据
      
      // 添加新数据并保持时间顺序
      const updatedData = [...existingData, data].sort((a, b) => a.timestamp - b.timestamp);
      
      // 限制数据量，只保留最近30天的数据
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filteredData = updatedData.filter(item => item.timestamp >= thirtyDaysAgo);
      
      await AsyncStorage.setItem(key, JSON.stringify(filteredData));
    } catch (error) {
      console.error('Failed to save sensor data:', error);
      throw error;
    }
  }

  /**
   * 加载传感器数据
   */
  async loadSensorData(deviceId: string, days: number = 7): Promise<SensorData[]> {
    try {
      const key = `${this.STORAGE_PREFIX}${deviceId}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (!stored) {
        return [];
      }
      
      const allData: SensorData[] = JSON.parse(stored);
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      return allData.filter(item => item.timestamp >= cutoffTime);
    } catch (error) {
      console.error('Failed to load sensor data:', error);
      return [];
    }
  }

  /**
   * 生成图表数据
   */
  async generateChartData(
    deviceId: string, 
    config: VisualizationConfig
  ): Promise<ChartData> {
    try {
      const days = this.getDaysFromTimeRange(config.timeRange);
      const sensorData = await this.loadSensorData(deviceId, days);
      const careRecords = await this.loadCareRecords(deviceId, days);
      
      // 处理数据平滑
      const processedData = config.smoothData ? 
        this.smoothSensorData(sensorData) : sensorData;
      
      // 生成趋势数据
      const soilMoisture = this.generateTrendData(processedData, 'soilHumidity');
      const lightLevel = this.generateTrendData(processedData, 'lightIntensity');
      const temperature = this.generateTrendData(processedData, 'temperature');
      
      return {
        soilMoisture,
        lightLevel,
        temperature,
        careEvents: careRecords,
      };
    } catch (error) {
      console.error('Failed to generate chart data:', error);
      throw error;
    }
  }

  /**
   * 生成趋势数据
   */
  private generateTrendData(
    sensorData: SensorData[], 
    field: keyof SensorData
  ): TrendData[] {
    return sensorData.map(item => ({
      timestamp: item.timestamp,
      value: item[field] as number,
      label: format(new Date(item.timestamp), 'HH:mm', { locale: zhCN }),
    }));
  }

  /**
   * 数据平滑处理
   */
  private smoothSensorData(data: SensorData[]): SensorData[] {
    if (data.length < 3) return data;
    
    const smoothed: SensorData[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0 || i === data.length - 1) {
        // 保持首尾数据不变
        smoothed.push(data[i]);
      } else {
        // 使用移动平均
        const prev = data[i - 1];
        const curr = data[i];
        const next = data[i + 1];
        
        smoothed.push({
          ...curr,
          soilHumidity: (prev.soilHumidity + curr.soilHumidity + next.soilHumidity) / 3,
          airHumidity: (prev.airHumidity + curr.airHumidity + next.airHumidity) / 3,
          temperature: (prev.temperature + curr.temperature + next.temperature) / 3,
          lightIntensity: (prev.lightIntensity + curr.lightIntensity + next.lightIntensity) / 3,
        });
      }
    }
    
    return smoothed;
  }

  /**
   * 生成健康报告
   */
  async generateHealthReport(deviceId: string, days: number = 7): Promise<HealthReport> {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, days);
      
      const sensorData = await this.loadSensorData(deviceId, days);
      const careRecords = await this.loadCareRecords(deviceId, days);
      
      // 计算平均条件
      const averageConditions = this.calculateAverageConditions(sensorData);
      
      // 计算健康评分
      const healthScore = this.calculateHealthScore(sensorData, careRecords);
      
      // 生成建议
      const recommendations = this.generateRecommendations(sensorData, careRecords);
      
      return {
        deviceId,
        period: {
          start: startDate,
          end: endDate,
        },
        averageConditions,
        careEvents: careRecords,
        recommendations,
        healthScore,
      };
    } catch (error) {
      console.error('Failed to generate health report:', error);
      throw error;
    }
  }

  /**
   * 计算平均条件
   */
  private calculateAverageConditions(data: SensorData[]) {
    if (data.length === 0) {
      return {
        soilMoisture: 0,
        lightLevel: 0,
        temperature: 0,
      };
    }
    
    const totals = data.reduce(
      (acc, item) => ({
        soilMoisture: acc.soilMoisture + item.soilHumidity,
        lightLevel: acc.lightLevel + item.lightIntensity,
        temperature: acc.temperature + item.temperature,
      }),
      { soilMoisture: 0, lightLevel: 0, temperature: 0 }
    );
    
    return {
      soilMoisture: Math.round(totals.soilMoisture / data.length),
      lightLevel: Math.round(totals.lightLevel / data.length),
      temperature: Math.round(totals.temperature / data.length * 10) / 10,
    };
  }

  /**
   * 计算健康评分
   */
  private calculateHealthScore(sensorData: SensorData[], careRecords: CareRecord[]): number {
    let score = 100;
    
    if (sensorData.length === 0) return 0;
    
    // 分析土壤湿度
    const avgMoisture = sensorData.reduce((sum, item) => sum + item.soilHumidity, 0) / sensorData.length;
    if (avgMoisture < 30) score -= 20;
    else if (avgMoisture < 40) score -= 10;
    
    // 分析光照强度
    const avgLight = sensorData.reduce((sum, item) => sum + item.lightIntensity, 0) / sensorData.length;
    if (avgLight < 500) score -= 20;
    else if (avgLight < 800) score -= 10;
    
    // 分析温度
    const avgTemp = sensorData.reduce((sum, item) => sum + item.temperature, 0) / sensorData.length;
    if (avgTemp < 15 || avgTemp > 35) score -= 15;
    else if (avgTemp < 18 || avgTemp > 30) score -= 5;
    
    // 分析照料频率
    const wateringEvents = careRecords.filter(record => record.action === 'watered');
    if (wateringEvents.length === 0 && avgMoisture < 40) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 生成建议
   */
  private generateRecommendations(sensorData: SensorData[], careRecords: CareRecord[]): string[] {
    const recommendations: string[] = [];
    
    if (sensorData.length === 0) {
      recommendations.push('暂无数据，请确保设备正常工作');
      return recommendations;
    }
    
    const avgMoisture = sensorData.reduce((sum, item) => sum + item.soilHumidity, 0) / sensorData.length;
    const avgLight = sensorData.reduce((sum, item) => sum + item.lightIntensity, 0) / sensorData.length;
    const avgTemp = sensorData.reduce((sum, item) => sum + item.temperature, 0) / sensorData.length;
    
    // 土壤湿度建议
    if (avgMoisture < 30) {
      recommendations.push('土壤过于干燥，建议增加浇水频率');
    } else if (avgMoisture > 80) {
      recommendations.push('土壤过于湿润，建议减少浇水或改善排水');
    }
    
    // 光照建议
    if (avgLight < 500) {
      recommendations.push('光照不足，建议将植物移至光线更好的位置');
    } else if (avgLight > 2000) {
      recommendations.push('光照过强，建议适当遮阴');
    }
    
    // 温度建议
    if (avgTemp < 15) {
      recommendations.push('温度偏低，建议移至温暖的环境');
    } else if (avgTemp > 35) {
      recommendations.push('温度过高，建议移至阴凉处或增加通风');
    }
    
    // 照料建议
    const recentWatering = careRecords.filter(
      record => record.action === 'watered' && 
      Date.now() - record.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000
    );
    
    if (recentWatering.length === 0 && avgMoisture < 40) {
      recommendations.push('最近没有浇水记录，建议检查土壤湿度');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('植物状态良好，继续保持当前的照料方式');
    }
    
    return recommendations;
  }
  /**
   * 保存照料记录
   */
  async saveCareRecord(record: CareRecord): Promise<void> {
    try {
      const existingRecords = await this.loadCareRecords(record.deviceId, 30);
      const updatedRecords = [...existingRecords, record].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
      
      // 限制记录数量
      const limitedRecords = updatedRecords.slice(0, 1000);
      
      const key = `${this.CARE_RECORDS_KEY}_${record.deviceId}`;
      await AsyncStorage.setItem(key, JSON.stringify(limitedRecords));
    } catch (error) {
      console.error('Failed to save care record:', error);
      throw error;
    }
  }

  /**
   * 加载照料记录
   */
  async loadCareRecords(deviceId: string, days: number = 7): Promise<CareRecord[]> {
    try {
      const key = `${this.CARE_RECORDS_KEY}_${deviceId}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (!stored) {
        return [];
      }
      
      const allRecords: CareRecord[] = JSON.parse(stored).map((record: any) => ({
        ...record,
        timestamp: new Date(record.timestamp),
      }));
      
      const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      return allRecords.filter(record => record.timestamp.getTime() >= cutoffTime);
    } catch (error) {
      console.error('Failed to load care records:', error);
      return [];
    }
  }

  /**
   * 获取时间范围对应的天数
   */
  private getDaysFromTimeRange(timeRange: 'day' | 'week' | 'month'): number {
    switch (timeRange) {
      case 'day':
        return 1;
      case 'week':
        return 7;
      case 'month':
        return 30;
      default:
        return 7;
    }
  }

  /**
   * 生成图表配置
   */
  generateChartConfig(dataType: 'soilMoisture' | 'lightLevel' | 'temperature') {
    const configs = {
      soilMoisture: {
        color: '#2196F3',
        label: '土壤湿度 (%)',
        min: 0,
        max: 100,
        unit: '%',
        thresholds: [
          { value: 30, color: '#F44336', label: '缺水线' },
          { value: 70, color: '#4CAF50', label: '适宜线' },
        ],
      },
      lightLevel: {
        color: '#FF9800',
        label: '光照强度 (lux)',
        min: 0,
        max: 2000,
        unit: 'lux',
        thresholds: [
          { value: 500, color: '#F44336', label: '光照不足线' },
          { value: 1000, color: '#4CAF50', label: '适宜线' },
        ],
      },
      temperature: {
        color: '#4CAF50',
        label: '温度 (°C)',
        min: 0,
        max: 40,
        unit: '°C',
        thresholds: [
          { value: 15, color: '#2196F3', label: '最低温度' },
          { value: 35, color: '#F44336', label: '最高温度' },
        ],
      },
    };
    
    return configs[dataType];
  }

  /**
   * 导出数据为CSV格式
   */
  async exportDataToCSV(deviceId: string, days: number = 7): Promise<string> {
    try {
      const sensorData = await this.loadSensorData(deviceId, days);
      const careRecords = await this.loadCareRecords(deviceId, days);
      
      let csv = 'Timestamp,Soil Moisture (%),Air Humidity (%),Temperature (°C),Light Intensity (lux),Care Action\n';
      
      // 合并传感器数据和照料记录
      const allEvents = [
        ...sensorData.map(data => ({
          timestamp: data.timestamp,
          type: 'sensor',
          data,
        })),
        ...careRecords.map(record => ({
          timestamp: record.timestamp.getTime(),
          type: 'care',
          record,
        })),
      ].sort((a, b) => a.timestamp - b.timestamp);
      
      for (const event of allEvents) {
        const date = new Date(event.timestamp);
        const dateStr = format(date, 'yyyy-MM-dd HH:mm:ss');
        
        if (event.type === 'sensor') {
          const data = event.data as SensorData;
          csv += `${dateStr},${data.soilHumidity},${data.airHumidity},${data.temperature},${data.lightIntensity},\n`;
        } else {
          const record = event.record as CareRecord;
          csv += `${dateStr},,,,,"${record.action}"\n`;
        }
      }
      
      return csv;
    } catch (error) {
      console.error('Failed to export data to CSV:', error);
      throw error;
    }
  }

  /**
   * 获取数据统计信息
   */
  async getDataStatistics(deviceId: string, days: number = 7) {
    try {
      const sensorData = await this.loadSensorData(deviceId, days);
      const careRecords = await this.loadCareRecords(deviceId, days);
      
      if (sensorData.length === 0) {
        return {
          totalDataPoints: 0,
          totalCareEvents: careRecords.length,
          dataRange: null,
          averageInterval: 0,
        };
      }
      
      const timestamps = sensorData.map(item => item.timestamp).sort((a, b) => a - b);
      const intervals = [];
      
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }
      
      const averageInterval = intervals.length > 0 ? 
        intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : 0;
      
      return {
        totalDataPoints: sensorData.length,
        totalCareEvents: careRecords.length,
        dataRange: {
          start: new Date(timestamps[0]),
          end: new Date(timestamps[timestamps.length - 1]),
        },
        averageInterval: Math.round(averageInterval / 1000 / 60), // 转换为分钟
      };
    } catch (error) {
      console.error('Failed to get data statistics:', error);
      throw error;
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupOldData(deviceId: string, keepDays: number = 30): Promise<void> {
    try {
      const cutoffTime = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
      
      // 清理传感器数据
      const sensorData = await this.loadSensorData(deviceId, keepDays + 7); // 多加载7天以确保完整性
      const filteredSensorData = sensorData.filter(item => item.timestamp >= cutoffTime);
      
      const sensorKey = `${this.STORAGE_PREFIX}${deviceId}`;
      await AsyncStorage.setItem(sensorKey, JSON.stringify(filteredSensorData));
      
      // 清理照料记录
      const careRecords = await this.loadCareRecords(deviceId, keepDays + 7);
      const filteredCareRecords = careRecords.filter(
        record => record.timestamp.getTime() >= cutoffTime
      );
      
      const careKey = `${this.CARE_RECORDS_KEY}_${deviceId}`;
      await AsyncStorage.setItem(careKey, JSON.stringify(filteredCareRecords));
      
      console.log(`Cleaned up data for device ${deviceId}, kept ${keepDays} days`);
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
      throw error;
    }
  }

  /**
   * 获取实时数据摘要
   */
  async getRealtimeDataSummary(deviceId: string) {
    try {
      const recentData = await this.loadSensorData(deviceId, 1); // 最近1天
      
      if (recentData.length === 0) {
        return null;
      }
      
      // 获取最新数据
      const latestData = recentData[recentData.length - 1];
      
      // 计算24小时内的变化趋势
      const dayStartData = recentData.find(
        item => Date.now() - item.timestamp < 24 * 60 * 60 * 1000
      );
      
      const trends = dayStartData ? {
        soilMoisture: latestData.soilHumidity - dayStartData.soilHumidity,
        lightLevel: latestData.lightIntensity - dayStartData.lightIntensity,
        temperature: latestData.temperature - dayStartData.temperature,
      } : null;
      
      return {
        latest: latestData,
        trends,
        dataAge: Date.now() - latestData.timestamp,
        totalReadings: recentData.length,
      };
    } catch (error) {
      console.error('Failed to get realtime data summary:', error);
      return null;
    }
  }
}