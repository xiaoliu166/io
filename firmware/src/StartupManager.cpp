/**
 * 启动管理器实现
 */

#include "StartupManager.h"
#include "LEDController.h"
#include "SoundController.h"
#include "SensorManager.h"
#include "WiFiManager.h"
#include "ConfigurationManager.h"

extern LEDController ledController;
extern SoundController soundController;
extern SensorManager sensorManager;
extern WiFiManager wifiManager;
extern ConfigurationManager configManager;

StartupManager::StartupManager() 
  : currentPhase(StartupPhase::POWER_ON), 
    lastError(StartupError::NONE),
    phaseStartTime(0),
    totalStartupTime(0),
    startupComplete(false) {
}

void StartupManager::begin() {
  totalStartupTime = millis();
  setPhase(StartupPhase::POWER_ON);
  
  Serial.println("=== Plant Care Robot Startup ===");
  Serial.println("Firmware Version: 1.0.0");
  Serial.println("Starting initialization sequence...");
  
  playStartupSound();
}

void StartupManager::setPhase(StartupPhase phase) {
  currentPhase = phase;
  phaseStartTime = millis();
  
  indicatePhase(phase);
  
  switch (phase) {
    case StartupPhase::POWER_ON:
      Serial.println("[STARTUP] Power on - System starting");
      break;
    case StartupPhase::SYSTEM_INIT:
      Serial.println("[STARTUP] System initialization");
      break;
    case StartupPhase::SENSOR_INIT:
      Serial.println("[STARTUP] Sensor initialization");
      break;
    case StartupPhase::WIFI_INIT:
      Serial.println("[STARTUP] WiFi initialization");
      break;
    case StartupPhase::CONFIG_CHECK:
      Serial.println("[STARTUP] Configuration check");
      break;
    case StartupPhase::READY:
      Serial.println("[STARTUP] System ready");
      break;
    case StartupPhase::ERROR:
      Serial.println("[STARTUP] Startup error occurred");
      break;
  }
}

void StartupManager::setError(StartupError error) {
  lastError = error;
  setPhase(StartupPhase::ERROR);
  
  indicateError(error);
  playErrorSound();
  
  switch (error) {
    case StartupError::SENSOR_FAILURE:
      Serial.println("[ERROR] Sensor initialization failed");
      break;
    case StartupError::WIFI_FAILURE:
      Serial.println("[ERROR] WiFi initialization failed");
      break;
    case StartupError::CONFIG_FAILURE:
      Serial.println("[ERROR] Configuration check failed");
      break;
    case StartupError::SYSTEM_FAILURE:
      Serial.println("[ERROR] System initialization failed");
      break;
    default:
      break;
  }
}

void StartupManager::completeStartup() {
  startupComplete = true;
  totalStartupTime = millis() - totalStartupTime;
  
  setPhase(StartupPhase::READY);
  playReadySound();
  
  Serial.print("[STARTUP] Startup completed in ");
  Serial.print(totalStartupTime);
  Serial.println(" ms");
  
  if (totalStartupTime <= STARTUP_TARGET_TIME) {
    Serial.println("[STARTUP] Startup time target achieved!");
  } else {
    Serial.println("[STARTUP] Startup time exceeded target");
  }
  
  // 显示最终状态
  showCurrentStatus();
}

StartupPhase StartupManager::getCurrentPhase() const {
  return currentPhase;
}

StartupError StartupManager::getLastError() const {
  return lastError;
}

bool StartupManager::isStartupComplete() const {
  return startupComplete;
}

unsigned long StartupManager::getStartupTime() const {
  if (startupComplete) {
    return totalStartupTime;
  } else {
    return millis() - totalStartupTime;
  }
}

bool StartupManager::isPhaseTimeout() const {
  return (millis() - phaseStartTime) > PHASE_TIMEOUT;
}

