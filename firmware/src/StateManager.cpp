/**
 * AI智能植物养护机器人 - 状态管理器实现
 */

#include "StateManager.h"
#include <EEPROM.h>
#include <ArduinoJson.h>

// EEPROM地址定义
#define EEPROM_THRESHOLD_ADDR 100
#define THRESHOLD_MAGIC_NUMBER 0x1234

/**
 * 构造函数
 */
StateManager::StateManager()
    : previousState(PlantState::UNKNOWN),
      historyIndex(0),
      historyCount(0),
      currentStateStartTime(0),
      stateEvaluationInterval(60000), // 默认1分钟评估间隔
      lastEvaluationTime(0) {
    
    // 初始化默认阈值
    resetToDefaultThresholds();
    
    // 初始化当前状态
    currentStatus = {
        .state = PlantState::UNKNOWN,
        .soilMoisture = 0,
        .lightLevel = 0,
        .temperature = 0,
        .airHumidity = 0,
        .timestamp = 0,
        .needsAttention = false,
        .statusMessage = "系统初始化中...",
        .healthScore = 0
    };
    
    // 初始化统计信息
    resetStats();
}

/**
 * 析构函数
 */
StateManager::~StateManager() {
    // 清理资源
}

/**
 * 初始化状态管理器
 */
bool StateManager::initialize() {
    DEBUG_PRINTLN("初始化状态管理器...");
    
    // 加载阈值配置
    if (!loadThresholdsFromEEPROM()) {
        DEBUG_PRINTLN("未找到阈值配置，使用默认值");
        resetToDefaultThresholds();
    } else {
        DEBUG_PRINTLN("✓ 阈值配置加载成功");
    }
    
    // 重置状态
    previousState = PlantState::UNKNOWN;
    currentStateStartTime = millis();
    lastEvaluationTime = 0;
    
    // 清除历史记录
    clearStateHistory();
    
    // 重置统计信息
    resetStats();
    
    DEBUG_PRINTLN("✓ 状态管理器初始化成功");
    return true;
}

/**
 * 重置为默认阈值
 */
void StateManager::resetToDefaultThresholds() {
    thresholds = {
        .moistureLow = MOISTURE_THRESHOLD,          // 30%
        .moistureCritical = 10.0,                   // 10%
        .lightLow = LIGHT_THRESHOLD,                // 500 lux
        .lightCritical = 100.0,                     // 100 lux
        .temperatureMin = 15.0,                     // 15°C
        .temperatureMax = 35.0,                     // 35°C
        .temperatureOptimalMin = 20.0,              // 20°C
        .temperatureOptimalMax = 28.0,              // 28°C
        .isCustomized = false
    };
}
/**
 * 评估植物状态
 */
PlantStatus StateManager::evaluateState(const SensorData& sensorData) {
    if (!sensorData.isValid) {
        DEBUG_PRINTLN("传感器数据无效，跳过状态评估");
        return currentStatus;
    }
    
    // 评估基本状态
    PlantState newState = evaluateBasicState(sensorData);
    
    // 计算健康评分
    int healthScore = calculateHealthScore(sensorData);
    
    // 生成状态消息
    String statusMessage = generateStatusMessage(newState, sensorData);
    
    // 检查状态是否发生变化
    if (newState != currentStatus.state) {
        String changeReason = "传感器数据变化: ";
        changeReason += "湿度=" + String(sensorData.soilHumidity, 1) + "%, ";
        changeReason += "光照=" + String(sensorData.lightIntensity, 0) + "lux";
        
        recordStateChange(newState, sensorData, changeReason);
        previousState = currentStatus.state;
        currentStateStartTime = millis();
        
        DEBUG_PRINTF("状态变化: %s -> %s\n", 
                     getStateName(previousState).c_str(),
                     getStateName(newState).c_str());
    }
    
    // 更新当前状态
    currentStatus = {
        .state = newState,
        .soilMoisture = sensorData.soilHumidity,
        .lightLevel = sensorData.lightIntensity,
        .temperature = sensorData.temperature,
        .airHumidity = sensorData.airHumidity,
        .timestamp = sensorData.timestamp,
        .needsAttention = isAbnormalState(newState),
        .statusMessage = statusMessage,
        .healthScore = healthScore
    };
    
    // 更新统计信息
    updateStateStats(newState);
    stats.totalEvaluations++;
    stats.averageHealthScore = (stats.averageHealthScore * (stats.totalEvaluations - 1) + healthScore) / stats.totalEvaluations;
    
    lastEvaluationTime = millis();
    
    return currentStatus;
}

