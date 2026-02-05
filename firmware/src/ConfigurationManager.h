/**
 * 配置管理器
 * 处理设备首次配置和配置模式
 */

#ifndef CONFIGURATION_MANAGER_H
#define CONFIGURATION_MANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <Preferences.h>

struct DeviceConfiguration {
  String deviceName;
  String plantType;
  String location;
  bool monitoringEnabled;
  bool alertsEnabled;
  bool autoWatering;
  float moistureThreshold;
  float lightThreshold;
  bool isConfigured;
  unsigned long configTimestamp;
};

struct WiFiCredentials {
  String ssid;
  String password;
  bool isSet;
};

class ConfigurationManager {
private:
  Preferences preferences;
  DeviceConfiguration currentConfig;
  WiFiCredentials wifiCredentials;
  bool configurationMode;
  unsigned long configModeStartTime;
  
  static const char* CONFIG_NAMESPACE;
  static const char* WIFI_NAMESPACE;
  static const unsigned long CONFIG_MODE_TIMEOUT = 300000; // 5分钟超时

  void loadDefaultConfiguration();
  void saveConfiguration();
  void loadConfiguration();
  void saveWiFiCredentials();
  void loadWiFiCredentials();

public:
  ConfigurationManager();
  
  // 配置模式管理
  void enterConfigurationMode();
  void exitConfigurationMode();
  bool isInConfigurationMode() const;
  bool isConfigurationModeExpired() const;
  
  // 设备配置
  bool isDeviceConfigured() const;
  void setDeviceConfiguration(const DeviceConfiguration& config);
  DeviceConfiguration getDeviceConfiguration() const;
  void resetConfiguration();
  
  // WiFi配置
  void setWiFiCredentials(const String& ssid, const String& password);
  WiFiCredentials getWiFiCredentials() const;
  bool hasWiFiCredentials() const;
  void clearWiFiCredentials();
  
  // JSON序列化
  String configurationToJson() const;
  bool configurationFromJson(const String& json);
  
  // 配置验证
  bool validateConfiguration(const DeviceConfiguration& config) const;
  
  // 状态指示
  void indicateConfigurationMode();
  void indicateConfigurationComplete();
  void indicateConfigurationError();
  
  // 更新处理
  void update();
};

#endif // CONFIGURATION_MANAGER_H