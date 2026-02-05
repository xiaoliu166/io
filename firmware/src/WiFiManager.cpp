#include "WiFiManager.h"
#include <Preferences.h>
#include <esp_wifi.h>
#include <esp_smartconfig.h>

// 静态成员初始化
WiFiManager* WiFiEventHandler::instance = nullptr;

WiFiManager::WiFiManager() 
  : currentStatus(WiFiStatus::DISCONNECTED)
  , lastConnectionAttempt(0)
  , currentReconnectAttempts(0)
  , isReconnecting(false)
  , lastNetworkScan(0)
  , connectionStatusCallback(nullptr)
  , networkScanCallback(nullptr)
  , offlineModeCallback(nullptr)
  , smartConfigActive(false)
  , smartConfigStartTime(0)
  , offlineModeEnabled(false)
  , offlineModeStartTime(0)
  , lowPowerModeEnabled(false)
  , signalQualityIndex(0)
{
  setDefaultConfig();
  
  // 初始化统计信息
  stats = {
    .totalConnections = 0,
    .successfulConnections = 0,
    .failedConnections = 0,
    .reconnections = 0,
    .totalUptime = 0,
    .currentSessionUptime = 0,
    .averageRSSI = 0.0f,
    .lastConnectionTime = 0,
    .lastDisconnectionTime = 0
  };
  
  // 初始化信号质量历史
  for (int i = 0; i < 10; i++) {
    signalQualityHistory[i] = 0.0f;
  }
  
  // 设置事件处理器
  WiFiEventHandler::instance = this;
}

bool WiFiManager::initialize() {
  // 设置WiFi模式
  WiFi.mode(WIFI_STA);
  
  // 设置主机名
  if (config.deviceHostname.length() > 0) {
    WiFi.setHostname(config.deviceHostname.c_str());
  }
  
  // 注册事件处理器
  WiFi.onEvent(WiFiEventHandler::handleEvent);
  
  // 加载保存的配置
  loadConfigFromNVS();
  
  Serial.println("WiFiManager initialized");
  return true;
}

void WiFiManager::setDefaultConfig() {
  config = {
    .credentials = {"", ""},
    .mode = ConnectionMode::STATION,
    .autoReconnect = true,
    .reconnectInterval = 30000,  // 30秒
    .maxReconnectAttempts = 5,
    .connectionTimeout = 20000,  // 20秒
    .enableOfflineMode = true,
    .deviceHostname = "PlantCareRobot"
  };
}

bool WiFiManager::connect() {
  if (!config.credentials.isValid()) {
    Serial.println("WiFi credentials not valid");
    return false;
  }
  
  return connect(config.credentials.ssid, config.credentials.password);
}

bool WiFiManager::connect(const String& ssid, const String& password) {
  if (currentStatus == WiFiStatus::CONNECTING || currentStatus == WiFiStatus::CONNECTED) {
    return true;
  }
  
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  currentStatus = WiFiStatus::CONNECTING;
  lastConnectionAttempt = millis();
  stats.totalConnections++;
  
  // 通知状态变化
  if (connectionStatusCallback) {
    connectionStatusCallback(currentStatus);
  }
  
  // 开始连接
  WiFi.begin(ssid.c_str(), password.c_str());
  
  // 等待连接结果
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && 
         millis() - startTime < config.connectionTimeout) {
    delay(100);
    
    // 检查是否被中断
    if (currentStatus != WiFiStatus::CONNECTING) {
      return false;
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    handleConnectionSuccess();
    return true;
  } else {
    handleConnectionFailure();
    return false;
  }
}

void WiFiManager::disconnect() {
  Serial.println("Disconnecting from WiFi");
  
  WiFi.disconnect(true);
  currentStatus = WiFiStatus::DISCONNECTED;
  
  if (connectionStatusCallback) {
    connectionStatusCallback(currentStatus);
  }
}

void WiFiManager::reconnect() {
  if (isReconnecting || currentStatus == WiFiStatus::CONNECTED) {
    return;
  }
  
  Serial.println("Attempting to reconnect to WiFi");
  
  isReconnecting = true;
  currentStatus = WiFiStatus::RECONNECTING;
  stats.reconnections++;
  
  if (connectionStatusCallback) {
    connectionStatusCallback(currentStatus);
  }
  
  bool success = connect();
  
  if (!success) {
    currentReconnectAttempts++;
    
    if (currentReconnectAttempts >= config.maxReconnectAttempts) {
      Serial.println("Max reconnect attempts reached, enabling offline mode");
      enableOfflineMode();
      currentReconnectAttempts = 0;
    }
  } else {
    currentReconnectAttempts = 0;
  }
  
  isReconnecting = false;
}