/**
 * 评估基本状态
 */
PlantState StateManager::evaluateBasicState(const SensorData& data) {
    bool needsWater = data.soilHumidity < thresholds.moistureLow;
    bool needsLight = data.lightIntensity < thresholds.lightLow;
    bool criticalWater = data.soilHumidity < thresholds.moistureCritical;
    bool criticalLight = data.lightIntensity < thresholds.lightCritical;
    bool temperatureOK = (data.temperature >= thresholds.temperatureMin && 
                         data.temperature <= thresholds.temperatureMax);
    
    // 危急状态判断
    if ((criticalWater || criticalLight) || !temperatureOK) {
        return PlantState::CRITICAL;
    }
    
    // 需要水分和光照
    if (needsWater && needsLight) {
        return PlantState::CRITICAL; // 同时缺水缺光视为危急
    }
    
    // 单独需要水分
    if (needsWater) {
        return PlantState::NEEDS_WATER;
    }
    
    // 单独需要光照
    if (needsLight) {
        return PlantState::NEEDS_LIGHT;
    }
    
    // 健康状态
    return PlantState::HEALTHY;
}

/**
 * 计算健康评分
 */
int StateManager::calculateHealthScore(const SensorData& data) {
    float moistureScore = calculateMoistureScore(data.soilHumidity);
    float lightScore = calculateLightScore(data.lightIntensity);
    float temperatureScore = calculateTemperatureScore(data.temperature);
    
    // 加权平均 (湿度40%, 光照40%, 温度20%)
    float totalScore = moistureScore * 0.4 + lightScore * 0.4 + temperatureScore * 0.2;
    
    return constrain((int)totalScore, 0, 100);
}

/**
 * 计算湿度评分
 */
float StateManager::calculateMoistureScore(float moisture) {
    if (moisture >= 60) {
        return 100; // 理想湿度
    } else if (moisture >= thresholds.moistureLow) {
        // 30-60% 线性评分
        return 60 + (moisture - thresholds.moistureLow) / (60 - thresholds.moistureLow) * 40;
    } else if (moisture >= thresholds.moistureCritical) {
        // 10-30% 线性评分
        return 20 + (moisture - thresholds.moistureCritical) / (thresholds.moistureLow - thresholds.moistureCritical) * 40;
    } else {
        // 低于10% 危急状态
        return moisture / thresholds.moistureCritical * 20;
    }
}

/**
 * 计算光照评分
 */
float StateManager::calculateLightScore(float light) {
    if (light >= 2000) {
        return 100; // 理想光照
    } else if (light >= thresholds.lightLow) {
        // 500-2000 lux 线性评分
        return 60 + (light - thresholds.lightLow) / (2000 - thresholds.lightLow) * 40;
    } else if (light >= thresholds.lightCritical) {
        // 100-500 lux 线性评分
        return 20 + (light - thresholds.lightCritical) / (thresholds.lightLow - thresholds.lightCritical) * 40;
    } else {
        // 低于100 lux 危急状态
        return light / thresholds.lightCritical * 20;
    }
}

/**
 * 计算温度评分
 */
float StateManager::calculateTemperatureScore(float temperature) {
    if (temperature >= thresholds.temperatureOptimalMin && 
        temperature <= thresholds.temperatureOptimalMax) {
        return 100; // 最适温度
    } else if (temperature >= thresholds.temperatureMin && 
               temperature <= thresholds.temperatureMax) {
        // 在可接受范围内
        float distanceFromOptimal = min(
            abs(temperature - thresholds.temperatureOptimalMin),
            abs(temperature - thresholds.temperatureOptimalMax)
        );
        return 70 + (1.0 - distanceFromOptimal / 10.0) * 30;
    } else {
        // 超出可接受范围
        return 0;
    }
}

/**
 * 生成状态消息
 */
