/**
 * AI智能植物养护机器人 - 提醒管理器属性测试
 * 使用fast-check进行基于属性的测试
 */

import * as fc from 'fast-check';

// 提醒类型枚举
enum AlertType {
  NONE = 'none',
  NEEDS_WATER = 'needs_water',
  NEEDS_LIGHT = 'needs_light',
  LOW_BATTERY = 'low_battery',
  SENSOR_ERROR = 'sensor_error',
  CRITICAL = 'critical'
}

// 提醒状态枚举
enum AlertState {
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  SNOOZED = 'snoozed'
}

// 提醒信息接口
interface AlertInfo {
  type: AlertType;
  state: AlertState;
  startTime: number;
  lastAlertTime: number;
  acknowledgeTime: number;
  repeatCount: number;
  isUrgent: boolean;
  message: string;
}

// 模拟的提醒管理器
class MockAlertManager {
  private currentAlert: AlertInfo;
  private alertDelay: number = 30 * 60 * 1000; // 30分钟
  private repeatInterval: number = 2 * 60 * 60 * 1000; // 2小时
  private snoozeTime: number = 30 * 60 * 1000; // 30分钟
  private maxRepeatCount: number = 10;
  private isEnabled: boolean = true;
  private isAlerting: boolean = false;
  private currentTime: number = 0;
  
  // 统计信息
  private totalAlerts: number = 0;
  private totalAcknowledgments: number = 0;
  private totalSnoozes: number = 0;
  
  // 回调函数
  private alertCallback: ((alert: AlertInfo) => void) | null = null;
  private stopCallback: ((alert: AlertInfo) => void) | null = null;

  constructor() {
    this.currentAlert = {
      type: AlertType.NONE,
      state: AlertState.INACTIVE,
      startTime: 0,
      lastAlertTime: 0,
      acknowledgeTime: 0,
      repeatCount: 0,
      isUrgent: false,
      message: ''
    };
  }

  // 设置当前时间（用于测试）
  setCurrentTime(time: number): void {
    this.currentTime = time;
  }

  // 报告异常状态
  reportAbnormalState(type: AlertType, isUrgent: boolean = false): void {
    if (!this.isEnabled || type === AlertType.NONE) {
      return;
    }

    // 如果是新的异常类型或者从正常状态转为异常状态
    if (this.currentAlert.type !== type || this.currentAlert.state === AlertState.INACTIVE) {
      this.currentAlert = {
        type,
        state: AlertState.PENDING,
        startTime: this.currentTime,
        lastAlertTime: 0,
        acknowledgeTime: 0,
        repeatCount: 0,
        isUrgent,
        message: this.getAlertMessage(type)
      };
    }

    // 更新紧急状态
    if (isUrgent && !this.currentAlert.isUrgent) {
      this.currentAlert.isUrgent = true;
    }
  }

  // 报告正常状态
  reportNormalState(): void {
    if (this.currentAlert.state !== AlertState.INACTIVE) {
      if (this.isAlerting) {
        this.stopAlert();
      }
      
      this.currentAlert = {
        type: AlertType.NONE,
        state: AlertState.INACTIVE,
        startTime: 0,
        lastAlertTime: 0,
        acknowledgeTime: 0,
        repeatCount: 0,
        isUrgent: false,
        message: ''
      };
    }
  }

  // 用户确认提醒
  acknowledgeAlert(): void {
    if (this.currentAlert.state === AlertState.ACTIVE) {
      this.currentAlert.state = AlertState.ACKNOWLEDGED;
      this.currentAlert.acknowledgeTime = this.currentTime;
      this.totalAcknowledgments++;
      
      if (this.isAlerting) {
        this.stopAlert();
      }
    }
  }

  // 暂停提醒
  snoozeAlert(duration: number = 0): void {
    if (this.currentAlert.state === AlertState.ACTIVE) {
      const snoozeDuration = duration > 0 ? duration : this.snoozeTime;
      
      this.currentAlert.state = AlertState.SNOOZED;
      this.currentAlert.acknowledgeTime = this.currentTime;
      this.totalSnoozes++;
      
      if (this.isAlerting) {
        this.stopAlert();
      }
      
      // 设置下次提醒时间
      this.currentAlert.lastAlertTime = this.currentTime - this.repeatInterval + snoozeDuration;
    }
  }

  // 更新提醒状态
  update(): void {
    if (!this.isEnabled) {
      return;
    }

    this.updateAlertState();

    // 检查是否需要触发提醒
    if (this.shouldTriggerAlert()) {
      this.triggerAlert();
    }

    // 检查是否需要重复提醒
    if (this.shouldRepeatAlert()) {
      this.triggerAlert();
    }
  }

