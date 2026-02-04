/**
 * AI智能植物养护机器人 - 提醒管理器实现
 */

#include "AlertManager.h"

// 默认配置常量
const unsigned long DEFAULT_ALERT_DELAY = ALERT_DELAY;                    // 30分钟
const unsigned long DEFAULT_REPEAT_INTERVAL = REPEAT_ALERT_INTERVAL;      // 2小时
const unsigned long DEFAULT_SNOOZE_TIME = 30 * 60 * 1000;               // 30分钟
const int DEFAULT_MAX_REPEAT_COUNT = 10;                                 // 最大重复10次

AlertManager::AlertManager()
    : alertDelay(DEFAULT_ALERT_DELAY)
    , repeatInterval(DEFAULT_REPEAT_INTERVAL)
    , snoozeTime(DEFAULT_SNOOZE_TIME)
    , maxRepeatCount(DEFAULT_MAX_REPEAT_COUNT)
    , isEnabled(true)
    , isAlerting(false)
    , lastUpdateTime(0)
    , alertCallback(nullptr)
    , stopCallback(nullptr)
    , totalAlerts(0)
    , totalAcknowledgments(0)
    , totalSnoozes(0) {
    
    // 初始化当前提醒信息
    currentAlert.type = AlertType::NONE;
    currentAlert.state = AlertState::INACTIVE;
    currentAlert.startTime = 0;
    currentAlert.lastAlertTime = 0;
    currentAlert.acknowledgeTime = 0;
    currentAlert.repeatCount = 0;
    currentAlert.isUrgent = false;
    currentAlert.message = "";
}

AlertManager::~AlertManager() {
    // 清理资源
}

bool AlertManager::initialize() {
    DEBUG_PRINTLN("AlertManager: 初始化提醒管理器...");
    
    // 重置状态
    reset();
    lastUpdateTime = millis();
    
    DEBUG_PRINTF("AlertManager: 配置 - 提醒延迟: %lu ms, 重复间隔: %lu ms\n", 
                 alertDelay, repeatInterval);
    
    DEBUG_PRINTLN("AlertManager: 初始化完成");
    return true;
}

void AlertManager::update() {
    if (!isEnabled) {
        return;
    }
    
    unsigned long currentTime = millis();
    lastUpdateTime = currentTime;
    
    // 更新提醒状态
    updateAlertState();
    
    // 检查是否需要触发提醒
    if (shouldTriggerAlert()) {
        triggerAlert();
    }
    
    // 检查是否需要重复提醒
    if (shouldRepeatAlert()) {
        triggerAlert();
    }
}

void AlertManager::reportAbnormalState(AlertType type, bool isUrgent) {
    if (!isEnabled || type == AlertType::NONE) {
        return;
    }
    
    unsigned long currentTime = millis();
    
    DEBUG_PRINTF("AlertManager: 报告异常状态 - 类型: %d, 紧急: %s\n", 
                 (int)type, isUrgent ? "是" : "否");
    
    // 如果是新的异常类型或者从正常状态转为异常状态
    if (currentAlert.type != type || currentAlert.state == AlertState::INACTIVE) {
        currentAlert.type = type;
        currentAlert.state = AlertState::PENDING;
        currentAlert.startTime = currentTime;
        currentAlert.lastAlertTime = 0;
        currentAlert.acknowledgeTime = 0;
        currentAlert.repeatCount = 0;
        currentAlert.isUrgent = isUrgent;
        currentAlert.message = getAlertMessage(type);
        
        DEBUG_PRINTF("AlertManager: 开始异常状态监测，类型: %d\n", (int)type);
    }
    
    // 更新紧急状态
    if (isUrgent && !currentAlert.isUrgent) {
        currentAlert.isUrgent = true;
        DEBUG_PRINTLN("AlertManager: 状态升级为紧急");
    }
}

