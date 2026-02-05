#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

/**
 * Wi-Fi连接管理器
 * 负责Wi-Fi连接、重连逻辑、网络状态监测和离线模式处理
 */

enum class WiFiStatus {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
  CONNECTION_FAILED,
  RECONNECTING,
  OFFLINE_MODE
};

enum class ConnectionMode {
  STATION,      // 连接到现有网络
  ACCESS_POINT, // 创建热点
  SMART_CONFIG  // 智能配置模式
};

struct WiFiCredentials {
  String ssid;
  String password;
  bool isValid() const {
    return ssid.length() > 0 && password.length() >= 8;
  }
};

struct WiFiConfig {
  WiFiCredentials credentials;
  ConnectionMode mode;
  bool autoReconnect;
  unsigned long reconnectInterval;  // 重连间隔（毫秒）
  int maxReconnectAttempts;        // 最大重连次数
  unsigned long connectionTimeout; // 连接超时（毫秒）
  bool enableOfflineMode;          // 启用离线模式
  String deviceHostname;           // 设备主机名
};

struct WiFiNetworkInfo {
  String ssid;
  int rssi;
  wifi_auth_mode_t authMode;
  int channel;
  bool isHidden;
};

struct WiFiConnectionStats {
  unsigned long totalConnections;
  unsigned long successfulConnections;
  unsigned long failedConnections;
  unsigned long reconnections;
  unsigned long totalUptime;
  unsigned long currentSessionUptime;
  float averageRSSI;
  unsigned long lastConnectionTime;
  unsigned long lastDisconnectionTime;
};

class WiFiManager {
private:
  WiFiConfig config;
  WiFiStatus currentStatus;
  WiFiConnectionStats stats;
  
  // 连接管理
  unsigned long lastConnectionAttempt;
  int currentReconnectAttempts;
  bool isReconnecting;
  
  // 网络扫描
  std::vector<WiFiNetworkInfo> availableNetworks;
  unsigned long lastNetworkScan;
  static const unsigned long NETWORK_SCAN_INTERVAL = 30000; // 30秒
  
  // 回调函数
  void (*connectionStatusCallback)(WiFiStatus status);
  void (*networkScanCallback)(const std::vector<WiFiNetworkInfo>& networks);
  void (*offlineModeCallback)(bool enabled);
  
  // 智能配置
  bool smartConfigActive;
  unsigned long smartConfigStartTime;
  static const unsigned long SMART_CONFIG_TIMEOUT = 120000; // 2分钟
  
  // 离线模式
  bool offlineModeEnabled;
  unsigned long offlineModeStartTime;

public:
  WiFiManager();
  
  // 初始化和配置
  bool initialize();
  void setConfig(const WiFiConfig& newConfig);
  WiFiConfig getConfig() const;
  void setDefaultConfig();
  
  // 连接管理
  bool connect();
  bool connect(const String& ssid, const String& password);
  void disconnect();
  void reconnect();
  
  // 状态查询
  WiFiStatus getStatus() const;
  bool isConnected() const;
  bool isConnecting() const;
  String getSSID() const;
  String getLocalIP() const;
  int getRSSI() const;
  String getMACAddress() const;
  
  // 网络扫描
  void startNetworkScan();
  std::vector<WiFiNetworkInfo> getAvailableNetworks() const;
  bool isNetworkAvailable(const String& ssid) const;
  
  // 智能配置
  bool startSmartConfig();
  void stopSmartConfig();
  bool isSmartConfigActive() const;
  
  // 接入点模式
  bool startAccessPoint(const String& ssid, const String& password = "");
  void stopAccessPoint();
  bool isAccessPointActive() const;
  
  // 离线模式
  void enableOfflineMode();
  void disableOfflineMode();
  bool isOfflineModeEnabled() const;
  
  // 更新和维护
  void update();
  void handleConnectionEvents();
  
  // 统计信息
  WiFiConnectionStats getConnectionStats() const;
  void resetStats();
  void printConnectionInfo() const;
  
  // 回调函数设置
  void setConnectionStatusCallback(void (*callback)(WiFiStatus));
  void setNetworkScanCallback(void (*callback)(const std::vector<WiFiNetworkInfo>&));
  void setOfflineModeCallback(void (*callback)(bool));
  
  // 网络质量检测
  bool performConnectivityTest();
  int measureSignalQuality() const;
  unsigned long measureLatency(const String& host = "8.8.8.8") const;
  
  // 凭据管理
  bool saveCredentials(const WiFiCredentials& credentials);
  WiFiCredentials loadCredentials() const;
  void clearCredentials();
  
  // 电源管理集成
  void enterLowPowerMode();
  void exitLowPowerMode();
  bool isInLowPowerMode() const;

private:
  // 内部方法
  void handleConnectionSuccess();
  void handleConnectionFailure();
  void handleDisconnection();
  void updateConnectionStats();
  void checkConnectionHealth();
  
  // 事件处理
  static void onWiFiEvent(WiFiEvent_t event);
  void processWiFiEvent(WiFiEvent_t event);
  
  // 网络扫描内部方法
  void performNetworkScan();
  void processNetworkScanResults();
  
  // 智能配置内部方法
  void handleSmartConfigEvent();
  void processSmartConfigData();
  
  // 低功耗模式
  bool lowPowerModeEnabled;
  void configureLowPowerWiFi();
  void configureNormalWiFi();
  
  // 持久化存储
  void saveConfigToNVS();
  void loadConfigFromNVS();
  
  // 网络质量
  void updateSignalQuality();
  float signalQualityHistory[10];
  int signalQualityIndex;
};

// WiFi事件处理器
class WiFiEventHandler {
public:
  static WiFiManager* instance;
  static void handleEvent(WiFiEvent_t event);
};

#endif // WIFI_MANAGER_H