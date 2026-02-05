#include "CommunicationProtocol.h"
#include <Preferences.h>
#include <esp_random.h>
#include <mbedtls/md5.h>

// 静态成员初始化
CommunicationProtocol* CommunicationProtocol::instance = nullptr;

CommunicationProtocol::CommunicationProtocol(WiFiManager* wifiMgr)
  : wifiManager(wifiMgr)
  , webSocketConnected(false)
  , messageReceivedCallback(nullptr)
  , connectionStatusCallback(nullptr)
  , syncCompleteCallback(nullptr)
  , errorCallback(nullptr)
  , isInitialized(false)
  , lastHeartbeat(0)
  , lastSyncAttempt(0)
  , compressionEnabled(false)
  , encryptionEnabled(false)
{
  setDefaultConfig();
  
  // 初始化统计信息
  stats = {
    .totalMessagesSent = 0,
    .totalMessagesReceived = 0,
    .failedTransmissions = 0,
    .successfulTransmissions = 0,
    .averageLatency = 0.0f,
    .lastSuccessfulSync = 0,
    .totalDataTransferred = 0,
    .currentQueueSize = 0
  };
  
  // 设置静态实例
  instance = this;
}

bool CommunicationProtocol::initialize() {
  if (!wifiManager) {
    Serial.println("CommunicationProtocol: WiFiManager not provided");
    return false;
  }
  
  // 加载配置
  loadConfigFromNVS();
  
  // 配置HTTP客户端
  if (config.useSSL) {
    secureClient.setInsecure(); // 在生产环境中应该使用证书验证
    httpClient.begin(secureClient, config.serverHost, config.serverPort, config.apiEndpoint);
  } else {
    httpClient.begin(config.serverHost, config.serverPort, config.apiEndpoint);
  }
  
  httpClient.setTimeout(config.requestTimeout);
  httpClient.addHeader("Content-Type", "application/json");
  httpClient.addHeader("X-Device-Token", config.deviceToken);
  httpClient.addHeader("X-API-Key", config.apiKey);
  
  // 配置WebSocket客户端
  webSocketClient.begin(config.serverHost, config.serverPort, config.websocketEndpoint);
  webSocketClient.onEvent([this](WStype_t type, uint8_t* payload, size_t length) {
    this->onWebSocketEvent(type, payload, length);
  });
  webSocketClient.setReconnectInterval(5000);
  
  // 启动新会话
  startNewSession();
  
  isInitialized = true;
  Serial.println("CommunicationProtocol initialized");
  
  return true;
}

void CommunicationProtocol::setDefaultConfig() {
  config = {
    .serverHost = "api.plantcare.com",
    .serverPort = 443,
    .apiEndpoint = "/api/v1",
    .websocketEndpoint = "/ws",
    .useSSL = true,
    .deviceToken = "",
    .apiKey = "",
    .clientCertificate = "",
    .clientPrivateKey = "",
    .primaryChannel = CommunicationChannel::HTTP_REST,
    .fallbackChannel = CommunicationChannel::WEBSOCKET,
    .dataFormat = DataFormat::JSON,
    .heartbeatInterval = 60000, // 1分钟
    .requestTimeout = 10000,    // 10秒
    .maxRetryAttempts = 3,
    .enableDataSync = true,
    .syncInterval = 300000,     // 5分钟
    .maxQueueSize = 100,
    .compressData = false
  };
}

