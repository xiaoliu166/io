#ifndef POWER_SAVE_MANAGER_H
#define POWER_SAVE_MANAGER_H

#include <Arduino.h>
#include "PowerManager.h"

/**
 * 省电模式管理器
 * 负责在低电量时实现省电功能，包括降低采样频率、LED亮度和禁用非必要功能
 */

enum class PowerSaveLevel {
  NONE,        // 正常模式，无省电
  LOW,         // 轻度省电（电量 20-50%）
  MEDIUM,      // 中度省电（电量 10-20%）
  HIGH,        // 高度省电（电量 5-10%）
  EMERGENCY    // 紧急模式（电量 < 5%）
};

struct PowerSaveConfig {
  // 采样间隔（毫秒）
  unsigned long normalSamplingInterval;
  unsigned long lowPowerSamplingInterval;
  unsigned long mediumPowerSamplingInterval;
  unsigned long highPowerSamplingInterval;
  unsigned long emergencySamplingInterval;
  
  // LED亮度（0-255）
  int normalLedBrightness;
  int lowPowerLedBrightness;
  int mediumPowerLedBrightness;
  int highPowerLedBrightness;
  int emergencyLedBrightness;
  
  // 功能开关
  bool enableSoundInLowPower;
  bool enableSoundInMediumPower;
  bool enableSoundInHighPower;
  bool enableSoundInEmergency;
  
  bool enableWiFiInLowPower;
  bool enableWiFiInMediumPower;
  bool enableWiFiInHighPower;
  bool enableWiFiInEmergency;
  
  // CPU频率（MHz）
  int normalCpuFreq;
  int lowPowerCpuFreq;
  int mediumPowerCpuFreq;
  int highPowerCpuFreq;
  int emergencyCpuFreq;
};

struct PowerSaveStatus {
  PowerSaveLevel currentLevel;
  unsigned long currentSamplingInterval;
  int currentLedBrightness;
  bool soundEnabled;
  bool wifiEnabled;
  int cpuFrequency;
  float estimatedRemainingHours;
  float powerConsumptionWatts;
};

class PowerSaveManager {
private:
  PowerSaveConfig config;
  PowerSaveStatus status;
  PowerManager* powerManager;
  
  // 回调函数指针
  void (*samplingIntervalChangeCallback)(unsigned long newInterval);
  void (*ledBrightnessChangeCallback)(int brightness);
  void (*soundEnableCallback)(bool enabled);
  void (*wifiEnableCallback)(bool enabled);
  void (*cpuFrequencyChangeCallback)(int frequency);
  void (*powerSaveLevelChangeCallback)(PowerSaveLevel level);
  
  // 功耗估算
  unsigned long lastPowerMeasurement;
  float averagePowerConsumption;
  
  // 省电统计
  unsigned long powerSaveStartTime;
  float energySavedWh;

public:
  PowerSaveManager(PowerManager* pm);
  
  // 初始化
  bool initialize();
  void setDefaultConfig();
  
  // 主要功能
  void update();
  PowerSaveLevel calculateOptimalLevel(int batteryPercentage, PowerSource powerSource);
  void applyPowerSaveLevel(PowerSaveLevel level);
  
  // 配置管理
  void setConfig(const PowerSaveConfig& newConfig);
  PowerSaveConfig getConfig() const;
  void resetToDefaults();
  
  // 状态查询
  PowerSaveStatus getStatus() const;
  PowerSaveLevel getCurrentLevel() const;
  unsigned long getCurrentSamplingInterval() const;
  int getCurrentLedBrightness() const;
  bool isSoundEnabled() const;
  bool isWiFiEnabled() const;
  int getCurrentCpuFrequency() const;
  
  // 功耗估算
  float getEstimatedRemainingHours() const;
  float getCurrentPowerConsumption() const;
  float getEnergySaved() const;
  
  // 手动控制
  void forcePowerSaveLevel(PowerSaveLevel level);
  void exitForcedMode();
  bool isInForcedMode() const;
  
  // 回调函数设置
  void setSamplingIntervalChangeCallback(void (*callback)(unsigned long));
  void setLedBrightnessChangeCallback(void (*callback)(int));
  void setSoundEnableCallback(void (*callback)(bool));
  void setWiFiEnableCallback(void (*callback)(bool));
  void setCpuFrequencyChangeCallback(void (*callback)(int));
  void setPowerSaveLevelChangeCallback(void (*callback)(PowerSaveLevel));
  
  // 紧急关机
  void emergencyShutdown();
  bool isEmergencyShutdownRequired() const;
  
  // 统计信息
  void printPowerSaveStats() const;
  void resetStats();

private:
  // 内部方法
  void applySamplingInterval(unsigned long interval);
  void applyLedBrightness(int brightness);
  void applySoundEnable(bool enabled);
  void applyWiFiEnable(bool enabled);
  void applyCpuFrequency(int frequency);
  
  void updatePowerConsumption();
  void updateRemainingTimeEstimate();
  
  // 强制模式相关
  bool forcedMode;
  PowerSaveLevel forcedLevel;
  
  // 平滑过渡
  void smoothTransition(PowerSaveLevel fromLevel, PowerSaveLevel toLevel);
  unsigned long transitionStartTime;
  bool inTransition;
};

#endif // POWER_SAVE_MANAGER_H