void AlertManager::reportNormalState() {
    if (currentAlert.state != AlertState::INACTIVE) {
        DEBUG_PRINTLN("AlertManager: 报告正常状态，清除提醒");
        
        // 停止当前提醒
        if (isAlerting) {
            stopAlert();
        }
        
        // 重置提醒状态
        currentAlert.type = AlertType::NONE;
        currentAlert.state = AlertState::INACTIVE;
        currentAlert.startTime = 0;
        currentAlert.lastAlertTime = 0;
        currentAlert.acknowledgeTime = 0;
        currentAlert.repeatCount = 0;
        currentAlert.isUrgent = false;
        currentAlert.message = "";
    }
}

void AlertManager::acknowledgeAlert() {
    if (currentAlert.state == AlertState::ACTIVE) {
        DEBUG_PRINTLN("AlertManager: 用户确认提醒");
        
        currentAlert.state = AlertState::ACKNOWLEDGED;
        currentAlert.acknowledgeTime = millis();
        totalAcknowledgments++;
        
        // 停止当前提醒
        if (isAlerting) {
            stopAlert();
        }
    }
}

void AlertManager::snoozeAlert(unsigned long duration) {
    if (currentAlert.state == AlertState::ACTIVE) {
        unsigned long snoozeDuration = (duration > 0) ? duration : snoozeTime;
        
        DEBUG_PRINTF("AlertManager: 暂停提醒 %lu 分钟\n", snoozeDuration / 60000);
        
        currentAlert.state = AlertState::SNOOZED;
        currentAlert.acknowledgeTime = millis();
        totalSnoozes++;
        
        // 停止当前提醒
        if (isAlerting) {
            stopAlert();
        }
        
        // 设置下次提醒时间
        currentAlert.lastAlertTime = millis() - repeatInterval + snoozeDuration;
    }
}

void AlertManager::triggerAlert() {
    if (!isEnabled || currentAlert.type == AlertType::NONE) {
        return;
    }
    
    unsigned long currentTime = millis();
    
    DEBUG_PRINTF("AlertManager: 触发提醒 - 类型: %d, 重复次数: %d\n", 
                 (int)currentAlert.type, currentAlert.repeatCount);
    
    // 更新提醒状态
    currentAlert.state = AlertState::ACTIVE;
    currentAlert.lastAlertTime = currentTime;
    currentAlert.repeatCount++;
    totalAlerts++;
    isAlerting = true;
    
    // 调用提醒回调
    if (alertCallback != nullptr) {
        alertCallback(currentAlert);
    }
}

void AlertManager::stopAlert() {
    if (isAlerting) {
        DEBUG_PRINTLN("AlertManager: 停止提醒");
        
        isAlerting = false;
        
        // 调用停止回调
        if (stopCallback != nullptr) {
            stopCallback(currentAlert);
        }
    }
}

void AlertManager::updateAlertState() {
    if (currentAlert.state == AlertState::INACTIVE) {
        return;
    }
    
    unsigned long currentTime = millis();
    unsigned long abnormalDuration = currentTime - currentAlert.startTime;
    
    switch (currentAlert.state) {
        case AlertState::PENDING:
            // 检查是否到了提醒时间
            if (abnormalDuration >= alertDelay || currentAlert.isUrgent) {
                // 立即触发紧急提醒，或者等待时间已到
                triggerAlert();
            }
            break;
            
        case AlertState::ACKNOWLEDGED:
            // 已确认状态，检查是否需要重新进入等待状态
            if (currentTime - currentAlert.acknowledgeTime > snoozeTime) {
                currentAlert.state = AlertState::PENDING;
                DEBUG_PRINTLN("AlertManager: 确认超时，重新进入等待状态");
            }
            break;
            
        case AlertState::SNOOZED:
            // 暂停状态，检查是否可以重新提醒
            if (currentTime - currentAlert.acknowledgeTime > snoozeTime) {
                currentAlert.state = AlertState::PENDING;
                DEBUG_PRINTLN("AlertManager: 暂停结束，重新进入等待状态");
            }
            break;
            
        case AlertState::ACTIVE:
            // 活跃状态，检查是否达到最大重复次数
            if (currentAlert.repeatCount >= maxRepeatCount) {
                DEBUG_PRINTLN("AlertManager: 达到最大重复次数，停止提醒");
                currentAlert.state = AlertState::ACKNOWLEDGED;
                currentAlert.acknowledgeTime = currentTime;
                stopAlert();
            }
            break;
            
        default:
            break;
    }
}