void WiFiManager::handleConnectionSuccess() {
  currentStatus = WiFiStatus::CONNECTED;
  stats.successfulConnections++;
  stats.lastConnectionTime = millis();
  currentReconnectAttempts = 0;
  
  // 禁用离线模式
  if (offlineModeEnabled) {
    disableOfflineMode();
  }
  
  Serial.println("WiFi connected successfully");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.print("RSSI: ");
  Serial.println(WiFi.RSSI());
  
  // 保存成功的凭据
  saveCredentials({WiFi.SSID(), WiFi.psk()});
  
  if (connectionStatusCallback) {
    connectionStatusCallback(currentStatus);
  }
}

void WiFiManager::handleConnectionFailure() {
  currentStatus = WiFiStatus::CONNECTION_FAILED;
  stats.failedConnections++;
  
  Serial.println("WiFi connection failed");
  
  if (connectionStatusCallback) {
    connectionStatusCallback(currentStatus);
  }
  
  // 如果启用自动重连，安排重连
  if (config.autoReconnect && currentReconnectAttempts < config.maxReconnectAttempts) {
    // 延迟重连将在update()中处理
  } else if (config.enableOfflineMode) {
    enableOfflineMode();
  }
}

void WiFiManager::handleDisconnection() {
  if (currentStatus == WiFiStatus::CONNECTED) {
    currentStatus = WiFiStatus::DISCONNECTED;
    stats.lastDisconnectionTime = millis();
    
    Serial.println("WiFi disconnected");
    
    if (connectionStatusCallback) {
      connectionStatusCallback(currentStatus);
    }
    
    // 如果启用自动重连，开始重连
    if (config.autoReconnect) {
      reconnect();
    }
  }
}

void WiFiManager::update() {
  unsigned long currentTime = millis();
  
  // 更新连接统计
  updateConnectionStats();
  
  // 检查连接健康状态
  checkConnectionHealth();
  
  // 处理自动重连
  if (config.autoReconnect && 
      currentStatus == WiFiStatus::CONNECTION_FAILED &&
      !isReconnecting &&
      currentTime - lastConnectionAttempt >= config.reconnectInterval) {
    reconnect();
  }
  
  // 定期扫描网络
  if (currentTime - lastNetworkScan >= NETWORK_SCAN_INTERVAL) {
    startNetworkScan();
  }
  
  // 处理智能配置超时
  if (smartConfigActive && 
      currentTime - smartConfigStartTime >= SMART_CONFIG_TIMEOUT) {
    stopSmartConfig();
  }
  
  // 更新信号质量
  if (isConnected()) {
    updateSignalQuality();
  }
}

void WiFiManager::startNetworkScan() {
  if (WiFi.getMode() == WIFI_STA || WiFi.getMode() == WIFI_AP_STA) {
    WiFi.scanNetworks(true); // 异步扫描
    lastNetworkScan = millis();
  }
}

std::vector<WiFiNetworkInfo> WiFiManager::getAvailableNetworks() const {
  return availableNetworks;
}

void WiFiManager::performNetworkScan() {
  int networkCount = WiFi.scanComplete();
  
  if (networkCount == WIFI_SCAN_RUNNING) {
    return; // 扫描仍在进行中
  }
  
  if (networkCount >= 0) {
    availableNetworks.clear();
    
    for (int i = 0; i < networkCount; i++) {
      WiFiNetworkInfo info;
      info.ssid = WiFi.SSID(i);
      info.rssi = WiFi.RSSI(i);
      info.authMode = WiFi.encryptionType(i);
      info.channel = WiFi.channel(i);
      info.isHidden = (info.ssid.length() == 0);
      
      availableNetworks.push_back(info);
    }
    
    // 按信号强度排序
    std::sort(availableNetworks.begin(), availableNetworks.end(),
              [](const WiFiNetworkInfo& a, const WiFiNetworkInfo& b) {
                return a.rssi > b.rssi;
              });
    
    if (networkScanCallback) {
      networkScanCallback(availableNetworks);
    }
    
    WiFi.scanDelete(); // 清理扫描结果
  }
}