bool CommunicationProtocol::sendMessage(MessageType type, const String& payload, bool priority) {
  if (!isInitialized) {
    return false;
  }
  
  // 创建消息
  QueuedMessage message = createQueuedMessage(type, payload, priority);
  
  // 如果网络连接可用，尝试立即发送
  if (wifiManager && wifiManager->isConnected()) {
    bool success = false;
    
    // 尝试主要通道
    if (config.primaryChannel == CommunicationChannel::HTTP_REST) {
      String response;
      success = sendHTTPRequest(config.apiEndpoint + "/messages", 
                               serializeMessage(message.header, message.payload), 
                               response);
    } else if (config.primaryChannel == CommunicationChannel::WEBSOCKET) {
      success = sendWebSocketMessage(serializeMessage(message.header, message.payload));
    }
    
    if (success) {
      stats.successfulTransmissions++;
      stats.totalMessagesSent++;
      return true;
    } else {
      // 主要通道失败，尝试备用通道
      if (config.fallbackChannel == CommunicationChannel::WEBSOCKET && 
          config.primaryChannel != CommunicationChannel::WEBSOCKET) {
        success = sendWebSocketMessage(serializeMessage(message.header, message.payload));
      }
      
      if (success) {
        stats.successfulTransmissions++;
        stats.totalMessagesSent++;
        return true;
      }
    }
  }
  
  // 发送失败或网络不可用，加入队列
  addToQueue(message);
  return false;
}

bool CommunicationProtocol::sendSensorData(const String& sensorData) {
  return sendMessage(MessageType::SENSOR_DATA, sensorData, false);
}

bool CommunicationProtocol::sendPlantStatus(const String& statusData) {
  return sendMessage(MessageType::PLANT_STATUS, statusData, false);
}

bool CommunicationProtocol::sendAlert(const String& alertData) {
  return sendMessage(MessageType::ALERT_NOTIFICATION, alertData, true);
}

bool CommunicationProtocol::sendHeartbeat() {
  DynamicJsonDocument doc(256);
  doc["deviceId"] = config.deviceToken;
  doc["timestamp"] = millis();
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["wifiRSSI"] = wifiManager ? wifiManager->getRSSI() : 0;
  
  String payload;
  serializeJson(doc, payload);
  
  bool success = sendMessage(MessageType::HEARTBEAT, payload, false);
  if (success) {
    lastHeartbeat = millis();
  }
  
  return success;
}

void CommunicationProtocol::update() {
  if (!isInitialized) {
    return;
  }
  
  unsigned long currentTime = millis();
  
  // 处理WebSocket事件
  webSocketClient.loop();
  
  // 处理传入消息
  processIncomingMessages();
  
  // 发送心跳
  if (currentTime - lastHeartbeat >= config.heartbeatInterval) {
    sendHeartbeat();
  }
  
  // 数据同步
  if (config.enableDataSync && 
      currentTime - lastSyncAttempt >= config.syncInterval) {
    startDataSync();
    lastSyncAttempt = currentTime;
  }
  
  // 处理消息队列
  processMessageQueue();
  
  // 重试失败的消息
  retryFailedMessages();
  
  // 清理过期消息
  purgeOldMessages();
  
  // 更新统计信息
  stats.currentQueueSize = messageQueue.size() + priorityQueue.size();
}

bool CommunicationProtocol::sendHTTPRequest(const String& endpoint, const String& data, String& response) {
  if (!wifiManager || !wifiManager->isConnected()) {
    return false;
  }
  
  unsigned long startTime = millis();
  
  httpClient.addHeader("Content-Length", String(data.length()));
  
  int httpResponseCode = httpClient.POST(data);
  
  if (httpResponseCode > 0) {
    response = httpClient.getString();
    
    // 计算延迟
    unsigned long latency = millis() - startTime;
    stats.averageLatency = (stats.averageLatency * 0.9f) + (latency * 0.1f);
    stats.totalDataTransferred += data.length() + response.length();
    
    if (httpResponseCode == 200) {
      return true;
    } else {
      Serial.print("HTTP Error: ");
      Serial.println(httpResponseCode);
      return false;
    }
  } else {
    Serial.print("HTTP Request failed: ");
    Serial.println(httpClient.errorToString(httpResponseCode));
    return false;
  }
}

bool CommunicationProtocol::sendWebSocketMessage(const String& data) {
  if (!webSocketConnected) {
    return false;
  }
  
  bool success = webSocketClient.sendTXT(data);
  
  if (success) {
    stats.totalDataTransferred += data.length();
  }
  
  return success;
}

