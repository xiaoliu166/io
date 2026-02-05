#include "PowerSaveManager.h"
#include <esp32-hal-cpu.h>

PowerSaveManager::PowerSaveManager(PowerManager* pm) 
  : powerManager(pm)
  , samplingIntervalChangeCallback(nullptr)
  , ledBrightnessChangeCallback(nullptr)
  , soundEnableCallback(nullptr)
  , wifiEnableCallback(nullptr)
  , cpuFrequencyChangeCallback(nullptr)
  , powerSaveLevelChangeCallback(nullptr)
  , lastPowerMeasurement(0)
  , averagePowerConsumption(0.0f)
  , powerSaveStartTime(0)
  , energySavedWh(0.0f)
  , forcedMode(false)
  , forcedLevel(PowerSaveLevel::NONE)
  , transitionStartTime(0)
  , inTransition(false)
{
  setDefaultConfig();
  
  // 初始化状态
  status = {
    .currentLevel = PowerSaveLevel::NONE,
    .currentSamplingInterval = config.normalSamplingInterval,
    .currentLedBrightness = config.normalLedBrightness,
    .soundEnabled = true,
    .wifiEnabled = true,
    .cpuFrequency = config.normalCpuFreq,
    .estimatedRemainingHours = 0.0f,
    .powerConsumptionWatts = 0.0f
  };
}

bool PowerSaveManager::initialize() {
  if (!powerManager) {
    Serial.println("PowerSaveManager: PowerManager not provided");
    return false;
  }
  
  // 设置初始配置
  applyPowerSaveLevel(PowerSaveLevel::NONE);
  
  Serial.println("PowerSaveManager initialized");
  return true;
}

void PowerSaveManager::setDefaultConfig() {
  config = {
    // 采样间隔（毫秒）
    .normalSamplingInterval = 5000,      // 5秒
    .lowPowerSamplingInterval = 10000,   // 10秒
    .mediumPowerSamplingInterval = 30000, // 30秒
    .highPowerSamplingInterval = 60000,   // 1分钟
    .emergencySamplingInterval = 300000,  // 5分钟
    
    // LED亮度（0-255）
    .normalLedBrightness = 255,
    .lowPowerLedBrightness = 128,
    .mediumPowerLedBrightness = 64,
    .highPowerLedBrightness = 32,
    .emergencyLedBrightness = 16,
    
    // 功能开关
    .enableSoundInLowPower = true,
    .enableSoundInMediumPower = true,
    .enableSoundInHighPower = false,
    .enableSoundInEmergency = false,
    
    .enableWiFiInLowPower = true,
    .enableWiFiInMediumPower = true,
    .enableWiFiInHighPower = false,
    .enableWiFiInEmergency = false,
    
    // CPU频率（MHz）
    .normalCpuFreq = 240,
    .lowPowerCpuFreq = 160,
    .mediumPowerCpuFreq = 80,
    .highPowerCpuFreq = 40,
    .emergencyCpuFreq = 20
  };
}

void PowerSaveManager::update() {
  if (!powerManager) return;
  
  // 更新功耗测量
  updatePowerConsumption();
  
  // 获取当前电源状态
  PowerStatus powerStatus = powerManager->getPowerStatus();
  
  // 如果在强制模式下，不自动调整
  if (forcedMode) {
    return;
  }
  
  // 计算最优省电级别
  PowerSaveLevel optimalLevel = calculateOptimalLevel(
    powerStatus.batteryPercentage, 
    powerStatus.powerSource
  );
  
  // 如果级别发生变化，应用新级别
  if (optimalLevel != status.currentLevel) {
    applyPowerSaveLevel(optimalLevel);
  }
  
  // 更新剩余时间估算
  updateRemainingTimeEstimate();
}

PowerSaveLevel PowerSaveManager::calculateOptimalLevel(int batteryPercentage, PowerSource powerSource) {
  // 如果使用USB供电，不需要省电
  if (powerSource == PowerSource::USB_POWER) {
    return PowerSaveLevel::NONE;
  }
  
  // 根据电池电量确定省电级别
  if (batteryPercentage < 5) {
    return PowerSaveLevel::EMERGENCY;
  } else if (batteryPercentage < 10) {
    return PowerSaveLevel::HIGH;
  } else if (batteryPercentage < 20) {
    return PowerSaveLevel::MEDIUM;
  } else if (batteryPercentage < 50) {
    return PowerSaveLevel::LOW;
  } else {
    return PowerSaveLevel::NONE;
  }
}