bool WiFiManager::startSmartConfig() {
  if (smartConfigActive) {
    return false;
  }
  
  Serial.println("Starting SmartConfig");
  
  WiFi.mode(WIFI_AP_STA);
  WiFi.beginSmartConfig();
  
  smartConfigActive = true;
  smartConfigStartTime = millis();
  
  return true;
}

void WiFiManager::stopSmartConfig() {
  if (!smartConfigActive) {
    return;
  }
  
  Serial.println("Stopping SmartConfig");
  
  WiFi.stopSmartConfig();
  smartConfigActive = false;
}

bool WiFiManager::startAccessPoint(const String& ssid, const String& password) {
  Serial.print("Starting Access Point: ");
  Serial.println(ssid);
  
  bool success;
  if (password.length() > 0) {
    success = WiFi.softAP(ssid.c_str(), password.c_str());
  } else {
    success = WiFi.softAP(ssid.c_str());
  }
  
  if (success) {
    Serial.print("AP IP address: ");
    Serial.println(WiFi.softAPIP());
  }
  
  return success;
}

void WiFiManager::stopAccessPoint() {
  Serial.println("Stopping Access Point");
  WiFi.softAPdisconnect(true);
}

void WiFiManager::enableOfflineMode() {
  if (offlineModeEnabled) {
    return;
  }
  
  Serial.println("Enabling offline mode");
  
  offlineModeEnabled = true;
  offlineModeStartTime = millis();
  currentStatus = WiFiStatus::OFFLINE_MODE;
  
  if (offlineModeCallback) {
    offlineModeCallback(true);
  }
  
  if (connectionStatusCallback) {
    connectionStatusCallback(currentStatus);
  }
}

void WiFiManager::disableOfflineMode() {
  if (!offlineModeEnabled) {
    return;
  }
  
  Serial.println("Disabling offline mode");
  
  offlineModeEnabled = false;
  
  if (offlineModeCallback) {
    offlineModeCallback(false);
  }
}

bool WiFiManager::performConnectivityTest() {
  if (!isConnected()) {
    return false;
  }
  
  WiFiClient client;
  if (client.connect("www.google.com", 80)) {
    client.println("GET / HTTP/1.1");
    client.println("Host: www.google.com");
    client.println("Connection: close");
    client.println();
    
    unsigned long timeout = millis() + 5000;
    while (client.available() == 0 && millis() < timeout) {
      delay(10);
    }
    
    client.stop();
    return millis() < timeout;
  }
  
  return false;
}

void WiFiManager::updateConnectionStats() {
  if (isConnected()) {
    stats.currentSessionUptime = millis() - stats.lastConnectionTime;
    stats.totalUptime += 100; // 增加100ms（假设每100ms调用一次）
  }
}

void WiFiManager::checkConnectionHealth() {
  if (isConnected()) {
    int rssi = WiFi.RSSI();
    if (rssi < -80) { // 信号很弱
      Serial.println("Warning: Weak WiFi signal");
    }
  }
}

void WiFiManager::updateSignalQuality() {
  if (isConnected()) {
    float rssi = (float)WiFi.RSSI();
    signalQualityHistory[signalQualityIndex] = rssi;
    signalQualityIndex = (signalQualityIndex + 1) % 10;
    
    // 计算平均RSSI
    float sum = 0;
    for (int i = 0; i < 10; i++) {
      sum += signalQualityHistory[i];
    }
    stats.averageRSSI = sum / 10.0f;
  }
}

// 状态查询方法
WiFiStatus WiFiManager::getStatus() const {
  return currentStatus;
}

bool WiFiManager::isConnected() const {
  return WiFi.status() == WL_CONNECTED && currentStatus == WiFiStatus::CONNECTED;
}

bool WiFiManager::isConnecting() const {
  return currentStatus == WiFiStatus::CONNECTING;
}

String WiFiManager::getSSID() const {
  return WiFi.SSID();
}

String WiFiManager::getLocalIP() const {
  return WiFi.localIP().toString();
}

int WiFiManager::getRSSI() const {
  return WiFi.RSSI();
}

String WiFiManager::getMACAddress() const {
  return WiFi.macAddress();
}

bool WiFiManager::isSmartConfigActive() const {
  return smartConfigActive;
}

bool WiFiManager::isAccessPointActive() const {
  return WiFi.getMode() == WIFI_AP || WiFi.getMode() == WIFI_AP_STA;
}