  private updateAlertState(): void {
    if (this.currentAlert.state === AlertState.INACTIVE) {
      return;
    }

    const abnormalDuration = this.currentTime - this.currentAlert.startTime;

    switch (this.currentAlert.state) {
      case AlertState.PENDING:
        // 检查是否到了提醒时间
        if (abnormalDuration >= this.alertDelay || this.currentAlert.isUrgent) {
          this.triggerAlert();
        }
        break;

      case AlertState.ACKNOWLEDGED:
        // 已确认状态，检查是否需要重新进入等待状态
        if (this.currentTime - this.currentAlert.acknowledgeTime > this.snoozeTime) {
          this.currentAlert.state = AlertState.PENDING;
        }
        break;

      case AlertState.SNOOZED:
        // 暂停状态，检查是否可以重新提醒
        if (this.currentTime - this.currentAlert.acknowledgeTime > this.snoozeTime) {
          this.currentAlert.state = AlertState.PENDING;
        }
        break;

      case AlertState.ACTIVE:
        // 活跃状态，检查是否达到最大重复次数
        if (this.currentAlert.repeatCount >= this.maxRepeatCount) {
          this.currentAlert.state = AlertState.ACKNOWLEDGED;
          this.currentAlert.acknowledgeTime = this.currentTime;
          this.stopAlert();
        }
        break;
    }
  }

  private shouldTriggerAlert(): boolean {
    if (!this.isEnabled || this.isAlerting || this.currentAlert.state !== AlertState.PENDING) {
      return false;
    }

    const abnormalDuration = this.currentTime - this.currentAlert.startTime;
    return this.currentAlert.isUrgent || (abnormalDuration >= this.alertDelay);
  }

  private shouldRepeatAlert(): boolean {
    if (!this.isEnabled || !this.isAlerting || this.currentAlert.state !== AlertState.ACTIVE) {
      return false;
    }

    if (this.currentAlert.repeatCount >= this.maxRepeatCount) {
      return false;
    }

    const timeSinceLastAlert = this.currentTime - this.currentAlert.lastAlertTime;
    return timeSinceLastAlert >= this.repeatInterval;
  }

  private triggerAlert(): void {
    if (!this.isEnabled || this.currentAlert.type === AlertType.NONE) {
      return;
    }

    this.currentAlert.state = AlertState.ACTIVE;
    this.currentAlert.lastAlertTime = this.currentTime;
    this.currentAlert.repeatCount++;
    this.totalAlerts++;
    this.isAlerting = true;

    if (this.alertCallback) {
      this.alertCallback(this.currentAlert);
    }
  }

  private stopAlert(): void {
    if (this.isAlerting) {
      this.isAlerting = false;
      
      if (this.stopCallback) {
        this.stopCallback(this.currentAlert);
      }
    }
  }

  private getAlertMessage(type: AlertType): string {
    switch (type) {
      case AlertType.NEEDS_WATER:
        return '植物需要浇水';
      case AlertType.NEEDS_LIGHT:
        return '植物需要更多光照';
      case AlertType.LOW_BATTERY:
        return '电池电量不足';
      case AlertType.SENSOR_ERROR:
        return '传感器故障';
      case AlertType.CRITICAL:
        return '植物状态严重';
      default:
        return '未知提醒';
    }
  }

  // 公共方法
  getCurrentAlert(): AlertInfo {
    return { ...this.currentAlert };
  }

  hasActiveAlert(): boolean {
    return this.currentAlert.state !== AlertState.INACTIVE;
  }

  isCurrentlyAlerting(): boolean {
    return this.isAlerting;
  }

  getAbnormalDuration(): number {
    if (this.currentAlert.state === AlertState.INACTIVE) {
      return 0;
    }
    return this.currentTime - this.currentAlert.startTime;
  }

  getTotalAlerts(): number {
    return this.totalAlerts;
  }

  getTotalAcknowledgments(): number {
    return this.totalAcknowledgments;
  }

  getTotalSnoozes(): number {
    return this.totalSnoozes;
  }

  setAlertCallback(callback: (alert: AlertInfo) => void): void {
    this.alertCallback = callback;
  }

  setStopCallback(callback: (alert: AlertInfo) => void): void {
    this.stopCallback = callback;
  }

  setAlertDelay(delay: number): void {
    this.alertDelay = delay;
  }

  setRepeatInterval(interval: number): void {
    this.repeatInterval = interval;
  }

  reset(): void {
    if (this.isAlerting) {
      this.stopAlert();
    }
    
    this.currentAlert = {
      type: AlertType.NONE,
      state: AlertState.INACTIVE,
      startTime: 0,
      lastAlertTime: 0,
      acknowledgeTime: 0,
      repeatCount: 0,
      isUrgent: false,
      message: ''
    };
  }
}