String StateManager::generateStatusMessage(PlantState state, const SensorData& data) {
    String message = "";
    
    switch (state) {
        case PlantState::HEALTHY:
            message = "植物状态良好";
            if (isTemperatureOptimal(data.temperature)) {
                message += "，环境条件理想";
            }
            break;
            
        case PlantState::NEEDS_WATER:
            message = "植物需要浇水";
            message += " (湿度: " + String(data.soilHumidity, 1) + "%)";
            break;
            
        case PlantState::NEEDS_LIGHT:
            message = "植物需要更多光照";
            message += " (光照: " + String(data.lightIntensity, 0) + " lux)";
            break;
            
        case PlantState::CRITICAL:
            message = "植物状态危急！";
            if (data.soilHumidity < thresholds.moistureCritical) {
                message += " 严重缺水";
            }
            if (data.lightIntensity < thresholds.lightCritical) {
                message += " 严重缺光";
            }
            if (data.temperature < thresholds.temperatureMin || 
                data.temperature > thresholds.temperatureMax) {
                message += " 温度异常";
            }
            break;
            
        default:
            message = "状态未知";
            break;
    }
    
    return message;
}

/**
 * 记录状态变化
 */
void StateManager::recordStateChange(PlantState newState, const SensorData& data, const String& reason) {
    StateChangeRecord record = {
        .previousState = currentStatus.state,
        .currentState = newState,
        .changeTime = millis(),
        .triggerData = data,
        .changeReason = reason
    };
    
    stateHistory[historyIndex] = record;
    historyIndex = (historyIndex + 1) % 10;
    
    if (historyCount < 10) {
        historyCount++;
    }
    
    stats.stateChanges++;
    stats.lastStateChange = record.changeTime;
}

/**
 * 更新状态统计
 */
void StateManager::updateStateStats(PlantState state) {
    unsigned long currentTime = millis();
    unsigned long duration = currentTime - currentStateStartTime;
    
    // 更新之前状态的持续时间
    switch (currentStatus.state) {
        case PlantState::HEALTHY:
            stats.timeInHealthy += duration;
            break;
        case PlantState::NEEDS_WATER:
            stats.timeInNeedsWater += duration;
            break;
        case PlantState::NEEDS_LIGHT:
            stats.timeInNeedsLight += duration;
            break;
        case PlantState::CRITICAL:
            stats.timeInCritical += duration;
            break;
        default:
            break;
    }
}
/**
 * 检查温度是否最适
 */
bool StateManager::isTemperatureOptimal(float temperature) {
    return (temperature >= thresholds.temperatureOptimalMin && 
            temperature <= thresholds.temperatureOptimalMax);
}

/**
 * 检查环境是否稳定
 */
bool StateManager::isEnvironmentStable(const SensorData& data) {
    // 简单的稳定性检查，可以根据需要扩展
    return (data.soilHumidity >= thresholds.moistureLow &&
            data.lightIntensity >= thresholds.lightLow &&
            isTemperatureOptimal(data.temperature));
}

// ============= 公共方法实现 =============

/**
 * 获取当前植物状态
 */
PlantStatus StateManager::getCurrentStatus() const {
    return currentStatus;
}

/**
 * 获取当前状态枚举
 */
PlantState StateManager::getCurrentState() const {
    return currentStatus.state;
}

/**
 * 获取之前的状态
 */
PlantState StateManager::getPreviousState() const {
    return previousState;
}

/**
 * 检查状态是否发生变化
 */
bool StateManager::hasStateChanged() const {
    return currentStatus.state != previousState;
}

/**
 * 获取当前状态持续时间
 */
unsigned long StateManager::getCurrentStateDuration() const {
    return millis() - currentStateStartTime;
}

/**
 * 检查是否需要关注
 */
bool StateManager::needsAttention() const {
    return currentStatus.needsAttention;
}

/**
 * 获取健康评分
 */
int StateManager::getHealthScore() const {
    return currentStatus.healthScore;
}

/**
 * 获取状态描述
 */
String StateManager::getStatusMessage() const {
    return currentStatus.statusMessage;
}

/**
 * 设置阈值配置
 */
void StateManager::setThresholds(const ThresholdConfig& config) {
    thresholds = config;
    thresholds.isCustomized = true;
    
    DEBUG_PRINTLN("阈值配置已更新");
}

/**
 * 获取阈值配置
 */
ThresholdConfig StateManager::getThresholds() const {
    return thresholds;
}

