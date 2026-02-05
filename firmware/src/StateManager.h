/**
 * AI智能植物养护机器人 - 状态管理器
 * 负责植物状态评估、阈值判断和状态变化检测
 */

#ifndef STATE_MANAGER_H
#define STATE_MANAGER_H

#include <Arduino.h>
#include "SensorManager.h"
#include "config.h"

/**
 * 植物状态枚举
 */
enum class PlantState {
    HEALTHY,        // 健康
    NEEDS_WATER,    // 需要浇水
    NEEDS_LIGHT,    // 需要光照
    CRITICAL,       // 危急状态
    UNKNOWN         // 未知状态
};

/**
 * 植物状态详细信息
 */
struct PlantStatus {
    PlantState state;           // 当前状态
    float soilMoisture;         // 土壤湿度 (%)
    float lightLevel;           // 光照强度 (lux)
    float temperature;          // 温度 (°C)
    float airHumidity;          // 空气湿度 (%)
    unsigned long timestamp;    // 时间戳
    bool needsAttention;        // 是否需要关注
    String statusMessage;       // 状态描述信息
    int healthScore;            // 健康评分 (0-100)
};

/**
 * 状态变化记录
 */
struct StateChangeRecord {
    PlantState previousState;   // 之前的状态
    PlantState currentState;    // 当前状态
    unsigned long changeTime;   // 变化时间
    SensorData triggerData;     // 触发变化的传感器数据
    String changeReason;        // 变化原因
};

/**
 * 阈值配置
 */
struct ThresholdConfig {
    float moistureLow;          // 低湿度阈值
    float moistureCritical;     // 危急湿度阈值
    float lightLow;             // 低光照阈值
    float lightCritical;        // 危急光照阈值
    float temperatureMin;       // 最低温度
    float temperatureMax;       // 最高温度
    float temperatureOptimalMin; // 最适温度下限
    float temperatureOptimalMax; // 最适温度上限
    bool isCustomized;          // 是否为自定义阈值
};

/**
 * 状态统计信息
 */
struct StateStats {
    unsigned long totalEvaluations;    // 总评估次数
    unsigned long stateChanges;        // 状态变化次数
    unsigned long timeInHealthy;       // 健康状态持续时间
    unsigned long timeInNeedsWater;    // 缺水状态持续时间
    unsigned long timeInNeedsLight;    // 缺光状态持续时间
    unsigned long timeInCritical;      // 危急状态持续时间
    float averageHealthScore;          // 平均健康评分
    unsigned long lastStateChange;     // 上次状态变化时间
};

/**
 * 状态管理器类
 */
class StateManager {
private:
    // 当前状态信息
    PlantStatus currentStatus;
    PlantState previousState;
    
    // 阈值配置
    ThresholdConfig thresholds;
    
    // 状态变化历史
    StateChangeRecord stateHistory[10]; // 保存最近10次状态变化
    int historyIndex;
    int historyCount;
    
    // 统计信息
    StateStats stats;
    
    // 状态持续时间跟踪
    unsigned long currentStateStartTime;
    unsigned long stateEvaluationInterval;
    unsigned long lastEvaluationTime;
    
    // 私有方法
    PlantState evaluateBasicState(const SensorData& data);
    int calculateHealthScore(const SensorData& data);
    String generateStatusMessage(PlantState state, const SensorData& data);
    void recordStateChange(PlantState newState, const SensorData& data, const String& reason);
    void updateStateStats(PlantState state);
    bool isTemperatureOptimal(float temperature);
    bool isEnvironmentStable(const SensorData& data);
    float calculateMoistureScore(float moisture);
    float calculateLightScore(float light);
    float calculateTemperatureScore(float temperature);

public:
    /**
     * 构造函数
     */
    StateManager();
    
    /**
     * 析构函数
     */
    ~StateManager();
    
    /**
     * 初始化状态管理器
     * @return 初始化是否成功
     */
    bool initialize();
    
    /**
     * 评估植物状态
     * @param sensorData 传感器数据
     * @return 植物状态信息
     */
    PlantStatus evaluateState(const SensorData& sensorData);
    
    /**
     * 获取当前植物状态
     * @return 当前植物状态信息
     */
    PlantStatus getCurrentStatus() const;
    