void StartupManager::indicatePhase(StartupPhase phase) {
  switch (phase) {
    case StartupPhase::POWER_ON:
      // 白色渐亮表示开机
      ledController.setColor(255, 255, 255);
      ledController.setBrightness(50);
      ledController.fadeIn(1000);
      break;
      
    case StartupPhase::SYSTEM_INIT:
      // 蓝色慢闪表示系统初始化
      ledController.setColor(0, 100, 255);
      ledController.setBrightness(100);
      ledController.setBlinkPattern(500, 500);
      break;
      
    case StartupPhase::SENSOR_INIT:
      // 黄色闪烁表示传感器初始化
      ledController.setColor(255, 255, 0);
      ledController.setBrightness(150);
      ledController.setBlinkPattern(300, 300);
      break;
      
    case StartupPhase::WIFI_INIT:
      // 紫色闪烁表示WiFi初始化
      ledController.setColor(255, 0, 255);
      ledController.setBrightness(120);
      ledController.setBlinkPattern(400, 400);
      break;
      
    case StartupPhase::CONFIG_CHECK:
      // 青色闪烁表示配置检查
      ledController.setColor(0, 255, 255);
      ledController.setBrightness(130);
      ledController.setBlinkPattern(600, 200);
      break;
      
    case StartupPhase::READY:
      // 绿色常亮表示就绪
      ledController.setColor(0, 255, 0);
      ledController.setBrightness(200);
      ledController.turnOn();
      break;
      
    case StartupPhase::ERROR:
      // 红色快闪表示错误
      ledController.setColor(255, 0, 0);
      ledController.setBrightness(255);
      ledController.setBlinkPattern(100, 100);
      break;
  }
}

void StartupManager::indicateError(StartupError error) {
  // 根据错误类型显示不同的红色闪烁模式
  ledController.setColor(255, 0, 0);
  ledController.setBrightness(255);
  
  switch (error) {
    case StartupError::SENSOR_FAILURE:
      // 2短1长闪烁
      for (int i = 0; i < 2; i++) {
        ledController.turnOn();
        delay(100);
        ledController.turnOff();
        delay(100);
      }
      ledController.turnOn();
      delay(500);
      ledController.turnOff();
      delay(500);
      break;
      
    case StartupError::WIFI_FAILURE:
      // 3短闪烁
      for (int i = 0; i < 3; i++) {
        ledController.turnOn();
        delay(100);
        ledController.turnOff();
        delay(100);
      }
      delay(800);
      break;
      
    case StartupError::CONFIG_FAILURE:
      // 1长闪烁
      ledController.turnOn();
      delay(800);
      ledController.turnOff();
      delay(200);
      break;
      
    case StartupError::SYSTEM_FAILURE:
      // 连续快闪
      ledController.setBlinkPattern(50, 50);
      break;
      
    default:
      ledController.setBlinkPattern(200, 200);
      break;
  }
}

void StartupManager::playStartupSound() {
  // 播放开机音效：上升音调
  soundController.playTone(440, 200);  // A4
  delay(100);
  soundController.playTone(523, 200);  // C5
  delay(100);
  soundController.playTone(659, 300);  // E5
}

void StartupManager::playReadySound() {
  // 播放就绪音效：愉快的和弦
  soundController.playTone(523, 150);  // C5
  delay(50);
  soundController.playTone(659, 150);  // E5
  delay(50);
  soundController.playTone(784, 200);  // G5
  delay(100);
  soundController.playTone(1047, 300); // C6
}

void StartupManager::playErrorSound() {
  // 播放错误音效：下降音调
  soundController.playTone(659, 200);  // E5
  delay(100);
  soundController.playTone(523, 200);  // C5
  delay(100);
  soundController.playTone(440, 400);  // A4
}

void StartupManager::showCurrentStatus() {
  // 根据当前系统状态显示相应的LED颜色
  if (sensorManager.getLastError() != "") {
    // 传感器错误 - 橙色
    ledController.setColor(255, 165, 0);
  } else if (!wifiManager.isConnected()) {
    // WiFi未连接 - 蓝色
    ledController.setColor(0, 100, 255);
  } else if (!configManager.isDeviceConfigured()) {
    // 未配置 - 紫色
    ledController.setColor(255, 0, 255);
  } else {
    // 正常状态 - 绿色
    ledController.setColor(0, 255, 0);
  }
  
  ledController.setBrightness(150);
  ledController.turnOn();
}

