/**
 * AI智能植物养护机器人 - 主程序
 * ESP32-S3 固件入口点
 */

#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include "PlantCareRobot.h"
#include "config.h"

// 全局机器人实例
PlantCareRobot robot;

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("=================================");
    Serial.println("AI智能植物养护机器人 v1.0 启动中...");
    Serial.println("=================================");
    
    // 初始化机器人系统
    if (robot.initialize()) {
        Serial.println("✓ 机器人系统初始化成功");
    } else {
        Serial.println("✗ 机器人系统初始化失败");
        // 进入错误模式
        robot.enterErrorMode();
    }
    
    Serial.println("系统启动完成，开始主循环...");
}

void loop() {
    // 执行主循环
    robot.update();
    
    // 短暂延时，让系统有时间处理其他任务
    delay(100);
}