    /**
     * 获取当前状态枚举
     * @return 当前状态
     */
    PlantState getCurrentState() const;
    
    /**
     * 获取之前的状态
     * @return 之前的状态
     */
    PlantState getPreviousState() const;
    
    /**
     * 检查状态是否发生变化
     * @return 状态是否变化
     */
    bool hasStateChanged() const;
    
    /**
     * 获取当前状态持续时间
     * @return 持续时间（毫秒）
     */
    unsigned long getCurrentStateDuration() const;
    
    /**
     * 检查是否需要关注
     * @return 是否需要关注
     */
    bool needsAttention() const;
    
    /**
     * 获取健康评分
     * @return 健康评分 (0-100)
     */
    int getHealthScore() const;
    
    /**
     * 获取状态描述
     * @return 状态描述字符串
     */
    String getStatusMessage() const;
    
    /**
     * 设置阈值配置
     * @param config 阈值配置
     */
    void setThresholds(const ThresholdConfig& config);
    
    /**
     * 获取阈值配置
     * @return 当前阈值配置
     */
    ThresholdConfig getThresholds() const;
    
    /**
     * 重置为默认阈值
     */
    void resetToDefaultThresholds();
    
    /**
     * 获取状态变化历史
     * @param history 输出数组
     * @param maxCount 最大数量
     * @return 实际返回的记录数量
     */
    int getStateHistory(StateChangeRecord* history, int maxCount);
    
    /**
     * 获取最近的状态变化
     * @return 最近的状态变化记录
     */
    StateChangeRecord getLastStateChange() const;
    
    /**
     * 清除状态历史
     */
    void clearStateHistory();
    
    /**
     * 获取统计信息
     * @return 状态统计信息
     */
    StateStats getStats() const;
    
    /**
     * 重置统计信息
     */
    void resetStats();
    
    /**
     * 设置状态评估间隔
     * @param interval 评估间隔（毫秒）
     */
    void setEvaluationInterval(unsigned long interval);
    
    /**
     * 获取状态评估间隔
     * @return 评估间隔（毫秒）
     */
    unsigned long getEvaluationInterval() const;
    
    /**
     * 检查是否到了评估时间
     * @return 是否需要评估
     */
    bool isTimeForEvaluation() const;
    
    /**
     * 强制状态评估
     * @param sensorData 传感器数据
     * @return 植物状态信息
     */
    PlantStatus forceEvaluation(const SensorData& sensorData);
    
    /**
     * 获取状态名称字符串
     * @param state 植物状态
     * @return 状态名称
     */
    static String getStateName(PlantState state);
    
    /**
     * 获取状态颜色代码
     * @param state 植物状态
     * @return RGB颜色值
     */
    static uint32_t getStateColor(PlantState state);
    
    /**
     * 检查状态是否为异常状态
     * @param state 植物状态
     * @return 是否为异常状态
     */
    static bool isAbnormalState(PlantState state);
    
    /**
     * 获取状态优先级
     * @param state 植物状态
     * @return 优先级 (数值越大优先级越高)
     */
    static int getStatePriority(PlantState state);
    
    /**
     * 保存阈值配置到EEPROM
     * @return 保存是否成功
     */
    bool saveThresholdsToEEPROM();
    
    /**
     * 从EEPROM加载阈值配置
     * @return 加载是否成功
     */
    bool loadThresholdsFromEEPROM();
    
    /**
     * 获取系统信息
     * @return JSON格式的系统信息
     */
    String getSystemInfo() const;
    
    /**
     * 执行状态管理器自检
     * @return 自检是否通过
     */
    bool performSelfTest();
    
    /**
     * 设置统计信息（用于从持久化存储恢复）
     * @param newStats 统计信息
     */
    void setStats(const StateStats& newStats);
    
    /**
     * 设置状态历史（用于从持久化存储恢复）
     * @param history 状态变化记录数组
     * @param count 记录数量
     */
    void setStateHistory(const StateChangeRecord* history, int count);
    
    /**
     * 设置当前状态（用于从持久化存储恢复）
     * @param status 植物状态信息
     */
    void setCurrentStatus(const PlantStatus& status);
};

#endif // STATE_MANAGER_H