bool WiFiManager::isOfflineModeEnabled() const {
  return offlineModeEnabled;
}

WiFiConnectionStats WiFiManager::getConnectionStats() const {
  return stats;
}

void WiFiManager::resetStats() {
  stats = {0};
}

void WiFiManager::printConnectionInfo() const {
  Serial.println("=== WiFi Connection Info ===");
  Serial.print("Status: ");
  Serial.println((int)currentStatus);
  Serial.print("SSID: ");
  Serial.println(getSSID());
  Serial.print("IP: ");
  Serial.println(getLocalIP());
  Serial.print("RSSI: ");
  Serial.println(getRSSI());
  Serial.print("MAC: ");
  Serial.println(getMACAddress());
  Serial.println("============================");
}

// 回调函数设置
void WiFiManager::setConnectionStatusCallback(void (*callback)(WiFiStatus)) {
  connectionStatusCallback = callback;
}

void WiFiManager::setNetworkScanCallback(void (*callback)(const std::vector<WiFiNetworkInfo>&)) {
  networkScanCallback = callback;
}

void WiFiManager::setOfflineModeCallback(void (*callback)(bool)) {
  offlineModeCallback = callback;
}

// 凭据管理
bool WiFiManager::saveCredentials(const WiFiCredentials& credentials) {
  Preferences prefs;
  prefs.begin("wifi", false);
  
  prefs.putString("ssid", credentials.ssid);
  prefs.putString("password", credentials.password);
  
  prefs.end();
  
  config.credentials = credentials;
  return true;
}

WiFiCredentials WiFiManager::loadCredentials() const {
  Preferences prefs;
  prefs.begin("wifi", true);
  
  WiFiCredentials credentials;
  credentials.ssid = prefs.getString("ssid", "");
  credentials.password = prefs.getString("password", "");
  
  prefs.end();
  
  return credentials;
}

void WiFiManager::clearCredentials() {
  Preferences prefs;
  prefs.begin("wifi", false);
  prefs.clear();
  prefs.end();
  
  config.credentials = {"", ""};
}

void WiFiManager::saveConfigToNVS() {
  Preferences prefs;
  prefs.begin("wifi_config", false);
  
  prefs.putBool("autoReconnect", config.autoReconnect);
  prefs.putULong("reconnectInterval", config.reconnectInterval);
  prefs.putInt("maxReconnectAttempts", config.maxReconnectAttempts);
  prefs.putULong("connectionTimeout", config.connectionTimeout);
  prefs.putBool("enableOfflineMode", config.enableOfflineMode);
  prefs.putString("hostname", config.deviceHostname);
  
  prefs.end();
}

void WiFiManager::loadConfigFromNVS() {
  Preferences prefs;
  prefs.begin("wifi_config", true);
  
  config.autoReconnect = prefs.getBool("autoReconnect", true);
  config.reconnectInterval = prefs.getULong("reconnectInterval", 30000);
  config.maxReconnectAttempts = prefs.getInt("maxReconnectAttempts", 5);
  config.connectionTimeout = prefs.getULong("connectionTimeout", 20000);
  config.enableOfflineMode = prefs.getBool("enableOfflineMode", true);
  config.deviceHostname = prefs.getString("hostname", "PlantCareRobot");
  
  prefs.end();
  
  // 加载凭据
  config.credentials = loadCredentials();
}

// 事件处理器实现
void WiFiEventHandler::handleEvent(WiFiEvent_t event) {
  if (instance) {
    instance->processWiFiEvent(event);
  }
}

void WiFiManager::processWiFiEvent(WiFiEvent_t event) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      Serial.println("WiFi event: Connected to AP");
      break;
      
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      handleConnectionSuccess();
      break;
      
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      handleDisconnection();
      break;
      
    case ARDUINO_EVENT_WIFI_SCAN_DONE:
      performNetworkScan();
      break;
      
    case ARDUINO_EVENT_SC_GOT_SSID_PSWD:
      if (smartConfigActive) {
        Serial.println("SmartConfig: Got SSID and password");
        // 智能配置成功，保存凭据并连接
        WiFiCredentials newCredentials;
        newCredentials.ssid = WiFi.SSID();
        newCredentials.password = WiFi.psk();
        saveCredentials(newCredentials);
        stopSmartConfig();
      }
      break;
      
    default:
      break;
  }
}