void CommunicationProtocol::onWebSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("WebSocket Disconnected");
      webSocketConnected = false;
      if (connectionStatusCallback) {
        connectionStatusCallback(CommunicationChannel::WEBSOCKET, false);
      }
      break;
      
    case WStype_CONNECTED:
      Serial.print("WebSocket Connected to: ");
      Serial.println((char*)payload);
      webSocketConnected = true;
      if (connectionStatusCallback) {
        connectionStatusCallback(CommunicationChannel::WEBSOCKET, true);
      }
      break;
      
    case WStype_TEXT:
      {
        String message = String((char*)payload);
        processWebSocketMessage(message);
        stats.totalMessagesReceived++;
        stats.totalDataTransferred += length;
      }
      break;
      
    case WStype_ERROR:
      Serial.print("WebSocket Error: ");
      Serial.println((char*)payload);
      if (errorCallback) {
        errorCallback(String((char*)payload), -1);
      }
      break;
      
    default:
      break;
  }
}

void CommunicationProtocol::processWebSocketMessage(const String& message) {
  MessageHeader header;
  String payload;
  
  if (deserializeMessage(message, header, payload)) {
    if (validateMessage(header, payload)) {
      if (messageReceivedCallback) {
        messageReceivedCallback(header, payload);
      }
    } else {
      Serial.println("Invalid message received");
    }
  } else {
    Serial.println("Failed to deserialize message");
  }
}

String CommunicationProtocol::serializeMessage(const MessageHeader& header, const String& payload) {
  DynamicJsonDocument doc(2048);
  
  doc["messageId"] = header.messageId;
  doc["type"] = (int)header.type;
  doc["deviceId"] = header.deviceId;
  doc["timestamp"] = header.timestamp;
  doc["version"] = header.version;
  doc["checksum"] = header.checksum;
  
  // 解析payload为JSON（如果可能）
  DynamicJsonDocument payloadDoc(1024);
  DeserializationError error = deserializeJson(payloadDoc, payload);
  
  if (error) {
    // 如果不是JSON，作为字符串存储
    doc["payload"] = payload;
  } else {
    doc["payload"] = payloadDoc;
  }
  
  String result;
  serializeJson(doc, result);
  
  return result;
}

bool CommunicationProtocol::deserializeMessage(const String& data, MessageHeader& header, String& payload) {
  DynamicJsonDocument doc(2048);
  DeserializationError error = deserializeJson(doc, data);
  
  if (error) {
    return false;
  }
  
  header.messageId = doc["messageId"].as<String>();
  header.type = (MessageType)doc["type"].as<int>();
  header.deviceId = doc["deviceId"].as<String>();
  header.timestamp = doc["timestamp"].as<unsigned long>();
  header.version = doc["version"].as<int>();
  header.checksum = doc["checksum"].as<String>();
  
  // 提取payload
  if (doc["payload"].is<String>()) {
    payload = doc["payload"].as<String>();
  } else {
    serializeJson(doc["payload"], payload);
  }
  
  return true;
}

String CommunicationProtocol::createMessageId() {
  // 生成唯一的消息ID
  uint32_t random1 = esp_random();
  uint32_t random2 = esp_random();
  unsigned long timestamp = millis();
  
  char messageId[32];
  snprintf(messageId, sizeof(messageId), "%08X%08X%08lX", random1, random2, timestamp);
  
  return String(messageId);
}

String CommunicationProtocol::calculateChecksum(const String& data) {
  // 使用MD5计算校验和
  mbedtls_md5_context ctx;
  unsigned char hash[16];
  
  mbedtls_md5_init(&ctx);
  mbedtls_md5_starts(&ctx);
  mbedtls_md5_update(&ctx, (const unsigned char*)data.c_str(), data.length());
  mbedtls_md5_finish(&ctx, hash);
  mbedtls_md5_free(&ctx);
  
  // 转换为十六进制字符串
  String checksum = "";
  for (int i = 0; i < 16; i++) {
    char hex[3];
    sprintf(hex, "%02x", hash[i]);
    checksum += hex;
  }
  
  return checksum;
}

