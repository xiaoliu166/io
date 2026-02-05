/**
 * 用户交互记录服务
 * 负责记录和管理用户的照料行为和植物状态变化
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  CareRecord, 
  SensorData, 
  PlantStatus, 
  PlantState 
} from '@shared/types';
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface UserAction {
  id: string;
  deviceId: string;
  actionType: 'watered' | 'moved_to_light' | 'fertilized' | 'touched' | 'manual_check';
  timestamp: Date;
  location?: string;
  notes?: string;
  sensorDataBefore?: SensorData;
  sensorDataAfter?: SensorData;
  plantStatusBefore?: PlantStatus;
  plantStatusAfter?: PlantStatus;
  duration?: number; // 操作持续时间（毫秒）
  effectiveness?: 'positive' | 'negative' | 'neutral'; // 操作效果评估
}

export interface PlantStatusChange {
  id: string;
  deviceId: string;
  timestamp: Date;
  previousState: PlantState;
  newState: PlantState;
  trigger: 'sensor_change' | 'user_action' | 'system_update';
  relatedActionId?: string;
  sensorData?: SensorData;
}

export interface InteractionSummary {
  deviceId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalActions: number;
  actionsByType: Record<string, number>;
  statusChanges: number;
  averageResponseTime: number; // 从状态变化到用户响应的平均时间
  careFrequency: number; // 照料频率（次/天）
  effectivenessScore: number; // 照料效果评分
}

export interface CarePattern {
  actionType: string;
  frequency: number; // 频率（次/周）
  averageInterval: number; // 平均间隔（小时）
  preferredTime: string; // 偏好时间段
  effectiveness: number; // 效果评分
}

export class UserInteractionService {
  private readonly USER_ACTIONS_KEY = 'user_actions';
  private readonly STATUS_CHANGES_KEY = 'status_changes';
  private readonly INTERACTION_SUMMARY_KEY = 'interaction_summary';

  /**
   * 记录用户操作
   */
  async recordUserAction(action: Omit<UserAction, 'id' | 'timestamp'>): Promise<string> {
    try {
      const actionId = this.generateId();
      const userAction: UserAction = {
        ...action,
        id: actionId,
        timestamp: new Date(),
      };

      // 保存操作记录
      await this.saveUserAction(userAction);

      // 创建对应的照料记录
      const careRecord: CareRecord = {
        id: actionId,
        deviceId: action.deviceId,
        action: action.actionType,
        timestamp: userAction.timestamp,
        sensorDataBefore: action.sensorDataBefore!,
        sensorDataAfter: action.sensorDataAfter,
        notes: action.notes,
      };

      // 保存到数据可视化服务（如果需要）
      // await dataVisualizationService.saveCareRecord(careRecord);

      console.log('User action recorded:', actionId);
      return actionId;
    } catch (error) {
      console.error('Failed to record user action:', error);
      throw error;
    }
  }

  /**
   * 记录植物状态变化
   */
  async recordStatusChange(change: Omit<PlantStatusChange, 'id' | 'timestamp'>): Promise<string> {
    try {
      const changeId = this.generateId();
      const statusChange: PlantStatusChange = {
        ...change,
        id: changeId,
        timestamp: new Date(),
      };

      await this.saveStatusChange(statusChange);

      console.log('Status change recorded:', changeId);
      return changeId;
    } catch (error) {
      console.error('Failed to record status change:', error);
      throw error;
    }
  }

  /**
   * 获取用户操作历史
   */
  async getUserActionHistory(
    deviceId: string, 
    days: number = 30
  ): Promise<UserAction[]> {
    try {
      const key = `${this.USER_ACTIONS_KEY}_${deviceId}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (!stored) {
        return [];
      }

      const allActions: UserAction[] = JSON.parse(stored).map((action: any) => ({
        ...action,
        timestamp: new Date(action.timestamp),
      }));

      const cutoffTime = subDays(new Date(), days);
      
      return allActions
        .filter(action => action.timestamp >= cutoffTime)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Failed to get user action history:', error);
      return [];
    }
  }

  /**
   * 获取植物状态变化历史
   */
  async getStatusChangeHistory(
    deviceId: string, 
    days: number = 30
  ): Promise<PlantStatusChange[]> {
    try {
      const key = `${this.STATUS_CHANGES_KEY}_${deviceId}`;
      const stored = await AsyncStorage.getItem(key);
      
      if (!stored) {
        return [];
      }

      const allChanges: PlantStatusChange[] = JSON.parse(stored).map((change: any) => ({
        ...change,
        timestamp: new Date(change.timestamp),
      }));

      const cutoffTime = subDays(new Date(), days);
      
      return allChanges
        .filter(change => change.timestamp >= cutoffTime)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Failed to get status change history:', error);
      return [];
    }
  }

  /**
   * 生成交互摘要
   */
  async generateInteractionSummary(
    deviceId: string, 
    days: number = 7
  ): Promise<InteractionSummary> {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      const actions = await this.getUserActionHistory(deviceId, days);
      const statusChanges = await this.getStatusChangeHistory(deviceId, days);

      // 统计操作类型
      const actionsByType: Record<string, number> = {};
      actions.forEach(action => {
        actionsByType[action.actionType] = (actionsByType[action.actionType] || 0) + 1;
      });

      // 计算平均响应时间
      const responseTime = this.calculateAverageResponseTime(actions, statusChanges);

      // 计算照料频率
      const careFrequency = actions.length / days;

      // 计算效果评分
      const effectivenessScore = this.calculateEffectivenessScore(actions);

      return {
        deviceId,
        period: { start: startDate, end: endDate },
        totalActions: actions.length,
        actionsByType,
        statusChanges: statusChanges.length,
        averageResponseTime: responseTime,
        careFrequency,
        effectivenessScore,
      };
    } catch (error) {
      console.error('Failed to generate interaction summary:', error);
      throw error;
    }
  }

  /**
   * 分析照料模式
   */
  async analyzeCarePatterns(deviceId: string, days: number = 30): Promise<CarePattern[]> {
    try {
      const actions = await this.getUserActionHistory(deviceId, days);
      const patterns: CarePattern[] = [];

      // 按操作类型分组
      const actionsByType = this.groupActionsByType(actions);

      for (const [actionType, typeActions] of Object.entries(actionsByType)) {
        if (typeActions.length < 2) continue;

        // 计算频率
        const frequency = (typeActions.length / days) * 7; // 转换为每周频率

        // 计算平均间隔
        const intervals = this.calculateIntervals(typeActions);
        const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length / (1000 * 60 * 60); // 转换为小时

        // 分析偏好时间
        const preferredTime = this.analyzePreferredTime(typeActions);

        // 计算效果评分
        const effectiveness = this.calculateActionEffectiveness(typeActions);

        patterns.push({
          actionType,
          frequency,
          averageInterval,
          preferredTime,
          effectiveness,
        });
      }

      return patterns.sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      console.error('Failed to analyze care patterns:', error);
      return [];
    }
  }

  /**
   * 获取今日操作统计
   */
  async getTodayActionStats(deviceId: string) {
    try {
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);

      const actions = await this.getUserActionHistory(deviceId, 1);
      const todayActions = actions.filter(action => 
        isWithinInterval(action.timestamp, { start: startOfToday, end: endOfToday })
      );

      const statusChanges = await this.getStatusChangeHistory(deviceId, 1);
      const todayStatusChanges = statusChanges.filter(change => 
        isWithinInterval(change.timestamp, { start: startOfToday, end: endOfToday })
      );

      return {
        totalActions: todayActions.length,
        actionsByType: this.groupActionsByType(todayActions),
        statusChanges: todayStatusChanges.length,
        lastAction: todayActions[0] || null,
        lastStatusChange: todayStatusChanges[0] || null,
      };
    } catch (error) {
      console.error('Failed to get today action stats:', error);
      return null;
    }
  }

  /**
   * 获取操作建议
   */
  async getActionRecommendations(deviceId: string): Promise<string[]> {
    try {
      const patterns = await this.analyzeCarePatterns(deviceId, 14);
      const recentActions = await this.getUserActionHistory(deviceId, 3);
      const recommendations: string[] = [];

      // 基于照料模式的建议
      for (const pattern of patterns) {
        const lastAction = recentActions.find(action => action.actionType === pattern.actionType);
        
        if (!lastAction) {
          recommendations.push(`建议进行${this.getActionDisplayName(pattern.actionType)}`);
          continue;
        }

        const hoursSinceLastAction = (Date.now() - lastAction.timestamp.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastAction > pattern.averageInterval * 1.5) {
          recommendations.push(
            `距离上次${this.getActionDisplayName(pattern.actionType)}已过${Math.round(hoursSinceLastAction)}小时，建议检查是否需要照料`
          );
        }
      }

      // 基于时间的建议
      const currentHour = new Date().getHours();
      if (currentHour >= 8 && currentHour <= 10) {
        const morningActions = recentActions.filter(action => {
          const actionHour = action.timestamp.getHours();
          return actionHour >= 8 && actionHour <= 10;
        });
        
        if (morningActions.length === 0) {
          recommendations.push('早上是检查植物状态的好时机');
        }
      }

      if (recommendations.length === 0) {
        recommendations.push('植物照料情况良好，继续保持');
      }

      return recommendations.slice(0, 3); // 最多返回3个建议
    } catch (error) {
      console.error('Failed to get action recommendations:', error);
      return ['暂无建议'];
    }
  }
  /**
   * 保存用户操作
   */
  private async saveUserAction(action: UserAction): Promise<void> {
    try {
      const key = `${this.USER_ACTIONS_KEY}_${action.deviceId}`;
      const existing = await this.getUserActionHistory(action.deviceId, 90); // 保留90天
      
      const updated = [action, ...existing].slice(0, 1000); // 限制数量
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save user action:', error);
      throw error;
    }
  }

  /**
   * 保存状态变化
   */
  private async saveStatusChange(change: PlantStatusChange): Promise<void> {
    try {
      const key = `${this.STATUS_CHANGES_KEY}_${change.deviceId}`;
      const existing = await this.getStatusChangeHistory(change.deviceId, 90);
      
      const updated = [change, ...existing].slice(0, 1000);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save status change:', error);
      throw error;
    }
  }

  /**
   * 计算平均响应时间
   */
  private calculateAverageResponseTime(
    actions: UserAction[], 
    statusChanges: PlantStatusChange[]
  ): number {
    const responseTimes: number[] = [];

    for (const change of statusChanges) {
      if (change.trigger === 'sensor_change' && 
          (change.newState === PlantState.NEEDS_WATER || change.newState === PlantState.NEEDS_LIGHT)) {
        
        // 查找该状态变化后的第一个相关操作
        const relatedAction = actions.find(action => 
          action.timestamp > change.timestamp &&
          action.timestamp.getTime() - change.timestamp.getTime() < 24 * 60 * 60 * 1000 && // 24小时内
          ((change.newState === PlantState.NEEDS_WATER && action.actionType === 'watered') ||
           (change.newState === PlantState.NEEDS_LIGHT && action.actionType === 'moved_to_light'))
        );

        if (relatedAction) {
          const responseTime = relatedAction.timestamp.getTime() - change.timestamp.getTime();
          responseTimes.push(responseTime);
        }
      }
    }

    if (responseTimes.length === 0) return 0;
    
    const averageMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return Math.round(averageMs / (1000 * 60)); // 转换为分钟
  }

  /**
   * 计算效果评分
   */
  private calculateEffectivenessScore(actions: UserAction[]): number {
    if (actions.length === 0) return 0;

    const effectiveActions = actions.filter(action => action.effectiveness === 'positive').length;
    const ineffectiveActions = actions.filter(action => action.effectiveness === 'negative').length;
    
    if (effectiveActions + ineffectiveActions === 0) return 50; // 中性评分
    
    return Math.round((effectiveActions / (effectiveActions + ineffectiveActions)) * 100);
  }

  /**
   * 按类型分组操作
   */
  private groupActionsByType(actions: UserAction[]): Record<string, UserAction[]> {
    return actions.reduce((groups, action) => {
      const type = action.actionType;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(action);
      return groups;
    }, {} as Record<string, UserAction[]>);
  }

  /**
   * 计算操作间隔
   */
  private calculateIntervals(actions: UserAction[]): number[] {
    if (actions.length < 2) return [];

    const sortedActions = actions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const intervals: number[] = [];

    for (let i = 1; i < sortedActions.length; i++) {
      const interval = sortedActions[i].timestamp.getTime() - sortedActions[i - 1].timestamp.getTime();
      intervals.push(interval);
    }

    return intervals;
  }

  /**
   * 分析偏好时间
   */
  private analyzePreferredTime(actions: UserAction[]): string {
    const hourCounts: Record<number, number> = {};

    actions.forEach(action => {
      const hour = action.timestamp.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(hourCounts));
    const preferredHour = parseInt(Object.keys(hourCounts).find(hour => hourCounts[parseInt(hour)] === maxCount) || '12');

    if (preferredHour >= 6 && preferredHour < 12) {
      return '上午';
    } else if (preferredHour >= 12 && preferredHour < 18) {
      return '下午';
    } else if (preferredHour >= 18 && preferredHour < 22) {
      return '晚上';
    } else {
      return '深夜';
    }
  }

  /**
   * 计算操作效果
   */
  private calculateActionEffectiveness(actions: UserAction[]): number {
    const effectiveCount = actions.filter(action => action.effectiveness === 'positive').length;
    const totalCount = actions.filter(action => action.effectiveness !== undefined).length;
    
    if (totalCount === 0) return 50;
    
    return Math.round((effectiveCount / totalCount) * 100);
  }

  /**
   * 获取操作显示名称
   */
  private getActionDisplayName(actionType: string): string {
    const displayNames: Record<string, string> = {
      watered: '浇水',
      moved_to_light: '移至光照处',
      fertilized: '施肥',
      touched: '触摸互动',
      manual_check: '手动检查',
    };
    
    return displayNames[actionType] || actionType;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 评估操作效果
   */
  async evaluateActionEffectiveness(
    actionId: string,
    sensorDataAfter: SensorData,
    plantStatusAfter: PlantStatus
  ): Promise<void> {
    try {
      // 这里需要根据具体的操作类型和前后数据变化来评估效果
      // 简化实现，实际应用中需要更复杂的逻辑
      
      const actions = await this.getUserActionHistory(plantStatusAfter.state as any, 1);
      const action = actions.find(a => a.id === actionId);
      
      if (!action || !action.sensorDataBefore) return;

      let effectiveness: 'positive' | 'negative' | 'neutral' = 'neutral';

      switch (action.actionType) {
        case 'watered':
          if (sensorDataAfter.soilHumidity > action.sensorDataBefore.soilHumidity) {
            effectiveness = 'positive';
          } else {
            effectiveness = 'negative';
          }
          break;
          
        case 'moved_to_light':
          if (sensorDataAfter.lightIntensity > action.sensorDataBefore.lightIntensity) {
            effectiveness = 'positive';
          } else {
            effectiveness = 'negative';
          }
          break;
          
        default:
          effectiveness = 'neutral';
      }

      // 更新操作记录
      action.effectiveness = effectiveness;
      action.sensorDataAfter = sensorDataAfter;
      action.plantStatusAfter = plantStatusAfter;
      
      await this.saveUserAction(action);
    } catch (error) {
      console.error('Failed to evaluate action effectiveness:', error);
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupOldData(deviceId: string, keepDays: number = 90): Promise<void> {
    try {
      const cutoffTime = subDays(new Date(), keepDays);

      // 清理用户操作
      const actions = await this.getUserActionHistory(deviceId, keepDays + 7);
      const filteredActions = actions.filter(action => action.timestamp >= cutoffTime);
      
      const actionsKey = `${this.USER_ACTIONS_KEY}_${deviceId}`;
      await AsyncStorage.setItem(actionsKey, JSON.stringify(filteredActions));

      // 清理状态变化
      const statusChanges = await this.getStatusChangeHistory(deviceId, keepDays + 7);
      const filteredStatusChanges = statusChanges.filter(change => change.timestamp >= cutoffTime);
      
      const statusKey = `${this.STATUS_CHANGES_KEY}_${deviceId}`;
      await AsyncStorage.setItem(statusKey, JSON.stringify(filteredStatusChanges));

      console.log(`Cleaned up interaction data for device ${deviceId}, kept ${keepDays} days`);
    } catch (error) {
      console.error('Failed to cleanup old interaction data:', error);
      throw error;
    }
  }

  /**
   * 导出交互数据
   */
  async exportInteractionData(deviceId: string, days: number = 30): Promise<string> {
    try {
      const actions = await this.getUserActionHistory(deviceId, days);
      const statusChanges = await this.getStatusChangeHistory(deviceId, days);

      let csv = 'Type,Timestamp,Action/Status,Notes,Effectiveness\n';

      // 添加用户操作
      for (const action of actions) {
        const timestamp = format(action.timestamp, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
        const effectiveness = action.effectiveness || 'unknown';
        const notes = (action.notes || '').replace(/,/g, ';'); // 替换逗号避免CSV格式问题
        
        csv += `Action,${timestamp},${action.actionType},${notes},${effectiveness}\n`;
      }

      // 添加状态变化
      for (const change of statusChanges) {
        const timestamp = format(change.timestamp, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
        const statusChange = `${change.previousState} -> ${change.newState}`;
        
        csv += `Status Change,${timestamp},${statusChange},${change.trigger},\n`;
      }

      return csv;
    } catch (error) {
      console.error('Failed to export interaction data:', error);
      throw error;
    }
  }
}