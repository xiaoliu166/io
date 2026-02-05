#ifndef COMMUNICATION_PROTOCOL_H
#define COMMUNICATION_PROTOCOL_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebSocketsClient.h>
#include "WiFiManager.h"

/**
 * 数据通信协议
 * 负责设备与移动应用、云端服务的数据通信
 * 支持HTTP REST API、WebSocket实时通信和数据序列化
 */

enum class MessageType {
  SENSOR_DATA,
  PLANT_STATUS,
  DEVICE_CONFIG,
  ALERT_NOTIFICATION,
  COMMAND_REQUEST,
  COMMAND_RESPONSE,
  HEARTBEAT,
  ERROR_REPORT,
  FIRMWARE_UPDATE,
  SYNC_REQUEST,
  SYNC_RESPONSE
};

enum class CommunicationChannel {
  HTTP_REST,
  WEBSOCKET,
  MQTT,
  BLUETOOTH
};

enum class DataFormat {
  JSON,
  MSGPACK,
  PROTOBUF
};

struct MessageHeader {
  String messageId;
  MessageType type;
  String deviceId;
  unsigned long timestamp;
  int version;
  String checksum;
};

struct CommunicationConfig {
  // 服务器配置
  String serverHost;
  int serverPort;
  String apiEndpoint;
  String websocketEndpoint;
  bool useSSL;
  
  // 认证配置
  String deviceToken;
  String apiKey;
  String clientCertificate;
  String clientPrivateKey;
  
  // 通信参数
  CommunicationChannel primaryChannel;
  CommunicationChannel fallbackChannel;
  DataFormat dataFormat;
  unsigned long heartbeatInterval;
  unsigned long requestTimeout;
  int maxRetryAttempts;
  
  // 数据同步
  bool enableDataSync;
  unsigned long syncInterval;
  int maxQueueSize;
  bool compressData;
};

struct QueuedMessage {
  MessageHeader header;
  String payload;
  int retryCount;
  unsigned long timestamp;
  bool isPriority;
};

struct CommunicationStats {
  unsigned long totalMessagesSent;
  unsigned long totalMessagesReceived;
  unsigned long failedTransmissions;
  unsigned long successfulTransmissions;
  float averageLatency;
  unsigned long lastSuccessfulSync;
  unsigned long totalDataTransferred;
  int currentQueueSize;
};

class CommunicationProtocol {
private:
  CommunicationConfig config;
  WiFiManager* wifiManager;
  CommunicationStats stats;
  
  // HTTP客户端
  HTTPClient httpClient;
  WiFiClientSecure secureClient;
  
  // WebSocket客户端
  WebSocketsClient webSocketClient;
  bool webSocketConnected;
  
  // 消息队列
  std::vector<QueuedMessage> messageQueue;
  std::vector<QueuedMessage> priorityQueue;
  
  // 回调函数
  void (*messageReceivedCallback)(const MessageHeader& header, const String& payload);
  void (*connectionStatusCallback)(CommunicationChannel channel, bool connected);
  void (*syncCompleteCallback)(bool success, int messageCount);
  void (*errorCallback)(const String& error, int errorCode);
  
  // 状态管理
  bool isInitialized;
  unsigned long lastHeartbeat;
  unsigned long lastSyncAttempt;
  String currentSessionId;
  
  // 数据压缩和加密
  bool compressionEnabled;
  bool encryptionEnabled;

public:
  CommunicationProtocol(WiFiManager* wifiMgr);
  
  // 初始化和配置
  bool initialize();
  void setConfig(const CommunicationConfig& newConfig);
  CommunicationConfig getConfig() const;
  void setDefaultConfig();
  
  // 消息发送
  bool sendMessage(MessageType type, const String& payload, bool priority = false);
  bool sendSensorData(const String& sensorData);
  bool sendPlantStatus(const String& statusData);
  bool sendAlert(const String& alertData);
  bool sendHeartbeat();
  
  // 消息接收
  void processIncomingMessages();
  bool hasIncomingMessage() const;
  String getNextMessage();
  
