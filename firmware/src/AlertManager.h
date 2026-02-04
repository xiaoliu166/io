/**
 * AI智能植物养护机器人 - 提醒管理器
 * 管理主动提醒逻辑，包括异常状态检测和重复提醒机制
 */

#ifndef ALERT_MANAGER_H
#define ALERT_MANAGER_H

#include <Arduino.h>
#include "config.h"

/**
 * 提醒类型
 */
enum class AlertType {
    NONE,           // 无提醒
    NEEDS_WATER,    // 需要浇水
    NEEDS_LIGHT,    // 需要光照
    LOW_BATTERY,    // 低电量
    SENSOR_ERROR,   // 传感器错误
    CRITICAL        // 严重状态
};

/**
 * 提醒状态
 */
enum class AlertState {
    INACTIVE,       // 未激活
    PENDING,        // 等待中（异常状态但未到提醒时间）
    ACTIVE,         // 激活中（正在提醒）
    ACKNOWLEDGED,   // 已确认（用户已响应）
    SNOOZED        // 暂停中（暂时停止提醒）
};

/**
 * 提醒信息结构
 */
struct AlertInfo {
    AlertType type;
    AlertState state;
    unsigned long startTime;        // 异常状态开始时间
    unsigned long lastAlertTime;    // 最后一次提醒时间
    unsigned long acknowledgeTime;  // 确认时间
    int repeatCount;                // 重复提醒次数
    bool isUrgent;                  // 是否紧急
    String message;                 // 提醒消息
};

/**
 * 提醒回调函数类型
 */
typedef void (*AlertCallback)(const AlertInfo& alert);

/**
 * 提醒管理器类
 */
class AlertManager {
private:
    // 当前提醒信息
    AlertInfo currentAlert;
    
    // 配置参数
    unsigned long alertDelay;           // 提醒延迟时间 (ms)
    unsigned long repeatInterval;       // 重复提醒间隔 (ms)
    unsigned long snoozeTime;          // 暂停时间 (ms)
    int maxRepeatCount;                // 最大重复次数
    
    // 状态变量
    bool isEnabled;
    bool isAlerting;
    unsigned long lastUpdateTime;
    
    // 回调函数
    AlertCallback alertCallback;
    AlertCallback stopCallback;
    
    // 统计信息
    unsigned long totalAlerts;
    unsigned long totalAcknowledgments;
    unsigned long totalSnoozes;
    
    // 私有方法
    void triggerAlert();
    void stopAlert();
    void updateAlertState();
    bool shouldTriggerAlert() const;
    bool shouldRepeatAlert() const;
    String getAlertMessage(AlertType type) const;

public:
    /**
     * 构造函数
     */
    AlertManager();
    
    /**
     * 析构函数
     */
    ~AlertManager();
    
    /**
     * 初始化提醒管理器
     * @return 初始化是否成功
     */
    bool initialize();
    
    /**
     * 更新提醒状态（应在主循环中调用）
     */
    void update();
    
    /**
     * 报告异常状态
     * @param type 提醒类型
     * @param isUrgent 是否紧急
     */
    void reportAbnormalState(AlertType type, bool isUrgent = false);
    
    /**
     * 报告正常状态（清除提醒）
     */
    void reportNormalState();
    
    /**
     * 用户确认提醒
     */
    void acknowledgeAlert();
    
    /**
     * 暂停提醒
     * @param duration 暂停时长 (ms)，0表示使用默认时长
     */
    void snoozeAlert(unsigned long duration = 0);
    
    /**
     * 获取当前提醒信息
     * @return 当前提醒信息
     */
    AlertInfo getCurrentAlert() const;
    
    /**
     * 检查是否有活跃的提醒
     * @return 是否有活跃的提醒
     */
    bool hasActiveAlert() const;
    
    /**
     * 检查是否正在提醒
     * @return 是否正在提醒
     */
    bool isCurrentlyAlerting() const;
    
    /**
     * 设置提醒回调函数
     * @param callback 提醒开始回调
     */
    void setAlertCallback(AlertCallback callback);
    
    /**
     * 设置停止回调函数
     * @param callback 提醒停止回调
     */
    void setStopCallback(AlertCallback callback);
    
    /**
     * 设置提醒延迟时间
     * @param delay 延迟时间 (ms)
     */
    void setAlertDelay(unsigned long delay);
    
    /**
     * 设置重复提醒间隔
     * @param interval 间隔时间 (ms)
     */
    void setRepeatInterval(unsigned long interval);
    
    /**
     * 设置暂停时间
     * @param time 暂停时间 (ms)
     */
    void setSnoozeTime(unsigned long time);
    
    /**
     * 设置最大重复次数
     * @param count 最大重复次数
     */
    void setMaxRepeatCount(int count);
    
    /**
     * 启用/禁用提醒管理器
     * @param enabled 是否启用
     */
    void setEnabled(bool enabled);
    
    /**
     * 获取提醒延迟时间
     * @return 延迟时间 (ms)
     */
    unsigned long getAlertDelay() const;
    
    /**
     * 获取重复提醒间隔
     * @return 间隔时间 (ms)
     */
    unsigned long getRepeatInterval() const;
    
    /**
     * 获取异常状态持续时间
     * @return 持续时间 (ms)
     */
    unsigned long getAbnormalDuration() const;
    
    /**
     * 获取距离下次提醒的时间
     * @return 剩余时间 (ms)，0表示立即提醒
     */
    unsigned long getTimeToNextAlert() const;
    
    /**
     * 重置提醒管理器
     */
    void reset();
    
    /**
     * 重置统计信息
     */
    void resetStatistics();
    
    /**
     * 获取总提醒次数
     * @return 总提醒次数
     */
    unsigned long getTotalAlerts() const;
    
    /**
     * 获取总确认次数
     * @return 总确认次数
     */
    unsigned long getTotalAcknowledgments() const;
    
    /**
     * 获取总暂停次数
     * @return 总暂停次数
     */
    unsigned long getTotalSnoozes() const;
    
    /**
     * 获取系统信息
     * @return JSON格式的系统信息
     */
    String getSystemInfo() const;
    
    /**
     * 检查提醒管理器是否正常工作
     * @return 是否正常工作
     */
    bool isWorking() const;
};

#endif // ALERT_MANAGER_H