bool AlertManager::shouldTriggerAlert() const {
    if (!isEnabled || isAlerting || currentAlert.state != AlertState::PENDING) {
        return false;
    }
    
    unsigned long currentTime = millis();
    unsigned long abnormalDuration = currentTime - currentAlert.startTime;
    
    // 紧急状态立即提醒，否则等待延迟时间
    return currentAlert.isUrgent || (abnormalDuration >= alertDelay);
}

bool AlertManager::shouldRepeatAlert() const {
    if (!isEnabled || !isAlerting || currentAlert.state != AlertState::ACTIVE) {
        return false;
    }
    
    // 检查是否达到最大重复次数
    if (currentAlert.repeatCount >= maxRepeatCount) {
        return false;
    }
    
    unsigned long currentTime = millis();
    unsigned long timeSinceLastAlert = currentTime - currentAlert.lastAlertTime;
    
    return timeSinceLastAlert >= repeatInterval;
}

String AlertManager::getAlertMessage(AlertType type) const {
    switch (type) {
        case AlertType::NEEDS_WATER:
            return "植物需要浇水";
        case AlertType::NEEDS_LIGHT:
            return "植物需要更多光照";
        case AlertType::LOW_BATTERY:
            return "电池电量不足";
        case AlertType::SENSOR_ERROR:
            return "传感器故障";
        case AlertType::CRITICAL:
            return "植物状态严重";
        default:
            return "未知提醒";
    }
}

AlertInfo AlertManager::getCurrentAlert() const {
    return currentAlert;
}

bool AlertManager::hasActiveAlert() const {
    return currentAlert.state != AlertState::INACTIVE;
}

bool AlertManager::isCurrentlyAlerting() const {
    return isAlerting;
}

void AlertManager::setAlertCallback(AlertCallback callback) {
    alertCallback = callback;
    DEBUG_PRINTLN("AlertManager: 提醒回调函数已设置");
}

void AlertManager::setStopCallback(AlertCallback callback) {
    stopCallback = callback;
    DEBUG_PRINTLN("AlertManager: 停止回调函数已设置");
}

void AlertManager::setAlertDelay(unsigned long delay) {
    alertDelay = delay;
    DEBUG_PRINTF("AlertManager: 提醒延迟设置为: %lu ms\n", alertDelay);
}

void AlertManager::setRepeatInterval(unsigned long interval) {
    repeatInterval = interval;
    DEBUG_PRINTF("AlertManager: 重复间隔设置为: %lu ms\n", repeatInterval);
}

void AlertManager::setSnoozeTime(unsigned long time) {
    snoozeTime = time;
    DEBUG_PRINTF("AlertManager: 暂停时间设置为: %lu ms\n", snoozeTime);
}

void AlertManager::setMaxRepeatCount(int count) {
    maxRepeatCount = count;
    DEBUG_PRINTF("AlertManager: 最大重复次数设置为: %d\n", maxRepeatCount);
}

void AlertManager::setEnabled(bool enabled) {
    isEnabled = enabled;
    if (!enabled) {
        // 禁用时停止所有提醒
        if (isAlerting) {
            stopAlert();
        }
        reportNormalState();
    }
    DEBUG_PRINTF("AlertManager: 提醒管理器%s\n", enabled ? "启用" : "禁用");
}

unsigned long AlertManager::getAlertDelay() const {
    return alertDelay;
}

unsigned long AlertManager::getRepeatInterval() const {
    return repeatInterval;
}