QueuedMessage CommunicationProtocol::createQueuedMessage(MessageType type, const String& payload, bool priority) {
  MessageHeader header;
  header.messageId = createMessageId();
  header.type = type;
  header.deviceId = config.deviceToken;
  header.timestamp = millis();
  header.version = 1;
  header.checksum = calculateChecksum(payload);
  
  QueuedMessage message;
  message.header = header;
  message.payload = payload;
  message.retryCount = 0;
  message.timestamp = millis();
  message.isPriority = priority;
  
  return message;
}

void CommunicationProtocol::addToQueue(const QueuedMessage& message) {
  if (message.isPriority) {
    priorityQueue.push_back(message);
  } else {
    messageQueue.push_back(message);
  }
  
  // 检查队列大小限制
  while (messageQueue.size() + priorityQueue.size() > config.maxQueueSize) {
    if (!messageQueue.empty()) {
      messageQueue.erase(messageQueue.begin());
    } else if (!priorityQueue.empty()) {
      priorityQueue.erase(priorityQueue.begin());
    }
  }
}

void CommunicationProtocol::processMessageQueue() {
  if (!wifiManager || !wifiManager->isConnected()) {
    return;
  }
  
  // 处理优先级队列
  auto it = priorityQueue.begin();
  while (it != priorityQueue.end()) {
    bool success = false;
    
    if (config.primaryChannel == CommunicationChannel::HTTP_REST) {
      String response;
      success = sendHTTPRequest(config.apiEndpoint + "/messages",
                               serializeMessage(it->header, it->payload),
                               response);
    } else if (config.primaryChannel == CommunicationChannel::WEBSOCKET) {
      success = sendWebSocketMessage(serializeMessage(it->header, it->payload));
    }
    
    if (success) {
      stats.successfulTransmissions++;
      stats.totalMessagesSent++;
      it = priorityQueue.erase(it);
    } else {
      it->retryCount++;
      if (it->retryCount >= config.maxRetryAttempts) {
        stats.failedTransmissions++;
        it = priorityQueue.erase(it);
      } else {
        ++it;
      }
    }
  }
  
  // 处理普通队列（限制每次处理的数量）
  int processedCount = 0;
  const int maxProcessPerUpdate = 5;
  
  auto it2 = messageQueue.begin();
  while (it2 != messageQueue.end() && processedCount < maxProcessPerUpdate) {
    bool success = false;
    
    if (config.primaryChannel == CommunicationChannel::HTTP_REST) {
      String response;
      success = sendHTTPRequest(config.apiEndpoint + "/messages",
                               serializeMessage(it2->header, it2->payload),
                               response);
    } else if (config.primaryChannel == CommunicationChannel::WEBSOCKET) {
      success = sendWebSocketMessage(serializeMessage(it2->header, it2->payload));
    }
    
    if (success) {
      stats.successfulTransmissions++;
      stats.totalMessagesSent++;
      it2 = messageQueue.erase(it2);
    } else {
      it2->retryCount++;
      if (it2->retryCount >= config.maxRetryAttempts) {
        stats.failedTransmissions++;
        it2 = messageQueue.erase(it2);
      } else {
        ++it2;
      }
    }
    
    processedCount++;
  }
}

bool CommunicationProtocol::startDataSync() {
  if (!wifiManager || !wifiManager->isConnected()) {
    return false;
  }
  
  Serial.println("Starting data synchronization");
  
  int messageCount = messageQueue.size() + priorityQueue.size();
  bool success = syncQueuedMessages();
  
  if (success) {
    stats.lastSuccessfulSync = millis();
  }
  
  if (syncCompleteCallback) {
    syncCompleteCallback(success, messageCount);
  }
  
  return success;
}

