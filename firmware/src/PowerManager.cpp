#include "PowerManager.h"
#include <esp_adc_cal.h>

PowerManager::PowerManager() 
  : lastUpdateTime(0)
  , bufferIndex(0)
  , bufferFilled(false)
  , lowBatteryCallback(nullptr)
  , powerSourceChangeCallback(nullptr)
  , powerModeChangeCallback(nullptr)
  , adcCalibrationFactor(1.0f)
{
  // 初始化电压缓冲区
  for (int i = 0; i < VOLTAGE_SAMPLES; i++) {
    voltageBuffer[i] = 0.0f;
  }
  
  // 初始化状态
  currentStatus = {
    .batteryVoltage = 0.0f,
    .batteryPercentage = 0,
    .powerSource = PowerSource::UNKNOWN,
    .powerMode = PowerMode::NORMAL,
    .isCharging = false,
    .lowBatteryWarning = false
  };
}

bool PowerManager::initialize() {
  // 配置GPIO引脚
  pinMode(BATTERY_ADC_PIN, INPUT);
  pinMode(USB_DETECT_PIN, INPUT);
  pinMode(CHARGE_STATUS_PIN, INPUT);
  
  // 初始化ADC
  initializeADC();
  
  // 初始读取电源状态
  update();
  
  Serial.println("PowerManager initialized");
  return true;
}

void PowerManager::initializeADC() {
  // 配置ADC
  analogReadResolution(12); // 12位分辨率
  analogSetAttenuation(ADC_11db); // 0-3.3V范围
  
  // ADC校准（如果需要）
  esp_adc_cal_characteristics_t adc_chars;
  esp_adc_cal_value_t val_type = esp_adc_cal_characterize(
    ADC_UNIT_1, ADC_ATTEN_DB_11, ADC_WIDTH_BIT_12, 1100, &adc_chars
  );
  
  if (val_type == ESP_ADC_CAL_VAL_EFUSE_VREF) {
    Serial.println("ADC calibrated using eFuse Vref");
  } else if (val_type == ESP_ADC_CAL_VAL_EFUSE_TP) {
    Serial.println("ADC calibrated using eFuse Two Point");
  } else {
    Serial.println("ADC calibrated using default reference voltage");
  }
}

void PowerManager::update() {
  unsigned long currentTime = millis();
  
  // 检查是否需要更新
  if (currentTime - lastUpdateTime < UPDATE_INTERVAL) {
    return;
  }
  
  lastUpdateTime = currentTime;
  
  // 读取电池电压
  float newVoltage = readBatteryVoltage();
  
  // 更新电压缓冲区
  voltageBuffer[bufferIndex] = newVoltage;
  bufferIndex = (bufferIndex + 1) % VOLTAGE_SAMPLES;
  if (bufferIndex == 0) {
    bufferFilled = true;
  }
  
  // 获取滤波后的电压
  float filteredVoltage = getFilteredVoltage();
  
  // 检测电源来源
  PowerSource newPowerSource = detectPowerSource();
  
  // 更新状态
  PowerStatus oldStatus = currentStatus;
  
  currentStatus.batteryVoltage = filteredVoltage;
  currentStatus.batteryPercentage = voltageToPercentage(filteredVoltage);
  currentStatus.powerSource = newPowerSource;
  currentStatus.isCharging = (newPowerSource == PowerSource::USB_POWER) && 
                            (digitalRead(CHARGE_STATUS_PIN) == LOW);
  currentStatus.lowBatteryWarning = (currentStatus.batteryPercentage <= LOW_BATTERY_THRESHOLD);
  
  // 检查电源来源变化
  if (oldStatus.powerSource != currentStatus.powerSource) {
    handlePowerSourceChange(currentStatus.powerSource);
  }
  
  // 更新电源模式
  updatePowerMode();
  
  // 检查电源模式变化
  if (oldStatus.powerMode != currentStatus.powerMode) {
    handlePowerModeChange(currentStatus.powerMode);
  }
  
  // 处理低电量警告
  if (currentStatus.lowBatteryWarning && !oldStatus.lowBatteryWarning) {
    handleLowBattery();
  }
}

float PowerManager::readBatteryVoltage() {
  // 读取ADC值
  int adcValue = analogRead(BATTERY_ADC_PIN);
  
  // 转换为电压 (考虑分压电路)
  // 假设使用2:1分压电路，实际电池电压是测量值的2倍
  float voltage = (adcValue / 4095.0f) * 3.3f * 2.0f * adcCalibrationFactor;
  
  return voltage;
}

float PowerManager::getFilteredVoltage() {
  if (!bufferFilled && bufferIndex == 0) {
    return voltageBuffer[0];
  }
  
  float sum = 0.0f;
  int count = bufferFilled ? VOLTAGE_SAMPLES : bufferIndex;
  
  for (int i = 0; i < count; i++) {
    sum += voltageBuffer[i];
  }
  
  return sum / count;
}

int PowerManager::voltageToPercentage(float voltage) const {
  if (voltage >= BATTERY_MAX_VOLTAGE) {
    return 100;
  }
  
  if (voltage <= BATTERY_MIN_VOLTAGE) {
    return 0;
  }
  
  // 线性映射
  float percentage = ((voltage - BATTERY_MIN_VOLTAGE) / 
                     (BATTERY_MAX_VOLTAGE - BATTERY_MIN_VOLTAGE)) * 100.0f;
  
  return (int)constrain(percentage, 0, 100);
}