describe('提醒管理器属性测试', () => {
  let alertManager: MockAlertManager;
  
  beforeEach(() => {
    alertManager = new MockAlertManager();
  });

  /**
   * 属性 5: 主动提醒触发
   * 验证需求: 需求 3.1, 3.3
   */
  describe('属性 5: 主动提醒触发', () => {
    test('**验证需求: 需求 3.1, 3.3** - 异常状态持续30分钟后应触发提醒', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            AlertType.NEEDS_WATER,
            AlertType.NEEDS_LIGHT,
            AlertType.CRITICAL
          ),
          (alertType: AlertType) => {
            // 重新创建管理器确保干净状态
            alertManager = new MockAlertManager();
            
            // 设置初始时间
            alertManager.setCurrentTime(0);
            
            // 报告非紧急异常状态
            alertManager.reportAbnormalState(alertType, false);
            
            // 初始更新，不应触发提醒
            alertManager.update();
            
            // 验证初始状态为等待中
            let currentAlert = alertManager.getCurrentAlert();
            if (currentAlert.state !== AlertState.PENDING || alertManager.isCurrentlyAlerting()) {
              return false;
            }
            
            // 时间推进到30分钟后
            alertManager.setCurrentTime(30 * 60 * 1000 + 1000); // 30分钟+1秒
            alertManager.update();
            
            // 验证提醒已触发
            currentAlert = alertManager.getCurrentAlert();
            return currentAlert.state === AlertState.ACTIVE && 
                   alertManager.isCurrentlyAlerting() &&
                   currentAlert.repeatCount >= 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 3.1, 3.3** - 紧急状态应立即触发提醒', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            AlertType.NEEDS_WATER,
            AlertType.NEEDS_LIGHT,
            AlertType.CRITICAL
          ),
          (alertType: AlertType) => {
            // 重新创建管理器确保干净状态
            alertManager = new MockAlertManager();
            
            // 设置初始时间
            alertManager.setCurrentTime(0);
            
            // 报告紧急异常状态
            alertManager.reportAbnormalState(alertType, true);
            
            // 立即更新
            alertManager.update();
            
            // 验证立即触发提醒
            const currentAlert = alertManager.getCurrentAlert();
            return currentAlert.state === AlertState.ACTIVE && 
                   alertManager.isCurrentlyAlerting() &&
                   currentAlert.isUrgent &&
                   currentAlert.repeatCount >= 1;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性 6: 提醒确认停止
   * 验证需求: 需求 3.4
   */
  describe('属性 6: 提醒确认停止', () => {
    test('**验证需求: 需求 3.4** - 用户确认后应立即停止提醒', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            AlertType.NEEDS_WATER,
            AlertType.NEEDS_LIGHT,
            AlertType.CRITICAL
          ),
          (alertType: AlertType) => {
            // 重新创建管理器确保干净状态
            alertManager = new MockAlertManager();
            
            // 设置初始时间
            alertManager.setCurrentTime(0);
            
            // 报告紧急异常状态（立即触发）
            alertManager.reportAbnormalState(alertType, true);
            alertManager.update();
            
            // 验证提醒已激活
            if (!alertManager.isCurrentlyAlerting()) {
              return false;
            }
            
            // 用户确认提醒
            alertManager.acknowledgeAlert();
            
            // 验证提醒已停止
            const currentAlert = alertManager.getCurrentAlert();
            return currentAlert.state === AlertState.ACKNOWLEDGED && 
                   !alertManager.isCurrentlyAlerting() &&
                   alertManager.getTotalAcknowledgments() >= 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 3.4** - 暂停提醒应停止当前提醒', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            AlertType.NEEDS_WATER,
            AlertType.NEEDS_LIGHT,
            AlertType.CRITICAL
          ),
          (alertType: AlertType) => {
            // 重新创建管理器确保干净状态
            alertManager = new MockAlertManager();
            
            // 设置初始时间
            alertManager.setCurrentTime(0);
            
            // 报告紧急异常状态（立即触发）
            alertManager.reportAbnormalState(alertType, true);
            alertManager.update();
            
            // 验证提醒已激活
            if (!alertManager.isCurrentlyAlerting()) {
              return false;
            }
            
            // 暂停提醒
            alertManager.snoozeAlert();
            
            // 验证提醒已停止
            const currentAlert = alertManager.getCurrentAlert();
            return currentAlert.state === AlertState.SNOOZED && 
                   !alertManager.isCurrentlyAlerting() &&
                   alertManager.getTotalSnoozes() >= 1;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性 7: 重复提醒机制
   * 验证需求: 需求 3.5
   */
  describe('属性 7: 重复提醒机制', () => {
    test('**验证需求: 需求 3.5** - 未解决的异常状态应每2小时重复提醒', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            AlertType.NEEDS_WATER,
            AlertType.NEEDS_LIGHT,
            AlertType.CRITICAL
          ),
          (alertType: AlertType) => {
            // 重新创建管理器确保干净状态
            alertManager = new MockAlertManager();
            
            // 设置较短的重复间隔以便测试
            const repeatInterval = 10 * 60 * 1000; // 10分钟
            alertManager.setRepeatInterval(repeatInterval);
            
            // 设置初始时间
            alertManager.setCurrentTime(0);
            
            // 报告紧急异常状态（立即触发）
            alertManager.reportAbnormalState(alertType, true);
            alertManager.update();
            
            // 验证第一次提醒
            if (!alertManager.isCurrentlyAlerting() || alertManager.getCurrentAlert().repeatCount < 1) {
              return false;
            }
            
            // 时间推进到下一个重复间隔
            alertManager.setCurrentTime(repeatInterval + 1000); // 10分钟+1秒
            alertManager.update();
            
            // 验证重复提醒
            const currentAlert = alertManager.getCurrentAlert();
            return currentAlert.repeatCount >= 2 && alertManager.getTotalAlerts() >= 2;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('**验证需求: 需求 3.5** - 达到最大重复次数后应停止提醒', () => {
      // 使用简单的单元测试而不是属性测试
      const alertManager = new MockAlertManager();
      
      // 设置较短的重复间隔和较小的最大重复次数
      const repeatInterval = 5 * 60 * 1000; // 5分钟
      alertManager.setRepeatInterval(repeatInterval);
      
      // 设置初始时间
      alertManager.setCurrentTime(0);
      
      // 报告紧急异常状态
      alertManager.reportAbnormalState(AlertType.NEEDS_WATER, true);
      
      // 模拟多次更新直到达到最大重复次数
      for (let i = 0; i < 15; i++) { // 足够多的次数
        alertManager.setCurrentTime(i * repeatInterval);
        alertManager.update();
      }
      
      // 验证最终不再提醒
      expect(alertManager.isCurrentlyAlerting()).toBe(false);
      expect(alertManager.getCurrentAlert().repeatCount).toBeLessThanOrEqual(10); // 默认最大次数
    });
  });

  /**
   * 综合属性测试
   */
  describe('综合属性测试', () => {
    test('正常状态报告应清除所有提醒', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            AlertType.NEEDS_WATER,
            AlertType.NEEDS_LIGHT,
            AlertType.CRITICAL
          ),
          (alertType: AlertType) => {
            // 设置初始时间
            alertManager.setCurrentTime(0);
            
            // 报告异常状态并触发提醒
            alertManager.reportAbnormalState(alertType, true);
            alertManager.update();
            
            // 验证提醒已激活
            expect(alertManager.isCurrentlyAlerting()).toBe(true);
            
            // 报告正常状态
            alertManager.reportNormalState();
            
            // 验证所有提醒已清除
            const currentAlert = alertManager.getCurrentAlert();
            return currentAlert.type === AlertType.NONE &&
                   currentAlert.state === AlertState.INACTIVE &&
                   !alertManager.isCurrentlyAlerting() &&
                   !alertManager.hasActiveAlert();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('提醒状态转换的一致性', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            AlertType.NEEDS_WATER,
            AlertType.NEEDS_LIGHT,
            AlertType.CRITICAL
          ),
          fc.array(
            fc.constantFrom('report', 'acknowledge', 'snooze', 'normal'),
            { minLength: 1, maxLength: 10 }
          ),
          (alertType: AlertType, actions: string[]) => {
            // 设置初始时间
            alertManager.setCurrentTime(0);
            
            // 报告异常状态
            alertManager.reportAbnormalState(alertType, true);
            alertManager.update();
            
            let currentTime = 0;
            let isValid = true;
            
            for (const action of actions) {
              currentTime += 60000; // 每次增加1分钟
              alertManager.setCurrentTime(currentTime);
              
              switch (action) {
                case 'report':
                  alertManager.reportAbnormalState(alertType, false);
                  break;
                case 'acknowledge':
                  if (alertManager.isCurrentlyAlerting()) {
                    alertManager.acknowledgeAlert();
                  }
                  break;
                case 'snooze':
                  if (alertManager.isCurrentlyAlerting()) {
                    alertManager.snoozeAlert();
                  }
                  break;
                case 'normal':
                  alertManager.reportNormalState();
                  break;
              }
              
              alertManager.update();
              
              // 验证状态一致性
              const alert = alertManager.getCurrentAlert();
              if (alert.type !== AlertType.NONE && alert.state === AlertState.INACTIVE) {
                isValid = false;
                break;
              }
            }
            
            return isValid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});