void PowerSaveManager::applyPowerSaveLevel(PowerSaveLevel level) {
  PowerSaveLevel oldLevel = status.currentLevel;
  status.currentLevel = level;
  
  // 如果级别没有变化，直接返回
  if (oldLevel == level) {
    return;
  }
  
  Serial.print("Applying power save level: ");
  Serial.println((int)level);
  
  // 开始平滑过渡
  if (oldLevel != PowerSaveLevel::NONE) {
    smoothTransition(oldLevel, level);
  }
  
  // 应用对应的配置
  switch (level) {
    case PowerSaveLevel::NONE:
      applySamplingInterval(config.normalSamplingInterval);
      applyLedBrightness(config.normalLedBrightness);
      applySoundEnable(true);
      applyWiFiEnable(true);
      applyCpuFrequency(config.normalCpuFreq);
      break;
      
    case PowerSaveLevel::LOW:
      applySamplingInterval(config.lowPowerSamplingInterval);
      applyLedBrightness(config.lowPowerLedBrightness);
      applySoundEnable(config.enableSoundInLowPower);
      applyWiFiEnable(config.enableWiFiInLowPower);
      applyCpuFrequency(config.lowPowerCpuFreq);
      break;
      
    case PowerSaveLevel::MEDIUM:
      applySamplingInterval(config.mediumPowerSamplingInterval);
      applyLedBrightness(config.mediumPowerLedBrightness);
      applySoundEnable(config.enableSoundInMediumPower);
      applyWiFiEnable(config.enableWiFiInMediumPower);
      applyCpuFrequency(config.mediumPowerCpuFreq);
      break;
      
    case PowerSaveLevel::HIGH:
      applySamplingInterval(config.highPowerSamplingInterval);
      applyLedBrightness(config.highPowerLedBrightness);
      applySoundEnable(config.enableSoundInHighPower);
      applyWiFiEnable(config.enableWiFiInHighPower);
      applyCpuFrequency(config.highPowerCpuFreq);
      break;
      
    case PowerSaveLevel::EMERGENCY:
      applySamplingInterval(config.emergencySamplingInterval);
      applyLedBrightness(config.emergencyLedBrightness);
      applySoundEnable(config.enableSoundInEmergency);
      applyWiFiEnable(config.enableWiFiInEmergency);
      applyCpuFrequency(config.emergencyCpuFreq);
      break;
  }
  
  // 记录省电开始时间
  if (oldLevel == PowerSaveLevel::NONE && level != PowerSaveLevel::NONE) {
    powerSaveStartTime = millis();
  }
  
  // 调用回调函数
  if (powerSaveLevelChangeCallback) {
    powerSaveLevelChangeCallback(level);
  }
}

void PowerSaveManager::applySamplingInterval(unsigned long interval) {
  status.currentSamplingInterval = interval;
  if (samplingIntervalChangeCallback) {
    samplingIntervalChangeCallback(interval);
  }
}

void PowerSaveManager::applyLedBrightness(int brightness) {
  status.currentLedBrightness = brightness;
  if (ledBrightnessChangeCallback) {
    ledBrightnessChangeCallback(brightness);
  }
}

void PowerSaveManager::applySoundEnable(bool enabled) {
  status.soundEnabled = enabled;
  if (soundEnableCallback) {
    soundEnableCallback(enabled);
  }
}

void PowerSaveManager::applyWiFiEnable(bool enabled) {
  status.wifiEnabled = enabled;
  if (wifiEnableCallback) {
    wifiEnableCallback(enabled);
  }
}

void PowerSaveManager::applyCpuFrequency(int frequency) {
  status.cpuFrequency = frequency;
  setCpuFrequencyMhz(frequency);
  
  if (cpuFrequencyChangeCallback) {
    cpuFrequencyChangeCallback(frequency);
  }
}

void PowerSaveManager::updatePowerConsumption() {
  unsigned long currentTime = millis();
  
  if (lastPowerMeasurement == 0) {
    lastPowerMeasurement = currentTime;
    return;
  }
  
  // 简化的功耗估算
  // 实际实现中需要更精确的测量
  float timeDelta = (currentTime - lastPowerMeasurement) / 1000.0f; // 秒
  
  if (timeDelta > 0) {
    // 基于CPU频率和功能状态估算功耗
    float basePower = 0.1f; // 基础功耗 (W)
    float cpuPower = (status.cpuFrequency / 240.0f) * 0.5f; // CPU功耗
    float ledPower = (status.currentLedBrightness / 255.0f) * 0.1f; // LED功耗
    float wifiPower = status.wifiEnabled ? 0.2f : 0.0f; // WiFi功耗
    
    float currentPower = basePower + cpuPower + ledPower + wifiPower;
    
    // 移动平均
    if (averagePowerConsumption == 0.0f) {
      averagePowerConsumption = currentPower;
    } else {
      averagePowerConsumption = 0.9f * averagePowerConsumption + 0.1f * currentPower;
    }
    
    status.powerConsumptionWatts = averagePowerConsumption;
    
    // 计算节省的能量
    if (status.currentLevel != PowerSaveLevel::NONE) {
      float normalPower = basePower + 0.5f + 0.1f + 0.2f; // 正常模式功耗
      float savedPower = normalPower - currentPower;
      if (savedPower > 0) {
        energySavedWh += savedPower * (timeDelta / 3600.0f); // 转换为Wh
      }
    }
  }
  
  lastPowerMeasurement = currentTime;
}