PowerSource PowerManager::detectPowerSource() {
  bool usbConnected = digitalRead(USB_DETECT_PIN) == HIGH;
  
  if (usbConnected) {
    return PowerSource::USB_POWER;
  } else if (currentStatus.batteryVoltage > BATTERY_MIN_VOLTAGE) {
    return PowerSource::BATTERY;
  } else {
    return PowerSource::UNKNOWN;
  }
}

void PowerManager::updatePowerMode() {
  PowerMode newMode = PowerMode::NORMAL;
  
  if (currentStatus.batteryPercentage <= CRITICAL_BATTERY_THRESHOLD && 
      currentStatus.powerSource == PowerSource::BATTERY) {
    newMode = PowerMode::EMERGENCY;
  } else if (currentStatus.batteryPercentage <= LOW_BATTERY_THRESHOLD && 
             currentStatus.powerSource == PowerSource::BATTERY) {
    newMode = PowerMode::POWER_SAVE;
  } else {
    newMode = PowerMode::NORMAL;
  }
  
  currentStatus.powerMode = newMode;
}

void PowerManager::handleLowBattery() {
  Serial.println("Low battery warning triggered");
  
  if (lowBatteryCallback) {
    lowBatteryCallback();
  }
}

void PowerManager::handlePowerSourceChange(PowerSource newSource) {
  Serial.print("Power source changed to: ");
  switch (newSource) {
    case PowerSource::BATTERY:
      Serial.println("Battery");
      break;
    case PowerSource::USB_POWER:
      Serial.println("USB Power");
      break;
    case PowerSource::UNKNOWN:
      Serial.println("Unknown");
      break;
  }
  
  if (powerSourceChangeCallback) {
    powerSourceChangeCallback(newSource);
  }
}

void PowerManager::handlePowerModeChange(PowerMode newMode) {
  Serial.print("Power mode changed to: ");
  switch (newMode) {
    case PowerMode::NORMAL:
      Serial.println("Normal");
      break;
    case PowerMode::POWER_SAVE:
      Serial.println("Power Save");
      break;
    case PowerMode::EMERGENCY:
      Serial.println("Emergency");
      break;
  }
  
  if (powerModeChangeCallback) {
    powerModeChangeCallback(newMode);
  }
}

// 公共方法实现
PowerStatus PowerManager::getPowerStatus() const {
  return currentStatus;
}

float PowerManager::getBatteryVoltage() const {
  return currentStatus.batteryVoltage;
}

int PowerManager::getBatteryPercentage() const {
  return currentStatus.batteryPercentage;
}

PowerSource PowerManager::getPowerSource() const {
  return currentStatus.powerSource;
}

PowerMode PowerManager::getPowerMode() const {
  return currentStatus.powerMode;
}

bool PowerManager::isLowBattery() const {
  return currentStatus.lowBatteryWarning;
}

bool PowerManager::isCriticalBattery() const {
  return currentStatus.batteryPercentage <= CRITICAL_BATTERY_THRESHOLD;
}

bool PowerManager::isCharging() const {
  return currentStatus.isCharging;
}

bool PowerManager::isUSBConnected() const {
  return digitalRead(USB_DETECT_PIN) == HIGH;
}

bool PowerManager::isBatteryConnected() const {
  return currentStatus.batteryVoltage > 1.0f; // 基本的电池连接检测
}

void PowerManager::setPowerMode(PowerMode mode) {
  if (currentStatus.powerMode != mode) {
    currentStatus.powerMode = mode;
    handlePowerModeChange(mode);
  }
}

void PowerManager::enterPowerSaveMode() {
  setPowerMode(PowerMode::POWER_SAVE);
}

void PowerManager::enterNormalMode() {
  setPowerMode(PowerMode::NORMAL);
}

void PowerManager::enterEmergencyMode() {
  setPowerMode(PowerMode::EMERGENCY);
}

void PowerManager::setLowBatteryCallback(void (*callback)()) {
  lowBatteryCallback = callback;
}

void PowerManager::setPowerSourceChangeCallback(void (*callback)(PowerSource)) {
  powerSourceChangeCallback = callback;
}

void PowerManager::setPowerModeChangeCallback(void (*callback)(PowerMode)) {
  powerModeChangeCallback = callback;
}

void PowerManager::calibrateBatteryVoltage(float actualVoltage) {
  float measuredVoltage = readBatteryVoltage();
  if (measuredVoltage > 0.1f) {
    adcCalibrationFactor = actualVoltage / measuredVoltage;
    Serial.print("Battery voltage calibrated. Factor: ");
    Serial.println(adcCalibrationFactor);
  }
}

unsigned long PowerManager::getUptimeSeconds() const {
  return millis() / 1000;
}

float PowerManager::getAveragePowerConsumption() const {
  // 简化的功耗估算
  // 实际实现中可能需要更复杂的计算
  float uptimeHours = getUptimeSeconds() / 3600.0f;
  if (uptimeHours > 0) {
    float consumedCapacity = (100 - currentStatus.batteryPercentage) / 100.0f;
    return consumedCapacity / uptimeHours; // 相对功耗
  }
  return 0.0f;
}