bool CommunicationProtocol::syncQueuedMessages() {
  // 这里实现批量同步逻辑
  // 为简化，我们使用现有的队列处理机制
  processMessageQueue();
  
  return messageQueue.empty() && priorityQueue.empty();
}

void CommunicationProtocol::startNewSession() {
  currentSessionId = createMessageId();
  Serial.print("Started new communication session: ");
  Serial.println(currentSessionId);
}

bool CommunicationProtocol::validateMessage(const MessageHeader& header, const String& payload) {
  // 验证时间戳（不能太旧或太新）
  unsigned long currentTime = millis();
  if (abs((long)(header.timestamp - currentTime)) > 300000) { // 5分钟容差
    return false;
  }
  
  // 验证校验和
  String calculatedChecksum = calculateChecksum(payload);
  if (header.checksum != calculatedChecksum) {
    return false;
  }
  
  return true;
}

// 公共方法实现
CommunicationStats CommunicationProtocol::getStats() const {
  return stats;
}

void CommunicationProtocol::resetStats() {
  stats = {0};
}

void CommunicationProtocol::printStats() const {
  Serial.println("=== Communication Statistics ===");
  Serial.print("Messages Sent: ");
  Serial.println(stats.totalMessagesSent);
  Serial.print("Messages Received: ");
  Serial.println(stats.totalMessagesReceived);
  Serial.print("Success Rate: ");
  if (stats.totalMessagesSent > 0) {
    Serial.print((float)stats.successfulTransmissions / stats.totalMessagesSent * 100);
    Serial.println("%");
  } else {
    Serial.println("N/A");
  }
  Serial.print("Average Latency: ");
  Serial.print(stats.averageLatency);
  Serial.println(" ms");
  Serial.print("Queue Size: ");
  Serial.println(stats.currentQueueSize);
  Serial.println("===============================");
}

// 回调函数设置
void CommunicationProtocol::setMessageReceivedCallback(void (*callback)(const MessageHeader&, const String&)) {
  messageReceivedCallback = callback;
}

void CommunicationProtocol::setConnectionStatusCallback(void (*callback)(CommunicationChannel, bool)) {
  connectionStatusCallback = callback;
}

void CommunicationProtocol::setSyncCompleteCallback(void (*callback)(bool, int)) {
  syncCompleteCallback = callback;
}

void CommunicationProtocol::setErrorCallback(void (*callback)(const String&, int)) {
  errorCallback = callback;
}

// MessageBuilder实现
String MessageBuilder::buildSensorDataMessage(const String& deviceId, 
                                             float soilHumidity, 
                                             float airHumidity, 
                                             float temperature, 
                                             float lightIntensity) {
  DynamicJsonDocument doc(512);
  
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  doc["sensorData"]["soilHumidity"] = soilHumidity;
  doc["sensorData"]["airHumidity"] = airHumidity;
  doc["sensorData"]["temperature"] = temperature;
  doc["sensorData"]["lightIntensity"] = lightIntensity;
  
  String result;
  serializeJson(doc, result);
  return result;
}

String MessageBuilder::buildPlantStatusMessage(const String& deviceId,
                                             const String& plantState,
                                             bool needsAttention,
                                             float healthScore) {
  DynamicJsonDocument doc(512);
  
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  doc["plantStatus"]["state"] = plantState;
  doc["plantStatus"]["needsAttention"] = needsAttention;
  doc["plantStatus"]["healthScore"] = healthScore;
  
  String result;
  serializeJson(doc, result);
  return result;
}

String MessageBuilder::buildAlertMessage(const String& deviceId,
                                       const String& alertType,
                                       const String& message,
                                       int severity) {
  DynamicJsonDocument doc(512);
  
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  doc["alert"]["type"] = alertType;
  doc["alert"]["message"] = message;
  doc["alert"]["severity"] = severity;
  
  String result;
  serializeJson(doc, result);
  return result;
}