unsigned long AlertManager::getAbnormalDuration() const {
    if (currentAlert.state == AlertState::INACTIVE) {
        return 0;
    }
    return millis() - currentAlert.startTime;
}

unsigned long AlertManager::getTimeToNextAlert() const {
    if (!hasActiveAlert() || currentAlert.state != AlertState::PENDING) {
        return 0;
    }
    
    unsigned long currentTime = millis();
    unsigned long abnormalDuration = currentTime - currentAlert.startTime;
    
    if (currentAlert.isUrgent || abnormalDuration >= alertDelay) {
        return 0; // 立即提醒
    }
    
    return alertDelay - abnormalDuration;
}

void AlertManager::reset() {
    DEBUG_PRINTLN("AlertManager: 重置提醒管理器");
    
    // 停止当前提醒
    if (isAlerting) {
        stopAlert();
    }
    
    // 重置提醒状态
    currentAlert.type = AlertType::NONE;
    currentAlert.state = AlertState::INACTIVE;
    currentAlert.startTime = 0;
    currentAlert.lastAlertTime = 0;
    currentAlert.acknowledgeTime = 0;
    currentAlert.repeatCount = 0;
    currentAlert.isUrgent = false;
    currentAlert.message = "";
}

void AlertManager::resetStatistics() {
    totalAlerts = 0;
    totalAcknowledgments = 0;
    totalSnoozes = 0;
    DEBUG_PRINTLN("AlertManager: 统计信息已重置");
}

unsigned long AlertManager::getTotalAlerts() const {
    return totalAlerts;
}

unsigned long AlertManager::getTotalAcknowledgments() const {
    return totalAcknowledgments;
}

unsigned long AlertManager::getTotalSnoozes() const {
    return totalSnoozes;
}

String AlertManager::getSystemInfo() const {
    String info = "{\n";
    info += "  \"manager\": \"AlertManager\",\n";
    info += "  \"enabled\": " + String(isEnabled ? "true" : "false") + ",\n";
    info += "  \"alerting\": " + String(isAlerting ? "true" : "false") + ",\n";
    info += "  \"alertDelay\": " + String(alertDelay) + ",\n";
    info += "  \"repeatInterval\": " + String(repeatInterval) + ",\n";
    info += "  \"snoozeTime\": " + String(snoozeTime) + ",\n";
    info += "  \"maxRepeatCount\": " + String(maxRepeatCount) + ",\n";
    info += "  \"currentAlert\": {\n";
    info += "    \"type\": " + String((int)currentAlert.type) + ",\n";
    info += "    \"state\": " + String((int)currentAlert.state) + ",\n";
    info += "    \"startTime\": " + String(currentAlert.startTime) + ",\n";
    info += "    \"lastAlertTime\": " + String(currentAlert.lastAlertTime) + ",\n";
    info += "    \"repeatCount\": " + String(currentAlert.repeatCount) + ",\n";
    info += "    \"isUrgent\": " + String(currentAlert.isUrgent ? "true" : "false") + ",\n";
    info += "    \"message\": \"" + currentAlert.message + "\",\n";
    info += "    \"abnormalDuration\": " + String(getAbnormalDuration()) + ",\n";
    info += "    \"timeToNextAlert\": " + String(getTimeToNextAlert()) + "\n";
    info += "  },\n";
    info += "  \"statistics\": {\n";
    info += "    \"totalAlerts\": " + String(totalAlerts) + ",\n";
    info += "    \"totalAcknowledgments\": " + String(totalAcknowledgments) + ",\n";
    info += "    \"totalSnoozes\": " + String(totalSnoozes) + "\n";
    info += "  },\n";
    info += "  \"working\": " + String(isWorking() ? "true" : "false") + "\n";
    info += "}";
    return info;
}

bool AlertManager::isWorking() const {
    // 检查提醒管理器是否正常工作
    return isEnabled && (millis() - lastUpdateTime < 60000); // 1分钟内有更新
}