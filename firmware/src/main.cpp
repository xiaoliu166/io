/**
 * AI智能植物养护机器人 - 主程序
 * ESP32-S3 固件入口点
 */

#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include "PlantCareRobot.h"
#include "StartupManager.h"
#include "ConfigurationManager.h"
#include "config.h"

// 全局机器人实例
PlantCareRobot robot;
StartupManager startupManager;
ConfigurationManager configManager;

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("=================================");
    Serial.println("AI智能植物养护机器人 v1.0 启动中...");
    Serial.println("=================================");
    
    // 开始启动流程
    startupManager.begin();
    
    // 系统初始化阶段
    startupManager.setPhase(StartupPhase::SYSTEM_INIT);
    if (!startupManager.performSystemCheck()) {
        startupManager.setError(StartupError::SYSTEM_FAILURE);
        return;
    }
    
    // 传感器初始化阶段
    startupManager.setPhase(StartupPhase::SENSOR_INIT);
    if (!startupManager.performSensorCheck()) {
        startupManager.setError(StartupError::SENSOR_FAILURE);
        return;
    }
    
    // 初始化机器人系统
    startupManager.setPhase(StartupPhase::SYSTEM_INIT);
    if (robot.initialize()) {
        Serial.println("✓ 机器人系统初始化成功");
    } else {
        Serial.println("✗ 机器人系统初始化失败");
        startupManager.setError(StartupError::SYSTEM_FAILURE);
        return;
    }
    
    // WiFi初始化阶段
    startupManager.setPhase(StartupPhase::WIFI_INIT);
    if (!startupManager.performWiFiCheck()) {
        startupManager.setError(StartupError::WIFI_FAILURE);
        return;
    }
    
    // 配置检查阶段
    startupManager.setPhase(StartupPhase::CONFIG_CHECK);
    if (!startupManager.performConfigCheck()) {
        startupManager.setError(StartupError::CONFIG_FAILURE);
        return;
    }
    
    // 完成启动
    startupManager.completeStartup();
    
    Serial.println("系统启动完成，开始主循环...");
}

void loop() {
    // 更新启动管理器
    startupManager.update();
    
    // 如果启动未完成或出错，不执行主循环
    if (!startupManager.isStartupComplete() || 
        startupManager.getCurrentPhase() == StartupPhase::ERROR) {
        delay(100);
        return;
    }
    
    // 更新配置管理器
    configManager.update();
    
    // 如果在配置模式，只处理配置相关逻辑
    if (configManager.isInConfigurationMode()) {
        // 显示配置模式状态
        configManager.indicateConfigurationMode();
        
        // 处理配置消息
        robot.handleConfigurationMode();
        
        delay(100);
        return;
    }
    
    // 正常运行模式 - 执行主循环
    robot.update();
    
    // 短暂延时，让系统有时间处理其他任务
    delay(50);
}