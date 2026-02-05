/**
 * 数据分析服务
 * 提供植物健康趋势分析和异常模式识别
 */

import { SensorData, ISensorData } from '../models/SensorData';
import { UserAction, IUserAction } from '../models/UserAction';
import { Device, IDevice } from '../models/Device';

export interface HealthTrend {
  deviceId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  healthScore: number; // 0-100
  trends: {
    moisture: {
      average: number;
      trend: 'improving' | 'stable' | 'declining';
      changeRate: number;
    };
    light: {
      average: number;
      trend: 'improving' | 'stable' | 'declining';
      changeRate: number;
    };
  };
  recommendations: string[];
  alertCount: number;
  userActionEffectiveness: number; // 0-100
}

export interface AnomalyPattern {
  deviceId: string;
  patternType: 'sudden_drop' | 'gradual_decline' | 'irregular_fluctuation' | 'sensor_malfunction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  affectedMetrics: ('moisture' | 'light' | 'temperature' | 'humidity')[];
  description: string;
  suggestedActions: string[];
  confidence: number; // 0-100
}

export interface PlantHealthReport {
  deviceId: string;
  generatedAt: Date;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  healthTrend: HealthTrend;
  anomalies: AnomalyPattern[];
  insights: {
    bestPerformingDays: Date[];
    worstPerformingDays: Date[];
    optimalCareSchedule: {
      wateringFrequency: string;
      lightExposureRecommendation: string;
    };
    seasonalAdjustments: string[];
  };
  predictiveAlerts: {
    nextWateringNeeded: Date | null;
    nextLightAdjustmentNeeded: Date | null;
    potentialIssues: string[];
  };
}

export class DataAnalysisService {
  
