/**
 * AI智能植物养护机器人 - 主控制类头文件
 * 系统核心控制逻辑
 */

#ifndef PLANT_CARE_ROBOT_H
#define PLANT_CARE_ROBOT_H

#include <Arduino.h>
#include "SensorManager.h"
#include "DataCollectionManager.h"
#include "StateManager.h"
#include "InteractionController.h"
#include "AlertManager.h"
#include "config.h"

/**
 * 系统运行模式
 */
enum class SystemMode {
    INITIALIZING,    // 初始化中
    CONFIGURATION,   // 配置模式
    NORMAL,         // 正常运行
    LOW_POWER,      // 低功耗模式
    ERROR,          // 错误模式
    OFFLINE         // 离线模式
};

/**
 * 植物养护机器人主控制类
 */
class PlantCareRobot {
private:
    // 系统组件
    SensorManager sensorManager;
    DataCollectionManager dataCollectionManager;
    StateManager stateManager;
    InteractionController interactionController;
    
    // 系统状态
    SystemMode currentMode;
    bool isInitialized;
    bool isFirstBoot;
    unsigned long lastDataCollection;
    unsigned long lastHeartbeat;
    
    // 错误处理
    int errorCount;
    String lastError;
    
    // 私有方法
    void performDataCollection();
    void updateSystemState();
    void handleAlerts();
    void performMaintenance();
    bool checkSystemHealth();
    void handleError(const String& error);
    void resetSystem();

public:
    /**
     * 构造函数
     */
    PlantCareRobot();
    
    /**
     * 析构函数
     */
    ~PlantCareRobot();
    
    /**
     * 初始化系统
     * @return 初始化是否成功
     */
    bool initialize();
    
    /**
     * 主循环更新
     * 应在 loop() 函数中调用
     */
    void update();
    
    /**
     * 获取当前系统模式
     * @return 当前系统模式
     */
    SystemMode getCurrentMode() const;
    
    /**
     * 设置系统模式
     * @param mode 要设置的模式
     */
    void setMode(SystemMode mode);
    
    /**
     * 获取当前植物状态
     * @return 植物状态结构
     */
    PlantStatus getCurrentPlantStatus();
    
    /**
     * 获取最新传感器数据
     * @return 传感器数据结构
     */
    SensorData getLatestSensorData();
    
    /**
     * 处理用户触摸事件
     */
    void handleTouchEvent();
    
    /**
     * 进入配置模式
     */
    void enterConfigurationMode();
    
    /**
     * 处理配置模式
     */
    void handleConfigurationMode();
    
    /**
     * 显示当前状态
     */
    void showCurrentStatus();
    
    /**
     * 进入低功耗模式
     */
    void enterLowPowerMode();
    
    /**
     * 进入错误模式
     */
    void enterErrorMode();
    
    /**
     * 进入离线模式
     */
    void enterOfflineMode();
    
    /**
     * 恢复正常模式
     */
    void resumeNormalMode();
    
    /**
     * 执行系统重启
     */
    void restart();
    
    /**
     * 获取系统信息
     * @return JSON格式的系统信息
     */
    String getSystemInfo();
    
    /**
     * 获取错误信息
     * @return 最后的错误信息
     */
    String getLastError() const;
    
    /**
     * 清除错误状态
     */
    void clearError();
    
    /**
     * 检查是否为首次启动
     * @return 是否首次启动
     */
    bool isFirstBootup() const;
    
    /**
     * 设置首次启动标志
     * @param firstBoot 首次启动标志
     */
    void setFirstBoot(bool firstBoot);
    
    /**
     * 获取运行时间
     * @return 系统运行时间（毫秒）
     */
    unsigned long getUptime() const;
    
    /**
     * 获取系统健康状态
     * @return 系统是否健康
     */
    bool isSystemHealthy() const;
};

#endif // PLANT_CARE_ROBOT_H