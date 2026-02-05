#ifndef POWER_MANAGER_H
#define POWER_MANAGER_H

#include <Arduino.h>

/**
 * 电源管理器
 * 负责电池电量监测、USB-C电源检测和自动电源模式切换
 */

enum class PowerSource {
  BATTERY,
  USB_POWER,
  UNKNOWN
};

enum class PowerMode {
  NORMAL,
  POWER_SAVE,
  EMERGENCY
};

struct PowerStatus {
  float batteryVoltage;      // 电池电压 (V)
  int batteryPercentage;     // 电池电量百分比 (%)
  PowerSource powerSource;   // 当前电源来源
  PowerMode powerMode;       // 当前电源模式
  bool isCharging;          // 是否正在充电
  bool lowBatteryWarning;   // 低电量警告
};

class PowerManager {
private:
  static const int BATTERY_ADC_PIN = 35;      // 电池电压检测引脚
  static const int USB_DETECT_PIN = 34;       // USB电源检测引脚
  static const int CHARGE_STATUS_PIN = 33;    // 充电状态检测引脚
  
  // 电压阈值
  static constexpr float BATTERY_MAX_VOLTAGE = 4.2f;  // 满电电压
  static constexpr float BATTERY_MIN_VOLTAGE = 3.0f;  // 最低电压
  static constexpr float LOW_BATTERY_VOLTAGE = 3.4f;  // 低电量警告电压
  static constexpr float CRITICAL_BATTERY_VOLTAGE = 3.1f; // 危急电压
  
  // 电量百分比阈值
  static const int LOW_BATTERY_THRESHOLD = 20;    // 低电量阈值 (%)
  static const int CRITICAL_BATTERY_THRESHOLD = 5; // 危急电量阈值 (%)
  
  PowerStatus currentStatus;
  unsigned long lastUpdateTime;
  static const unsigned long UPDATE_INTERVAL = 30000; // 30秒更新间隔
  
  // 电压滤波器
  static const int VOLTAGE_SAMPLES = 10;
  float voltageBuffer[VOLTAGE_SAMPLES];
  int bufferIndex;
  bool bufferFilled;
  
  // 回调函数
  void (*lowBatteryCallback)();
  void (*powerSourceChangeCallback)(PowerSource newSource);
  void (*powerModeChangeCallback)(PowerMode newMode);

public:
  PowerManager();
  
  // 初始化
  bool initialize();
  
  // 更新电源状态
  void update();
  
  // 获取电源状态
  PowerStatus getPowerStatus() const;
  float getBatteryVoltage() const;
  int getBatteryPercentage() const;
  PowerSource getPowerSource() const;
  PowerMode getPowerMode() const;
  bool isLowBattery() const;
  bool isCriticalBattery() const;
  bool isCharging() const;
  
  // 电源模式控制
  void setPowerMode(PowerMode mode);
  void enterPowerSaveMode();
  void enterNormalMode();
  void enterEmergencyMode();
  
  // 电源检测
  bool isUSBConnected() const;
  bool isBatteryConnected() const;
  
  // 回调函数设置
  void setLowBatteryCallback(void (*callback)());
  void setPowerSourceChangeCallback(void (*callback)(PowerSource));
  void setPowerModeChangeCallback(void (*callback)(PowerMode));
  
  // 校准功能
  void calibrateBatteryVoltage(float actualVoltage);
  
  // 统计信息
  unsigned long getUptimeSeconds() const;
  float getAveragePowerConsumption() const;
  
private:
  // 内部方法
  float readBatteryVoltage();
  float getFilteredVoltage();
  int voltageToPercentage(float voltage) const;
  PowerSource detectPowerSource();
  void updatePowerMode();
  void handleLowBattery();
  void handlePowerSourceChange(PowerSource newSource);
  void handlePowerModeChange(PowerMode newMode);
  
  // ADC校准
  float adcCalibrationFactor;
  void initializeADC();
};

#endif // POWER_MANAGER_H