/**
 * 获取状态变化历史
 */
int StateManager::getStateHistory(StateChangeRecord* history, int maxCount) {
    if (!history || maxCount <= 0) {
        return 0;
    }
    
    int actualCount = min(maxCount, historyCount);
    
    for (int i = 0; i < actualCount; i++) {
        int index = (historyIndex - 1 - i + 10) % 10;
        history[i] = stateHistory[index];
    }
    
    return actualCount;
}

/**
 * 获取最近的状态变化
 */
StateChangeRecord StateManager::getLastStateChange() const {
    if (historyCount > 0) {
        int lastIndex = (historyIndex - 1 + 10) % 10;
        return stateHistory[lastIndex];
    }
    
    // 返回空记录
    StateChangeRecord emptyRecord = {
        .previousState = PlantState::UNKNOWN,
        .currentState = PlantState::UNKNOWN,
        .changeTime = 0,
        .triggerData = {0, 0, 0, 0, 0, false},
        .changeReason = ""
    };
    return emptyRecord;
}

/**
 * 清除状态历史
 */
void StateManager::clearStateHistory() {
    historyIndex = 0;
    historyCount = 0;
    
    DEBUG_PRINTLN("状态历史已清除");
}

/**
 * 获取统计信息
 */
StateStats StateManager::getStats() const {
    return stats;
}

/**
 * 重置统计信息
 */
void StateManager::resetStats() {
    stats = {
        .totalEvaluations = 0,
        .stateChanges = 0,
        .timeInHealthy = 0,
        .timeInNeedsWater = 0,
        .timeInNeedsLight = 0,
        .timeInCritical = 0,
        .averageHealthScore = 0.0,
        .lastStateChange = 0
    };
    
    DEBUG_PRINTLN("统计信息已重置");
}

/**
 * 设置状态评估间隔
 */
void StateManager::setEvaluationInterval(unsigned long interval) {
    stateEvaluationInterval = max(1000UL, interval); // 最小1秒
}

/**
 * 获取状态评估间隔
 */
unsigned long StateManager::getEvaluationInterval() const {
    return stateEvaluationInterval;
}

/**
 * 检查是否到了评估时间
 */
bool StateManager::isTimeForEvaluation() const {
    return millis() - lastEvaluationTime >= stateEvaluationInterval;
}

/**
 * 强制状态评估
 */
PlantStatus StateManager::forceEvaluation(const SensorData& sensorData) {
    DEBUG_PRINTLN("强制执行状态评估...");
    return evaluateState(sensorData);
}

// ============= 静态方法实现 =============

/**
 * 获取状态名称字符串
 */
String StateManager::getStateName(PlantState state) {
    switch (state) {
        case PlantState::HEALTHY:
            return "健康";
        case PlantState::NEEDS_WATER:
            return "需要浇水";
        case PlantState::NEEDS_LIGHT:
            return "需要光照";
        case PlantState::CRITICAL:
            return "危急状态";
        default:
            return "未知";
    }
}

/**
 * 获取状态颜色代码
 */
uint32_t StateManager::getStateColor(PlantState state) {
    switch (state) {
        case PlantState::HEALTHY:
            return COLOR_HEALTHY;       // 绿色
        case PlantState::NEEDS_WATER:
            return COLOR_NEEDS_WATER;   // 黄色
        case PlantState::NEEDS_LIGHT:
            return COLOR_NEEDS_LIGHT;   // 红色
        case PlantState::CRITICAL:
            return COLOR_ERROR;         // 紫色
        default:
            return COLOR_OFF;           // 关闭
    }
}

/**
 * 检查状态是否为异常状态
 */
bool StateManager::isAbnormalState(PlantState state) {
    return (state != PlantState::HEALTHY && state != PlantState::UNKNOWN);
}

/**
 * 获取状态优先级
 */
int StateManager::getStatePriority(PlantState state) {
    switch (state) {
        case PlantState::CRITICAL:
            return 4; // 最高优先级
        case PlantState::NEEDS_WATER:
            return 3;
        case PlantState::NEEDS_LIGHT:
            return 2;
        case PlantState::HEALTHY:
            return 1;
        default:
            return 0; // 最低优先级
    }
}

/**
 * 保存阈值配置到EEPROM
 */
