/**
 * 配置管理器实现
 */

#include "ConfigurationManager.h"
#include "LEDController.h"

const char* ConfigurationManager::CONFIG_NAMESPACE = "device_config";
const char* ConfigurationManager::WIFI_NAMESPACE = "wifi_config";

extern LEDController ledController;

ConfigurationManager::ConfigurationManager() 
  : configurationMode(false), configModeStartTime(0) {
  loadConfiguration();
  loadWiFiCredentials();
  
  // 如果设备未配置，自动进入配置模式
  if (!isDeviceConfigured()) {
    enterConfigurationMode();
  }
}

void ConfigurationManager::loadDefaultConfiguration() {
  currentConfig.deviceName = "植物小帮手";
  currentConfig.plantType = "";
  currentConfig.location = "";
  currentConfig.monitoringEnabled = true;
  currentConfig.alertsEnabled = true;
  currentConfig.autoWatering = false;
  currentConfig.moistureThreshold = 30.0f;
  currentConfig.lightThreshold = 500.0f;
  currentConfig.isConfigured = false;
  currentConfig.configTimestamp = 0;
}

void ConfigurationManager::saveConfiguration() {
  preferences.begin(CONFIG_NAMESPACE, false);
  
  preferences.putString("deviceName", currentConfig.deviceName);
  preferences.putString("plantType", currentConfig.plantType);
  preferences.putString("location", currentConfig.location);
  preferences.putBool("monitoringEnabled", currentConfig.monitoringEnabled);
  preferences.putBool("alertsEnabled", currentConfig.alertsEnabled);
  preferences.putBool("autoWatering", currentConfig.autoWatering);
  preferences.putFloat("moistureThreshold", currentConfig.moistureThreshold);
  preferences.putFloat("lightThreshold", currentConfig.lightThreshold);
  preferences.putBool("isConfigured", currentConfig.isConfigured);
  preferences.putULong64("configTimestamp", currentConfig.configTimestamp);
  
  preferences.end();
  
  Serial.println("Configuration saved to flash");
}

void ConfigurationManager::loadConfiguration() {
  preferences.begin(CONFIG_NAMESPACE, true);
  
  if (preferences.isKey("isConfigured")) {
    currentConfig.deviceName = preferences.getString("deviceName", "植物小帮手");
    currentConfig.plantType = preferences.getString("plantType", "");
    currentConfig.location = preferences.getString("location", "");
    currentConfig.monitoringEnabled = preferences.getBool("monitoringEnabled", true);
    currentConfig.alertsEnabled = preferences.getBool("alertsEnabled", true);
    currentConfig.autoWatering = preferences.getBool("autoWatering", false);
    currentConfig.moistureThreshold = preferences.getFloat("moistureThreshold", 30.0f);
    currentConfig.lightThreshold = preferences.getFloat("lightThreshold", 500.0f);
    currentConfig.isConfigured = preferences.getBool("isConfigured", false);
    currentConfig.configTimestamp = preferences.getULong64("configTimestamp", 0);
    
    Serial.println("Configuration loaded from flash");
  } else {
    loadDefaultConfiguration();
    Serial.println("Using default configuration");
  }
  
  preferences.end();
}

void ConfigurationManager::saveWiFiCredentials() {
  preferences.begin(WIFI_NAMESPACE, false);
  
  preferences.putString("ssid", wifiCredentials.ssid);
  preferences.putString("password", wifiCredentials.password);
  preferences.putBool("isSet", wifiCredentials.isSet);
  
  preferences.end();
  
  Serial.println("WiFi credentials saved");
}

void ConfigurationManager::loadWiFiCredentials() {
  preferences.begin(WIFI_NAMESPACE, true);
  
  wifiCredentials.ssid = preferences.getString("ssid", "");
  wifiCredentials.password = preferences.getString("password", "");
  wifiCredentials.isSet = preferences.getBool("isSet", false);
  
  preferences.end();
  
  if (wifiCredentials.isSet) {
    Serial.println("WiFi credentials loaded");
  }
}

void ConfigurationManager::enterConfigurationMode() {
  configurationMode = true;
  configModeStartTime = millis();
  
  Serial.println("Entering configuration mode");
  indicateConfigurationMode();
}

void ConfigurationManager::exitConfigurationMode() {
  configurationMode = false;
  configModeStartTime = 0;
  
  Serial.println("Exiting configuration mode");
}

bool ConfigurationManager::isInConfigurationMode() const {
  return configurationMode;
}

bool ConfigurationManager::isConfigurationModeExpired() const {
  if (!configurationMode) return false;
  return (millis() - configModeStartTime) > CONFIG_MODE_TIMEOUT;
}

bool ConfigurationManager::isDeviceConfigured() const {
  return currentConfig.isConfigured && 
         !currentConfig.plantType.isEmpty() && 
         !currentConfig.location.isEmpty();
}

void ConfigurationManager::setDeviceConfiguration(const DeviceConfiguration& config) {
  if (validateConfiguration(config)) {
    currentConfig = config;
    currentConfig.isConfigured = true;
    currentConfig.configTimestamp = millis();
    
    saveConfiguration();
    exitConfigurationMode();
    indicateConfigurationComplete();
    
    Serial.println("Device configuration updated");
  } else {
    indicateConfigurationError();
    Serial.println("Invalid configuration provided");
  }
}