void StartupManager::showStartupProgress() {
  // 显示启动进度（通过LED亮度表示）
  int progress = 0;
  
  switch (currentPhase) {
    case StartupPhase::POWER_ON:
      progress = 10;
      break;
    case StartupPhase::SYSTEM_INIT:
      progress = 25;
      break;
    case StartupPhase::SENSOR_INIT:
      progress = 50;
      break;
    case StartupPhase::WIFI_INIT:
      progress = 75;
      break;
    case StartupPhase::CONFIG_CHECK:
      progress = 90;
      break;
    case StartupPhase::READY:
      progress = 100;
      break;
    case StartupPhase::ERROR:
      progress = 0;
      break;
  }
  
  ledController.setBrightness(map(progress, 0, 100, 50, 255));
  
  Serial.print("[STARTUP] Progress: ");
  Serial.print(progress);
  Serial.println("%");
}

bool StartupManager::performSystemCheck() {
  Serial.println("[CHECK] Performing system check...");
  
  // 检查内存
  size_t freeHeap = ESP.getFreeHeap();
  if (freeHeap < 50000) { // 至少需要50KB空闲内存
    Serial.print("[CHECK] Low memory: ");
    Serial.println(freeHeap);
    return false;
  }
  
  // 检查Flash
  size_t flashSize = ESP.getFlashChipSize();
  if (flashSize < 4000000) { // 至少需要4MB Flash
    Serial.print("[CHECK] Insufficient flash: ");
    Serial.println(flashSize);
    return false;
  }
  
  Serial.println("[CHECK] System check passed");
  return true;
}

bool StartupManager::performSensorCheck() {
  Serial.println("[CHECK] Performing sensor check...");
  
  // 初始化传感器
  if (!sensorManager.begin()) {
    Serial.println("[CHECK] Sensor initialization failed");
    return false;
  }
  
  // 测试传感器读取
  delay(1000); // 等待传感器稳定
  
  float moisture = sensorManager.getMoistureLevel();
  float light = sensorManager.getLightLevel();
  
  if (moisture < 0 || light < 0) {
    Serial.println("[CHECK] Sensor reading failed");
    return false;
  }
  
  Serial.println("[CHECK] Sensor check passed");
  return true;
}

bool StartupManager::performWiFiCheck() {
  Serial.println("[CHECK] Performing WiFi check...");
  
  // 检查WiFi凭据
  if (!configManager.hasWiFiCredentials()) {
    Serial.println("[CHECK] No WiFi credentials, skipping WiFi connection");
    return true; // WiFi不是必需的，可以离线运行
  }
  
  // 尝试连接WiFi
  WiFiCredentials creds = configManager.getWiFiCredentials();
  if (!wifiManager.connect(creds.ssid, creds.password)) {
    Serial.println("[CHECK] WiFi connection failed, continuing in offline mode");
    return true; // WiFi连接失败不是致命错误
  }
  
  Serial.println("[CHECK] WiFi check passed");
  return true;
}

bool StartupManager::performConfigCheck() {
  Serial.println("[CHECK] Performing configuration check...");
  
  // 检查设备配置
  if (!configManager.isDeviceConfigured()) {
    Serial.println("[CHECK] Device not configured, entering configuration mode");
    configManager.enterConfigurationMode();
    return true; // 配置模式不是错误状态
  }
  
  DeviceConfiguration config = configManager.getDeviceConfiguration();
  
  // 验证配置有效性
  if (config.moistureThreshold <= 0 || config.moistureThreshold > 100) {
    Serial.println("[CHECK] Invalid moisture threshold");
    return false;
  }
  
  if (config.lightThreshold <= 0 || config.lightThreshold > 10000) {
    Serial.println("[CHECK] Invalid light threshold");
    return false;
  }
  
  Serial.println("[CHECK] Configuration check passed");
  return true;
}

void StartupManager::update() {
  if (startupComplete) return;
  
  // 检查阶段超时
  if (isPhaseTimeout()) {
    Serial.println("[STARTUP] Phase timeout, moving to error state");
    setError(StartupError::SYSTEM_FAILURE);
    return;
  }
  
  // 更新启动进度显示
  showStartupProgress();
}