bool StateManager::saveThresholdsToEEPROM() {
    // 写入魔数
    EEPROM.writeUShort(EEPROM_THRESHOLD_ADDR, THRESHOLD_MAGIC_NUMBER);
    
    // 写入阈值数据
    EEPROM.put(EEPROM_THRESHOLD_ADDR + 2, thresholds);
    
    return EEPROM.commit();
}

/**
 * 从EEPROM加载阈值配置
 */
bool StateManager::loadThresholdsFromEEPROM() {
    // 检查魔数
    uint16_t magic = EEPROM.readUShort(EEPROM_THRESHOLD_ADDR);
    if (magic != THRESHOLD_MAGIC_NUMBER) {
        return false;
    }
    
    // 读取阈值数据
    EEPROM.get(EEPROM_THRESHOLD_ADDR + 2, thresholds);
    
    return true;
}

/**
 * 获取系统信息
 */
String StateManager::getSystemInfo() const {
    DynamicJsonDocument doc(1024);
    
    doc["current_state"] = (int)currentStatus.state;
    doc["state_name"] = getStateName(currentStatus.state);
    doc["health_score"] = currentStatus.healthScore;
    doc["needs_attention"] = currentStatus.needsAttention;
    doc["state_duration"] = getCurrentStateDuration();
    doc["evaluation_interval"] = stateEvaluationInterval;
    
    // 阈值信息
    JsonObject thresholdObj = doc.createNestedObject("thresholds");
    thresholdObj["moisture_low"] = thresholds.moistureLow;
    thresholdObj["moisture_critical"] = thresholds.moistureCritical;
    thresholdObj["light_low"] = thresholds.lightLow;
    thresholdObj["light_critical"] = thresholds.lightCritical;
    thresholdObj["is_customized"] = thresholds.isCustomized;
    
    // 统计信息
    JsonObject statsObj = doc.createNestedObject("stats");
    statsObj["total_evaluations"] = stats.totalEvaluations;
    statsObj["state_changes"] = stats.stateChanges;
    statsObj["average_health_score"] = stats.averageHealthScore;
    
    String result;
    serializeJson(doc, result);
    return result;
}

/**
 * 执行状态管理器自检
 */
bool StateManager::performSelfTest() {
    DEBUG_PRINTLN("执行状态管理器自检...");
    
    // 测试阈值配置
    if (thresholds.moistureLow <= 0 || thresholds.moistureLow > 100) {
        DEBUG_PRINTLN("✗ 湿度阈值配置异常");
        return false;
    }
    
    if (thresholds.lightLow <= 0) {
        DEBUG_PRINTLN("✗ 光照阈值配置异常");
        return false;
    }
    
    if (thresholds.temperatureMin >= thresholds.temperatureMax) {
        DEBUG_PRINTLN("✗ 温度阈值配置异常");
        return false;
    }
    
    // 测试状态评估逻辑
    SensorData testData = {50, 60, 25, 800, millis(), true};
    PlantStatus testStatus = evaluateState(testData);
    
    if (testStatus.state != PlantState::HEALTHY) {
        DEBUG_PRINTLN("✗ 状态评估逻辑异常");
        return false;
    }
    
    DEBUG_PRINTLN("✓ 状态管理器自检通过");
    return true;
}
/**
 * 设置统计信息（用于从持久化存储恢复）
 */
void StateManager::setStats(const StateStats& newStats) {
    stats = newStats;
    DEBUG_PRINTLN("统计信息已从持久化存储恢复");
}

/**
 * 设置状态历史（用于从持久化存储恢复）
 */
void StateManager::setStateHistory(const StateChangeRecord* history, int count) {
    if (!history || count <= 0) {
        return;
    }
    
    historyCount = min(count, 10);
    historyIndex = historyCount;
    
    for (int i = 0; i < historyCount; i++) {
        stateHistory[i] = history[i];
    }
    
    DEBUG_PRINTF("状态历史已从持久化存储恢复，记录数: %d\n", historyCount);
}

/**
 * 设置当前状态（用于从持久化存储恢复）
 */
void StateManager::setCurrentStatus(const PlantStatus& status) {
    currentStatus = status;
    previousState = status.state; // 简化处理
    currentStateStartTime = millis();
    
    DEBUG_PRINTLN("当前状态已从持久化存储恢复");
}