  // 数据同步
  bool startDataSync();
  bool syncQueuedMessages();
  void clearMessageQueue();
  int getQueueSize() const;
  
  // 连接管理
  bool connectHTTP();
  bool connectWebSocket();
  void disconnectAll();
  bool isConnected(CommunicationChannel channel) const;
  
  // 更新和维护
  void update();
  void handleNetworkEvents();
  
  // 数据序列化
  String serializeMessage(const MessageHeader& header, const String& payload);
  bool deserializeMessage(const String& data, MessageHeader& header, String& payload);
  String createMessageId();
  String calculateChecksum(const String& data);
  
  // 错误处理和重试
  void handleTransmissionError(const QueuedMessage& message, const String& error);
  void retryFailedMessages();
  void purgeOldMessages();
  
  // 统计信息
  CommunicationStats getStats() const;
  void resetStats();
  void printStats() const;
  
  // 回调函数设置
  void setMessageReceivedCallback(void (*callback)(const MessageHeader&, const String&));
  void setConnectionStatusCallback(void (*callback)(CommunicationChannel, bool));
  void setSyncCompleteCallback(void (*callback)(bool, int));
  void setErrorCallback(void (*callback)(const String&, int));
  
  // 安全和认证
  bool authenticateDevice();
  bool validateMessage(const MessageHeader& header, const String& payload);
  String encryptPayload(const String& payload);
  String decryptPayload(const String& encryptedPayload);
  
  // 数据压缩
  String compressData(const String& data);
  String decompressData(const String& compressedData);
  
  // 固件更新支持
  bool checkForFirmwareUpdate();
  bool downloadFirmwareUpdate(const String& updateUrl);
  
  // 离线模式支持
  void enableOfflineMode();
  void disableOfflineMode();
  bool isOfflineModeEnabled() const;

private:
  // 内部方法
  bool sendHTTPRequest(const String& endpoint, const String& data, String& response);
  bool sendWebSocketMessage(const String& data);
  void processHTTPResponse(const String& response);
  void processWebSocketMessage(const String& message);
  
  // WebSocket事件处理
  void onWebSocketEvent(WStype_t type, uint8_t* payload, size_t length);
  static void webSocketEventHandler(WStype_t type, uint8_t* payload, size_t length);
  
  // 队列管理
  void addToQueue(const QueuedMessage& message);
  QueuedMessage createQueuedMessage(MessageType type, const String& payload, bool priority);
  void processMessageQueue();
  void sortMessageQueue();
  
  // 网络状态处理
  void handleNetworkConnected();
  void handleNetworkDisconnected();
  void handleNetworkError(const String& error);
  
  // 数据验证
  bool validateMessageFormat(const String& data);
  bool validateTimestamp(unsigned long timestamp);
  bool validateDeviceId(const String& deviceId);
  
  // 会话管理
  void startNewSession();
  void endCurrentSession();
  bool isSessionValid() const;
  
  // 配置持久化
  void saveConfigToNVS();
  void loadConfigFromNVS();
  
  // 静态实例（用于回调）
  static CommunicationProtocol* instance;
};

// 消息构建器辅助类
class MessageBuilder {
public:
  static String buildSensorDataMessage(const String& deviceId, 
                                     float soilHumidity, 
                                     float airHumidity, 
                                     float temperature, 
                                     float lightIntensity);
  
  static String buildPlantStatusMessage(const String& deviceId,
                                      const String& plantState,
                                      bool needsAttention,
                                      float healthScore);
  
  static String buildAlertMessage(const String& deviceId,
                                const String& alertType,
                                const String& message,
                                int severity);
  
  static String buildCommandResponse(const String& deviceId,
                                   const String& commandId,
                                   bool success,
                                   const String& result);
  
  static String buildErrorReport(const String& deviceId,
                               const String& errorType,
                               const String& errorMessage,
                               int errorCode);
};

#endif // COMMUNICATION_PROTOCOL_H