void PowerSaveManager::updateRemainingTimeEstimate() {
  if (!powerManager || status.powerConsumptionWatts <= 0) {
    status.estimatedRemainingHours = 0.0f;
    return;
  }
  
  PowerStatus powerStatus = powerManager->getPowerStatus();
  
  // 假设电池容量为2000mAh @ 3.7V = 7.4Wh
  float batteryCapacityWh = 7.4f;
  float remainingCapacityWh = batteryCapacityWh * (powerStatus.batteryPercentage / 100.0f);
  
  status.estimatedRemainingHours = remainingCapacityWh / status.powerConsumptionWatts;
}

void PowerSaveManager::smoothTransition(PowerSaveLevel fromLevel, PowerSaveLevel toLevel) {
  // 实现平滑过渡逻辑
  // 这里简化处理，实际可以实现渐变效果
  inTransition = true;
  transitionStartTime = millis();
  
  // 延迟100ms后完成过渡
  delay(100);
  
  inTransition = false;
}

// 公共方法实现
void PowerSaveManager::setConfig(const PowerSaveConfig& newConfig) {
  config = newConfig;
}

PowerSaveConfig PowerSaveManager::getConfig() const {
  return config;
}

void PowerSaveManager::resetToDefaults() {
  setDefaultConfig();
  applyPowerSaveLevel(PowerSaveLevel::NONE);
}

PowerSaveStatus PowerSaveManager::getStatus() const {
  return status;
}

PowerSaveLevel PowerSaveManager::getCurrentLevel() const {
  return status.currentLevel;
}

unsigned long PowerSaveManager::getCurrentSamplingInterval() const {
  return status.currentSamplingInterval;
}

int PowerSaveManager::getCurrentLedBrightness() const {
  return status.currentLedBrightness;
}

bool PowerSaveManager::isSoundEnabled() const {
  return status.soundEnabled;
}

bool PowerSaveManager::isWiFiEnabled() const {
  return status.wifiEnabled;
}

int PowerSaveManager::getCurrentCpuFrequency() const {
  return status.cpuFrequency;
}

float PowerSaveManager::getEstimatedRemainingHours() const {
  return status.estimatedRemainingHours;
}

float PowerSaveManager::getCurrentPowerConsumption() const {
  return status.powerConsumptionWatts;
}

float PowerSaveManager::getEnergySaved() const {
  return energySavedWh;
}

void PowerSaveManager::forcePowerSaveLevel(PowerSaveLevel level) {
  forcedMode = true;
  forcedLevel = level;
  applyPowerSaveLevel(level);
}

void PowerSaveManager::exitForcedMode() {
  forcedMode = false;
  // 重新计算最优级别
  update();
}

bool PowerSaveManager::isInForcedMode() const {
  return forcedMode;
}

// 回调函数设置
void PowerSaveManager::setSamplingIntervalChangeCallback(void (*callback)(unsigned long)) {
  samplingIntervalChangeCallback = callback;
}

void PowerSaveManager::setLedBrightnessChangeCallback(void (*callback)(int)) {
  ledBrightnessChangeCallback = callback;
}

void PowerSaveManager::setSoundEnableCallback(void (*callback)(bool)) {
  soundEnableCallback = callback;
}

void PowerSaveManager::setWiFiEnableCallback(void (*callback)(bool)) {
  wifiEnableCallback = callback;
}

void PowerSaveManager::setCpuFrequencyChangeCallback(void (*callback)(int)) {
  cpuFrequencyChangeCallback = callback;
}

void PowerSaveManager::setPowerSaveLevelChangeCallback(void (*callback)(PowerSaveLevel)) {
  powerSaveLevelChangeCallback = callback;
}

void PowerSaveManager::emergencyShutdown() {
  Serial.println("Emergency shutdown initiated");
  
  // 保存重要数据
  // 关闭所有外设
  applyLedBrightness(0);
  applySoundEnable(false);
  applyWiFiEnable(false);
  applyCpuFrequency(20);
  
  // 进入深度睡眠
  esp_deep_sleep_start();
}

bool PowerSaveManager::isEmergencyShutdownRequired() const {
  if (!powerManager) return false;
  
  PowerStatus powerStatus = powerManager->getPowerStatus();
  return (powerStatus.batteryPercentage < 2 && 
          powerStatus.powerSource == PowerSource::BATTERY);
}

void PowerSaveManager::printPowerSaveStats() const {
  Serial.println("=== Power Save Statistics ===");
  Serial.print("Current Level: ");
  Serial.println((int)status.currentLevel);
  Serial.print("Power Consumption: ");
  Serial.print(status.powerConsumptionWatts);
  Serial.println(" W");
  Serial.print("Estimated Remaining: ");
  Serial.print(status.estimatedRemainingHours);
  Serial.println(" hours");
  Serial.print("Energy Saved: ");
  Serial.print(energySavedWh);
  Serial.println(" Wh");
  Serial.println("=============================");
}

void PowerSaveManager::resetStats() {
  energySavedWh = 0.0f;
  averagePowerConsumption = 0.0f;
  powerSaveStartTime = millis();
}