DeviceConfiguration ConfigurationManager::getDeviceConfiguration() const {
  return currentConfig;
}

void ConfigurationManager::resetConfiguration() {
  loadDefaultConfiguration();
  saveConfiguration();
  enterConfigurationMode();
  
  Serial.println("Configuration reset to defaults");
}

void ConfigurationManager::setWiFiCredentials(const String& ssid, const String& password) {
  wifiCredentials.ssid = ssid;
  wifiCredentials.password = password;
  wifiCredentials.isSet = true;
  
  saveWiFiCredentials();
  
  Serial.println("WiFi credentials updated");
}

WiFiCredentials ConfigurationManager::getWiFiCredentials() const {
  return wifiCredentials;
}

bool ConfigurationManager::hasWiFiCredentials() const {
  return wifiCredentials.isSet && 
         !wifiCredentials.ssid.isEmpty() && 
         !wifiCredentials.password.isEmpty();
}

void ConfigurationManager::clearWiFiCredentials() {
  wifiCredentials.ssid = "";
  wifiCredentials.password = "";
  wifiCredentials.isSet = false;
  
  saveWiFiCredentials();
  
  Serial.println("WiFi credentials cleared");
}

String ConfigurationManager::configurationToJson() const {
  DynamicJsonDocument doc(1024);
  
  doc["deviceName"] = currentConfig.deviceName;
  doc["plantType"] = currentConfig.plantType;
  doc["location"] = currentConfig.location;
  doc["monitoringEnabled"] = currentConfig.monitoringEnabled;
  doc["alertsEnabled"] = currentConfig.alertsEnabled;
  doc["autoWatering"] = currentConfig.autoWatering;
  doc["moistureThreshold"] = currentConfig.moistureThreshold;
  doc["lightThreshold"] = currentConfig.lightThreshold;
  doc["isConfigured"] = currentConfig.isConfigured;
  doc["configTimestamp"] = currentConfig.configTimestamp;
  
  String jsonString;
  serializeJson(doc, jsonString);
  return jsonString;
}

bool ConfigurationManager::configurationFromJson(const String& json) {
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, json);
  
  if (error) {
    Serial.print("JSON parsing failed: ");
    Serial.println(error.c_str());
    return false;
  }
  
  DeviceConfiguration newConfig;
  newConfig.deviceName = doc["deviceName"] | currentConfig.deviceName;
  newConfig.plantType = doc["plantType"] | "";
  newConfig.location = doc["location"] | "";
  newConfig.monitoringEnabled = doc["monitoringEnabled"] | true;
  newConfig.alertsEnabled = doc["alertsEnabled"] | true;
  newConfig.autoWatering = doc["autoWatering"] | false;
  newConfig.moistureThreshold = doc["moistureThreshold"] | 30.0f;
  newConfig.lightThreshold = doc["lightThreshold"] | 500.0f;
  
  if (validateConfiguration(newConfig)) {
    setDeviceConfiguration(newConfig);
    return true;
  }
  
  return false;
}

bool ConfigurationManager::validateConfiguration(const DeviceConfiguration& config) const {
  // 验证必需字段
  if (config.deviceName.isEmpty()) return false;
  
  // 验证阈值范围
  if (config.moistureThreshold < 0 || config.moistureThreshold > 100) return false;
  if (config.lightThreshold < 0 || config.lightThreshold > 10000) return false;
  
  return true;
}

void ConfigurationManager::indicateConfigurationMode() {
  // 蓝色慢闪表示配置模式
  ledController.setColor(0, 0, 255);
  ledController.setBrightness(128);
  ledController.setBlinkPattern(1000, 1000); // 1秒开，1秒关
}

void ConfigurationManager::indicateConfigurationComplete() {
  // 绿色快闪3次表示配置完成
  ledController.setColor(0, 255, 0);
  ledController.setBrightness(255);
  
  for (int i = 0; i < 3; i++) {
    ledController.turnOn();
    delay(200);
    ledController.turnOff();
    delay(200);
  }
  
  // 恢复正常状态指示
  ledController.setColor(0, 255, 0);
  ledController.turnOn();
}

void ConfigurationManager::indicateConfigurationError() {
  // 红色快闪5次表示配置错误
  ledController.setColor(255, 0, 0);
  ledController.setBrightness(255);
  
  for (int i = 0; i < 5; i++) {
    ledController.turnOn();
    delay(100);
    ledController.turnOff();
    delay(100);
  }
  
  // 返回配置模式指示
  indicateConfigurationMode();
}

void ConfigurationManager::update() {
  // 检查配置模式超时
  if (isInConfigurationMode() && isConfigurationModeExpired()) {
    Serial.println("Configuration mode timeout, using default settings");
    exitConfigurationMode();
    
    // 如果仍未配置，使用默认设置
    if (!isDeviceConfigured()) {
      currentConfig.isConfigured = true;
      currentConfig.plantType = "默认植物";
      currentConfig.location = "未知位置";
      saveConfiguration();
    }
  }
}