  /**
   * 分析植物健康趋势
   */
  async analyzeHealthTrend(
    deviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HealthTrend> {
    try {
      // 获取传感器数据
      const sensorData = await SensorData.find({
        deviceId,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: 1 });

      if (sensorData.length === 0) {
        throw new Error('没有找到指定时间段的数据');
      }

      // 获取用户操作数据
      const userActions = await UserAction.find({
        deviceId,
        timestamp: { $gte: startDate, $lte: endDate }
      });

      // 计算健康趋势
      const healthTrend = this.calculateHealthTrend(sensorData, userActions, startDate, endDate);
      
      return healthTrend;
      
    } catch (error) {
      console.error('分析健康趋势失败:', error);
      throw error;
    }
  }
  /**
   * 检测异常模式
   */
  async detectAnomalies(
    deviceId: string,
    lookbackDays: number = 7
  ): Promise<AnomalyPattern[]> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
      
      const sensorData = await SensorData.find({
        deviceId,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: 1 });

      if (sensorData.length < 10) {
        return []; // 数据不足，无法检测异常
      }

      const anomalies: AnomalyPattern[] = [];
      
      // 检测突然下降
      const suddenDrops = this.detectSuddenDrops(sensorData);
      anomalies.push(...suddenDrops);
      
      // 检测渐进式下降
      const gradualDeclines = this.detectGradualDeclines(sensorData);
      anomalies.push(...gradualDeclines);
      
      // 检测不规律波动
      const irregularFluctuations = this.detectIrregularFluctuations(sensorData);
      anomalies.push(...irregularFluctuations);
      
      // 检测传感器故障
      const sensorMalfunctions = this.detectSensorMalfunctions(sensorData);
      anomalies.push(...sensorMalfunctions);
      
      return anomalies.sort((a, b) => b.confidence - a.confidence);
      
    } catch (error) {
      console.error('检测异常模式失败:', error);
      return [];
    }
  }

  /**
   * 生成植物健康报告
   */
  async generateHealthReport(
    deviceId: string,
    reportDays: number = 30
  ): Promise<PlantHealthReport> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - reportDays * 24 * 60 * 60 * 1000);
      
      // 获取健康趋势
      const healthTrend = await this.analyzeHealthTrend(deviceId, startDate, endDate);
      
      // 检测异常
      const anomalies = await this.detectAnomalies(deviceId, reportDays);
      
      // 生成洞察
      const insights = await this.generateInsights(deviceId, startDate, endDate);
      
      // 生成预测性警报
      const predictiveAlerts = await this.generatePredictiveAlerts(deviceId);
      
      const report: PlantHealthReport = {
        deviceId,
        generatedAt: new Date(),
        reportPeriod: { startDate, endDate },
        healthTrend,
        anomalies,
        insights,
        predictiveAlerts
      };
      
      return report;
      
    } catch (error) {
      console.error('生成健康报告失败:', error);
      throw error;
    }
  }

  /**
   * 获取个性化建议
   */
  async getPersonalizedRecommendations(
    deviceId: string
  ): Promise<string[]> {
    try {
      const device = await Device.findOne({ deviceId });
      if (!device) {
        throw new Error('设备不存在');
      }
      
      // 获取最近7天的数据
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const recentData = await SensorData.find({
        deviceId,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: -1 }).limit(100);
      
      const recommendations: string[] = [];
      
      if (recentData.length > 0) {
        const latestData = recentData[0];
        const avgMoisture = recentData.reduce((sum, d) => sum + d.moisture, 0) / recentData.length;
        const avgLight = recentData.reduce((sum, d) => sum + d.light, 0) / recentData.length;
        
        // 基于当前状态的建议
        if (latestData.moisture < device.configuration.moistureThreshold) {
          recommendations.push(`您的${device.plantType}需要浇水，当前土壤湿度为${latestData.moisture.toFixed(1)}%`);
        }
        
        if (latestData.light < device.configuration.lightThreshold) {
          recommendations.push(`建议将${device.plantType}移到光线更充足的地方，当前光照强度为${latestData.light.toFixed(0)}lux`);
        }
        
        // 基于趋势的建议
        if (avgMoisture < device.configuration.moistureThreshold * 1.2) {
          recommendations.push('考虑增加浇水频率或检查土壤排水情况');
        }
        
        if (avgLight < device.configuration.lightThreshold * 1.2) {
          recommendations.push('考虑使用植物生长灯补充光照');
        }
        
        // 基于植物类型的建议
        recommendations.push(...this.getPlantSpecificRecommendations(device.plantType, latestData));
      }
      
      return recommendations;
      
    } catch (error) {
      console.error('获取个性化建议失败:', error);
      return ['暂时无法获取建议，请稍后再试'];
    }
  }
  /**
   * 计算健康趋势
   */
  private calculateHealthTrend(
    sensorData: ISensorData[],
    userActions: IUserAction[],
    startDate: Date,
    endDate: Date
  ): HealthTrend {
    const deviceId = sensorData[0].deviceId;
    
    // 计算平均值
    const avgMoisture = sensorData.reduce((sum, d) => sum + d.moisture, 0) / sensorData.length;
    const avgLight = sensorData.reduce((sum, d) => sum + d.light, 0) / sensorData.length;
    
    // 计算趋势
    const moistureTrend = this.calculateTrend(sensorData.map(d => d.moisture));
    const lightTrend = this.calculateTrend(sensorData.map(d => d.light));
    
    // 计算健康分数
    const healthScore = this.calculateHealthScore(sensorData);
    
    // 确定整体健康状态
    const overallHealth = this.determineOverallHealth(healthScore);
    
    // 生成建议
    const recommendations = this.generateRecommendations(sensorData, userActions);
    
    // 计算警报数量
    const alertCount = sensorData.filter(d => d.alertTriggered).length;
    
    // 计算用户操作效果
    const userActionEffectiveness = this.calculateUserActionEffectiveness(userActions);
    
    return {
      deviceId,
      period: { startDate, endDate },
      overallHealth,
      healthScore,
      trends: {
        moisture: {
          average: avgMoisture,
          trend: moistureTrend.direction,
          changeRate: moistureTrend.rate
        },
        light: {
          average: avgLight,
          trend: lightTrend.direction,
          changeRate: lightTrend.rate
        }
      },
      recommendations,
      alertCount,
      userActionEffectiveness
    };
  }

  /**
   * 计算数据趋势
   */
  private calculateTrend(values: number[]): { direction: 'improving' | 'stable' | 'declining'; rate: number } {
    if (values.length < 2) {
      return { direction: 'stable', rate: 0 };
    }
    
    // 使用线性回归计算趋势
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    let direction: 'improving' | 'stable' | 'declining';
    if (Math.abs(slope) < 0.1) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'improving';
    } else {
      direction = 'declining';
    }
    
    return { direction, rate: Math.abs(slope) };
  }

  /**
   * 计算健康分数
   */
  private calculateHealthScore(sensorData: ISensorData[]): number {
    const healthyCount = sensorData.filter(d => d.isHealthy).length;
    const totalCount = sensorData.length;
    
    const baseScore = (healthyCount / totalCount) * 100;
    
    // 考虑数据变化的稳定性
    const moistureValues = sensorData.map(d => d.moisture);
    const lightValues = sensorData.map(d => d.light);
    
    const moistureStability = this.calculateStability(moistureValues);
    const lightStability = this.calculateStability(lightValues);
    
    const stabilityBonus = (moistureStability + lightStability) / 2 * 10;
    
    return Math.min(100, Math.max(0, baseScore + stabilityBonus));
  }

  /**
   * 计算数据稳定性
   */
  private calculateStability(values: number[]): number {
    if (values.length < 2) return 1;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 标准差越小，稳定性越高
    const stability = Math.max(0, 1 - standardDeviation / mean);
    return stability;
  }

  /**
   * 确定整体健康状态
   */
  private determineOverallHealth(healthScore: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (healthScore >= 90) return 'excellent';
    if (healthScore >= 75) return 'good';
    if (healthScore >= 60) return 'fair';
    if (healthScore >= 40) return 'poor';
    return 'critical';
  }
  /**
   * 生成建议
   */
  private generateRecommendations(sensorData: ISensorData[], userActions: IUserAction[]): string[] {
    const recommendations: string[] = [];
    const latestData = sensorData[sensorData.length - 1];
    
    // 基于最新数据的建议
    if (latestData.needsWater) {
      recommendations.push('植物需要浇水');
    }
    
    if (latestData.needsLight) {
      recommendations.push('植物需要更多光照');
    }
    
    // 基于用户操作效果的建议
    const wateringActions = userActions.filter(a => a.actionType === 'water');
    if (wateringActions.length > 0) {
      const effectiveWatering = wateringActions.filter(a => a.effectiveness === 'positive').length;
      const wateringEffectiveness = effectiveWatering / wateringActions.length;
      
      if (wateringEffectiveness < 0.5) {
        recommendations.push('考虑调整浇水量或浇水时间');
      }
    }
    
    return recommendations;
  }

  /**
   * 计算用户操作效果
   */
  private calculateUserActionEffectiveness(userActions: IUserAction[]): number {
    if (userActions.length === 0) return 50; // 默认中等效果
    
    const effectiveActions = userActions.filter(a => a.effectiveness === 'positive').length;
    return (effectiveActions / userActions.length) * 100;
  }

  /**
   * 检测突然下降
   */
  private detectSuddenDrops(sensorData: ISensorData[]): AnomalyPattern[] {
    const anomalies: AnomalyPattern[] = [];
    
    for (let i = 1; i < sensorData.length; i++) {
      const current = sensorData[i];
      const previous = sensorData[i - 1];
      
      const moistureDrop = previous.moisture - current.moisture;
      const lightDrop = previous.light - current.light;
      
      if (moistureDrop > 20) { // 湿度突然下降超过20%
        anomalies.push({
          deviceId: current.deviceId,
          patternType: 'sudden_drop',
          severity: moistureDrop > 40 ? 'critical' : moistureDrop > 30 ? 'high' : 'medium',
          detectedAt: current.timestamp,
          affectedMetrics: ['moisture'],
          description: `土壤湿度在短时间内下降了${moistureDrop.toFixed(1)}%`,
          suggestedActions: ['检查土壤排水情况', '确认浇水系统正常工作'],
          confidence: Math.min(95, 60 + moistureDrop)
        });
      }
      
      if (lightDrop > 200) { // 光照突然下降超过200lux
        anomalies.push({
          deviceId: current.deviceId,
          patternType: 'sudden_drop',
          severity: lightDrop > 500 ? 'high' : 'medium',
          detectedAt: current.timestamp,
          affectedMetrics: ['light'],
          description: `光照强度突然下降了${lightDrop.toFixed(0)}lux`,
          suggestedActions: ['检查植物位置是否被遮挡', '确认照明设备正常工作'],
          confidence: Math.min(90, 50 + lightDrop / 10)
        });
      }
    }
    
    return anomalies;
  }

  /**
   * 检测渐进式下降
   */
  private detectGradualDeclines(sensorData: ISensorData[]): AnomalyPattern[] {
    const anomalies: AnomalyPattern[] = [];
    
    if (sensorData.length < 10) return anomalies;
    
    const moistureValues = sensorData.map(d => d.moisture);
    const lightValues = sensorData.map(d => d.light);
    
    const moistureTrend = this.calculateTrend(moistureValues);
    const lightTrend = this.calculateTrend(lightValues);
    
    if (moistureTrend.direction === 'declining' && moistureTrend.rate > 1) {
      anomalies.push({
        deviceId: sensorData[0].deviceId,
        patternType: 'gradual_decline',
        severity: moistureTrend.rate > 3 ? 'high' : moistureTrend.rate > 2 ? 'medium' : 'low',
        detectedAt: sensorData[sensorData.length - 1].timestamp,
        affectedMetrics: ['moisture'],
        description: `土壤湿度持续下降，下降速率为${moistureTrend.rate.toFixed(2)}%/天`,
        suggestedActions: ['增加浇水频率', '检查植物根系健康状况'],
        confidence: Math.min(85, 40 + moistureTrend.rate * 10)
      });
    }
    
    if (lightTrend.direction === 'declining' && lightTrend.rate > 10) {
      anomalies.push({
        deviceId: sensorData[0].deviceId,
        patternType: 'gradual_decline',
        severity: lightTrend.rate > 50 ? 'high' : lightTrend.rate > 25 ? 'medium' : 'low',
        detectedAt: sensorData[sensorData.length - 1].timestamp,
        affectedMetrics: ['light'],
        description: `光照强度持续下降，下降速率为${lightTrend.rate.toFixed(1)}lux/天`,
        suggestedActions: ['调整植物位置', '考虑使用补光设备'],
        confidence: Math.min(80, 30 + lightTrend.rate)
      });
    }
    
    return anomalies;
  }

  /**
   * 检测不规律波动
   */
  private detectIrregularFluctuations(sensorData: ISensorData[]): AnomalyPattern[] {
    const anomalies: AnomalyPattern[] = [];
    
    const moistureValues = sensorData.map(d => d.moisture);
    const lightValues = sensorData.map(d => d.light);
    
    const moistureStability = this.calculateStability(moistureValues);
    const lightStability = this.calculateStability(lightValues);
    
    if (moistureStability < 0.3) {
      anomalies.push({
        deviceId: sensorData[0].deviceId,
        patternType: 'irregular_fluctuation',
        severity: moistureStability < 0.1 ? 'high' : moistureStability < 0.2 ? 'medium' : 'low',
        detectedAt: sensorData[sensorData.length - 1].timestamp,
        affectedMetrics: ['moisture'],
        description: '土壤湿度波动异常，可能存在浇水不规律或排水问题',
        suggestedActions: ['建立规律的浇水计划', '检查土壤质量和排水系统'],
        confidence: Math.min(75, (1 - moistureStability) * 100)
      });
    }
    
    if (lightStability < 0.3) {
      anomalies.push({
        deviceId: sensorData[0].deviceId,
        patternType: 'irregular_fluctuation',
        severity: lightStability < 0.1 ? 'high' : lightStability < 0.2 ? 'medium' : 'low',
        detectedAt: sensorData[sensorData.length - 1].timestamp,
        affectedMetrics: ['light'],
        description: '光照强度波动异常，可能存在遮挡或照明设备问题',
        suggestedActions: ['确保植物位置稳定', '检查照明设备工作状态'],
        confidence: Math.min(70, (1 - lightStability) * 100)
      });
    }
    
    return anomalies;
  }

  /**
   * 检测传感器故障
   */
  private detectSensorMalfunctions(sensorData: ISensorData[]): AnomalyPattern[] {
    const anomalies: AnomalyPattern[] = [];
    
    // 检测数值异常（如负值、超出合理范围）
    const invalidData = sensorData.filter(d => 
      d.moisture < 0 || d.moisture > 100 || 
      d.light < 0 || d.light > 10000 ||
      (d.temperature && (d.temperature < -20 || d.temperature > 60))
    );
    
    if (invalidData.length > 0) {
      anomalies.push({
        deviceId: sensorData[0].deviceId,
        patternType: 'sensor_malfunction',
        severity: 'critical',
        detectedAt: invalidData[0].timestamp,
        affectedMetrics: ['moisture', 'light'],
        description: '检测到传感器数据异常，可能存在硬件故障',
        suggestedActions: ['检查传感器连接', '重启设备', '联系技术支持'],
        confidence: 95
      });
    }
    
    // 检测数据停滞（连续相同数值）
    const recentData = sensorData.slice(-10);
    if (recentData.length >= 5) {
      const moistureUnique = new Set(recentData.map(d => d.moisture)).size;
      const lightUnique = new Set(recentData.map(d => d.light)).size;
      
      if (moistureUnique === 1 || lightUnique === 1) {
        anomalies.push({
          deviceId: sensorData[0].deviceId,
          patternType: 'sensor_malfunction',
          severity: 'high',
          detectedAt: recentData[recentData.length - 1].timestamp,
          affectedMetrics: moistureUnique === 1 ? ['moisture'] : ['light'],
          description: '传感器数据长时间无变化，可能存在故障',
          suggestedActions: ['检查传感器是否正常工作', '清洁传感器', '重新校准设备'],
          confidence: 80
        });
      }
    }
    
    return anomalies;
  }
  /**
   * 生成洞察
   */
  private async generateInsights(
    deviceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PlantHealthReport['insights']> {
    const sensorData = await SensorData.find({
      deviceId,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: 1 });

    // 找出表现最好和最差的日期
    const dailyHealth = this.calculateDailyHealth(sensorData);
    const bestDays = dailyHealth
      .filter(d => d.healthScore >= 80)
      .map(d => d.date)
      .slice(0, 5);
    
    const worstDays = dailyHealth
      .filter(d => d.healthScore < 60)
      .map(d => d.date)
      .slice(0, 5);

    // 分析最佳护理计划
    const optimalCareSchedule = this.analyzeOptimalCareSchedule(sensorData);
    
    // 生成季节性调整建议
    const seasonalAdjustments = this.generateSeasonalAdjustments(new Date());

    return {
      bestPerformingDays: bestDays,
      worstPerformingDays: worstDays,
      optimalCareSchedule,
      seasonalAdjustments
    };
  }

  /**
   * 计算每日健康状况
   */
  private calculateDailyHealth(sensorData: ISensorData[]): { date: Date; healthScore: number }[] {
    const dailyData = new Map<string, ISensorData[]>();
    
    // 按日期分组
    sensorData.forEach(data => {
      const dateKey = data.timestamp.toISOString().split('T')[0];
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, []);
      }
      dailyData.get(dateKey)!.push(data);
    });
    
    // 计算每日健康分数
    return Array.from(dailyData.entries()).map(([dateStr, dayData]) => ({
      date: new Date(dateStr),
      healthScore: this.calculateHealthScore(dayData)
    })).sort((a, b) => b.healthScore - a.healthScore);
  }

  /**
   * 分析最佳护理计划
   */
  private analyzeOptimalCareSchedule(sensorData: ISensorData[]): {
    wateringFrequency: string;
    lightExposureRecommendation: string;
  } {
    const avgMoisture = sensorData.reduce((sum, d) => sum + d.moisture, 0) / sensorData.length;
    const avgLight = sensorData.reduce((sum, d) => sum + d.light, 0) / sensorData.length;
    
    let wateringFrequency: string;
    if (avgMoisture < 30) {
      wateringFrequency = '每1-2天浇水一次';
    } else if (avgMoisture < 50) {
      wateringFrequency = '每2-3天浇水一次';
    } else if (avgMoisture < 70) {
      wateringFrequency = '每3-4天浇水一次';
    } else {
      wateringFrequency = '每4-5天浇水一次';
    }
    
    let lightExposureRecommendation: string;
    if (avgLight < 300) {
      lightExposureRecommendation = '需要增加光照，建议使用植物生长灯';
    } else if (avgLight < 600) {
      lightExposureRecommendation = '适当增加光照时间，或移至更明亮的位置';
    } else if (avgLight < 1000) {
      lightExposureRecommendation = '当前光照充足，保持现有位置';
    } else {
      lightExposureRecommendation = '光照充足，注意避免过度暴晒';
    }
    
    return {
      wateringFrequency,
      lightExposureRecommendation
    };
  }

  /**
   * 生成季节性调整建议
   */
  private generateSeasonalAdjustments(currentDate: Date): string[] {
    const month = currentDate.getMonth() + 1; // 1-12
    const adjustments: string[] = [];
    
    if (month >= 3 && month <= 5) { // 春季
      adjustments.push('春季植物生长旺盛，可适当增加浇水频率');
      adjustments.push('注意观察新芽生长情况，及时调整光照');
    } else if (month >= 6 && month <= 8) { // 夏季
      adjustments.push('夏季温度较高，需要增加浇水频率');
      adjustments.push('避免中午强光直射，可适当遮阴');
      adjustments.push('注意通风，防止病虫害');
    } else if (month >= 9 && month <= 11) { // 秋季
      adjustments.push('秋季逐渐减少浇水频率');
      adjustments.push('准备过冬，可适当增加光照时间');
    } else { // 冬季
      adjustments.push('冬季减少浇水，防止根部腐烂');
      adjustments.push('增加室内光照时间，补充自然光不足');
      adjustments.push('注意保温，避免植物受冻');
    }
    
    return adjustments;
  }

  /**
   * 生成预测性警报
   */
  private async generatePredictiveAlerts(deviceId: string): Promise<PlantHealthReport['predictiveAlerts']> {
    const recentData = await SensorData.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(20);
    
    if (recentData.length === 0) {
      return {
        nextWateringNeeded: null,
        nextLightAdjustmentNeeded: null,
        potentialIssues: []
      };
    }
    
    const latestData = recentData[0];
    const moistureTrend = this.calculateTrend(recentData.map(d => d.moisture).reverse());
    const lightTrend = this.calculateTrend(recentData.map(d => d.light).reverse());
    
    // 预测下次浇水时间
    let nextWateringNeeded: Date | null = null;
    if (moistureTrend.direction === 'declining' && moistureTrend.rate > 0) {
      const daysUntilWatering = (latestData.moisture - 25) / moistureTrend.rate;
      if (daysUntilWatering > 0 && daysUntilWatering < 10) {
        nextWateringNeeded = new Date(Date.now() + daysUntilWatering * 24 * 60 * 60 * 1000);
      }
    }
    
    // 预测光照调整时间
    let nextLightAdjustmentNeeded: Date | null = null;
    if (lightTrend.direction === 'declining' && lightTrend.rate > 0) {
      const daysUntilAdjustment = (latestData.light - 400) / lightTrend.rate;
      if (daysUntilAdjustment > 0 && daysUntilAdjustment < 7) {
        nextLightAdjustmentNeeded = new Date(Date.now() + daysUntilAdjustment * 24 * 60 * 60 * 1000);
      }
    }
    
    // 潜在问题预警
    const potentialIssues: string[] = [];
    
    if (moistureTrend.direction === 'declining' && moistureTrend.rate > 2) {
      potentialIssues.push('土壤湿度下降过快，可能存在排水问题');
    }
    
    if (lightTrend.direction === 'declining' && lightTrend.rate > 20) {
      potentialIssues.push('光照强度持续下降，建议检查植物位置');
    }
    
    if (latestData.batteryLevel && latestData.batteryLevel < 20) {
      potentialIssues.push('设备电量不足，请及时充电');
    }
    
    return {
      nextWateringNeeded,
      nextLightAdjustmentNeeded,
      potentialIssues
    };
  }

  /**
   * 获取植物特定建议
   */
  private getPlantSpecificRecommendations(plantType: string, latestData: ISensorData): string[] {
    const recommendations: string[] = [];
    
    // 根据植物类型提供特定建议
    const plantLower = plantType.toLowerCase();
    
    if (plantLower.includes('多肉') || plantLower.includes('仙人掌')) {
      if (latestData.moisture > 60) {
        recommendations.push('多肉植物不需要太多水分，建议减少浇水频率');
      }
      recommendations.push('多肉植物喜欢充足的光照和良好的通风');
    } else if (plantLower.includes('绿萝') || plantLower.includes('吊兰')) {
      if (latestData.light < 300) {
        recommendations.push('绿萝类植物适合散射光环境，避免强光直射');
      }
      recommendations.push('保持土壤微湿，但不要积水');
    } else if (plantLower.includes('发财树') || plantLower.includes('橡皮树')) {
      recommendations.push('大型观叶植物需要稳定的环境，避免频繁移动');
      if (latestData.moisture < 40) {
        recommendations.push('保持土壤适度湿润，但要注意排水');
      }
    }
    
    return recommendations;
  }
}