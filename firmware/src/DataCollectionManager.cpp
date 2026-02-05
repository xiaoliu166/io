/**
 * AI智能植物养护机器人 - 数据采集管理器实现
 */

#include "DataCollectionManager.h"
#include <ArduinoJson.h>

/**
 * 构造函数
 */
DataCollectionManager::DataCollectionManager(SensorManager* sensorMgr)
    : sensorManager(sensorMgr),
      collectionInterval(DATA_COLLECTION_INTERVAL),
      isAutoCollection(false),
      isEnabled(true),
      currentStatus(CollectionStatus::IDLE),
      lastCollectionTime(0),
      nextCollectionTime(0),
      consecutiveErrors(0),
      maxConsecutiveErrors(5),
      errorRecoveryDelay(30000) { // 30秒错误恢复延迟
    
    // 初始化统计信息
    stats = {
        .totalCollections = 0,
        .successfulCollections = 0,
        .failedCollections = 0,
        .lastCollectionTime = 0,
        .successRate = 0.0,
        .averageInterval = 0
    };
    
    initializeBuffer();
}

/**
 * 析构函数
 */
DataCollectionManager::~DataCollectionManager() {
    stopAutoCollection();
}

/**
 * 初始化数据采集管理器
 */
bool DataCollectionManager::initialize() {
    DEBUG_PRINTLN("初始化数据采集管理器...");
    
    if (!sensorManager) {
        DEBUG_PRINTLN("✗ 传感器管理器指针为空");
        return false;
    }
    
    // 重置状态
    currentStatus = CollectionStatus::IDLE;
    consecutiveErrors = 0;
    
    // 初始化缓冲区
    initializeBuffer();
    
    // 重置统计信息
    resetStats();
    
    DEBUG_PRINTLN("✓ 数据采集管理器初始化成功");
    return true;
}

/**
 * 初始化缓冲区
 */
void DataCollectionManager::initializeBuffer() {
    dataBuffer.head = 0;
    dataBuffer.tail = 0;
    dataBuffer.count = 0;
    dataBuffer.isFull = false;
    
    // 清空缓冲区数据
    for (int i = 0; i < SENSOR_BUFFER_SIZE; i++) {
        dataBuffer.data[i] = {0, 0, 0, 0, 0, false};
    }
}

/**
 * 更新数据采集
 */
void DataCollectionManager::update() {
    if (!isEnabled || !sensorManager) {
        return;
    }
    
    // 检查是否需要进行数据采集
    if (isAutoCollection && isTimeForCollection()) {
        if (currentStatus != CollectionStatus::ERROR) {
            SensorData data = collectOnce();
            if (data.isValid) {
                processCollectedData(data);
            }
        } else {
            // 错误恢复处理
            if (millis() - lastCollectionTime > errorRecoveryDelay) {
                DEBUG_PRINTLN("尝试从错误状态恢复...");
                resetErrorState();
            }
        }
    }
}

/**
 * 开始自动数据采集
 */
bool DataCollectionManager::startAutoCollection(unsigned long interval) {
    if (!sensorManager) {
        DEBUG_PRINTLN("✗ 无法启动自动采集：传感器管理器未初始化");
        return false;
    }
    
    collectionInterval = interval;
    isAutoCollection = true;
    currentStatus = CollectionStatus::IDLE;
    nextCollectionTime = millis() + collectionInterval;
    
    DEBUG_PRINTF("✓ 自动数据采集已启动，间隔: %lu ms\n", interval);
    return true;
}

/**
 * 停止自动数据采集
 */
void DataCollectionManager::stopAutoCollection() {
    isAutoCollection = false;
    currentStatus = CollectionStatus::IDLE;
    
    DEBUG_PRINTLN("自动数据采集已停止");
}

/**
 * 执行单次数据采集
 */
SensorData DataCollectionManager::collectOnce() {
    if (!sensorManager) {
        SensorData emptyData = {0, 0, 0, 0, 0, false};
        return emptyData;
    }
    
    currentStatus = CollectionStatus::COLLECTING;
    unsigned long startTime = millis();
    
    DEBUG_PRINTLN("开始数据采集...");
    
    // 读取传感器数据
    SensorData data = sensorManager->readAll();
    
    currentStatus = CollectionStatus::PROCESSING;
    
    // 更新统计信息
    updateStats(data.isValid);
    
    if (data.isValid) {
        // 添加到缓冲区
        addToBuffer(data);
        resetErrorState();
        currentStatus = CollectionStatus::IDLE;
        
        unsigned long duration = millis() - startTime;
        DEBUG_PRINTF("✓ 数据采集成功，耗时: %lu ms\n", duration);
        
        #if DEBUG_SENSORS
        DEBUG_PRINTF("采集数据: 土壤湿度=%.1f%%, 空气湿度=%.1f%%, 温度=%.1f°C, 光照=%.0flux\n",
                     data.soilHumidity, data.airHumidity, data.temperature, data.lightIntensity);
        #endif
    } else {
        handleCollectionError();
        DEBUG_PRINTLN("✗ 数据采集失败");
    }
    
    lastCollectionTime = millis();
    nextCollectionTime = lastCollectionTime + collectionInterval;
    
    return data;
}

/**
 * 暂停数据采集
 */
void DataCollectionManager::pauseCollection() {
    if (currentStatus != CollectionStatus::ERROR) {
        currentStatus = CollectionStatus::PAUSED;
        DEBUG_PRINTLN("数据采集已暂停");
    }
}

/**
 * 恢复数据采集
 */
void DataCollectionManager::resumeCollection() {
    if (currentStatus == CollectionStatus::PAUSED) {
        currentStatus = CollectionStatus::IDLE;
        nextCollectionTime = millis() + collectionInterval;
        DEBUG_PRINTLN("数据采集已恢复");
    }
}

/**
 * 设置采集间隔
 */
void DataCollectionManager::setCollectionInterval(unsigned long interval) {
    if (interval < 1000) { // 最小1秒间隔
        interval = 1000;
    }
    
    collectionInterval = interval;
    
    // 如果正在自动采集，更新下次采集时间
    if (isAutoCollection) {
        nextCollectionTime = millis() + collectionInterval;
    }
    
    DEBUG_PRINTF("采集间隔已设置为: %lu ms\n", interval);
}

/**
 * 获取采集间隔
 */
unsigned long DataCollectionManager::getCollectionInterval() const {
    return collectionInterval;
}

/**
 * 获取当前状态
 */
CollectionStatus DataCollectionManager::getCurrentStatus() const {
    return currentStatus;
}

/**
 * 获取最新数据
 */
SensorData DataCollectionManager::getLatestData() {
    if (dataBuffer.count > 0) {
        int latestIndex = (dataBuffer.head - 1 + SENSOR_BUFFER_SIZE) % SENSOR_BUFFER_SIZE;
        return dataBuffer.data[latestIndex];
    }
    
    // 如果缓冲区为空，返回无效数据
    SensorData emptyData = {0, 0, 0, 0, 0, false};
    return emptyData;
}

/**
 * 获取历史数据
 */
int DataCollectionManager::getHistoryData(int count, SensorData* data) {
    if (!data || count <= 0) {
        return 0;
    }
    
    int actualCount = min(count, dataBuffer.count);
    
    for (int i = 0; i < actualCount; i++) {
        int index = (dataBuffer.head - 1 - i + SENSOR_BUFFER_SIZE) % SENSOR_BUFFER_SIZE;
        data[i] = dataBuffer.data[index];
    }
    
    return actualCount;
}

/**
 * 添加数据到缓冲区
 */
bool DataCollectionManager::addToBuffer(const SensorData& data) {
    dataBuffer.data[dataBuffer.head] = data;
    dataBuffer.head = (dataBuffer.head + 1) % SENSOR_BUFFER_SIZE;
    
    if (dataBuffer.isFull) {
        // 缓冲区已满，移动尾指针
        dataBuffer.tail = (dataBuffer.tail + 1) % SENSOR_BUFFER_SIZE;
    } else {
        dataBuffer.count++;
        if (dataBuffer.count == SENSOR_BUFFER_SIZE) {
            dataBuffer.isFull = true;
        }
    }
    
    return true;
}

/**
 * 从缓冲区获取数据
 */
SensorData DataCollectionManager::getFromBuffer(int index) {
    if (index < 0 || index >= dataBuffer.count) {
        SensorData emptyData = {0, 0, 0, 0, 0, false};
        return emptyData;
    }
    
    int actualIndex = (dataBuffer.tail + index) % SENSOR_BUFFER_SIZE;
    return dataBuffer.data[actualIndex];
}

/**
 * 获取缓冲区中的数据数量
 */
int DataCollectionManager::getBufferCount() const {
    return dataBuffer.count;
}

/**
 * 检查缓冲区是否为空
 */
bool DataCollectionManager::isBufferEmpty() const {
    return dataBuffer.count == 0;
}

/**
 * 检查缓冲区是否已满
 */
bool DataCollectionManager::isBufferFull() const {
    return dataBuffer.isFull;
}

/**
 * 清空数据缓冲区
 */
void DataCollectionManager::clearBuffer() {
    initializeBuffer();
    DEBUG_PRINTLN("数据缓冲区已清空");
}

/**
 * 更新统计信息
 */
void DataCollectionManager::updateStats(bool success) {
    stats.totalCollections++;
    stats.lastCollectionTime = millis();
    
    if (success) {
        stats.successfulCollections++;
    } else {
        stats.failedCollections++;
    }
    
    // 计算成功率
    stats.successRate = (float)stats.successfulCollections / stats.totalCollections * 100.0;
    
    // 计算平均间隔
    if (stats.totalCollections > 1) {
        stats.averageInterval = stats.lastCollectionTime / (stats.totalCollections - 1);
    }
}

/**
 * 获取统计信息
 */
CollectionStats DataCollectionManager::getStats() const {
    return stats;
}

/**
 * 重置统计信息
 */
void DataCollectionManager::resetStats() {
    stats.totalCollections = 0;
    stats.successfulCollections = 0;
    stats.failedCollections = 0;
    stats.lastCollectionTime = 0;
    stats.successRate = 0.0;
    stats.averageInterval = 0;
    
    DEBUG_PRINTLN("统计信息已重置");
}

/**
 * 处理采集错误
 */
void DataCollectionManager::handleCollectionError() {
    consecutiveErrors++;
    
    if (consecutiveErrors >= maxConsecutiveErrors) {
        currentStatus = CollectionStatus::ERROR;
        DEBUG_PRINTF("连续错误次数达到上限(%d)，进入错误状态\n", maxConsecutiveErrors);
    }
}

/**
 * 重置错误状态
 */
void DataCollectionManager::resetErrorState() {
    consecutiveErrors = 0;
    if (currentStatus == CollectionStatus::ERROR) {
        currentStatus = CollectionStatus::IDLE;
        DEBUG_PRINTLN("错误状态已重置");
    }
}

/**
 * 检查是否到了采集时间
 */
bool DataCollectionManager::isTimeForCollection() {
    return millis() >= nextCollectionTime;
}

/**
 * 处理采集到的数据
 */
void DataCollectionManager::processCollectedData(const SensorData& data) {
    // 这里可以添加数据处理逻辑
    // 例如：数据过滤、异常检测、趋势分析等
    
    #if DEBUG_SENSORS
    DEBUG_PRINTF("处理数据: 时间戳=%lu, 有效=%s\n", 
                 data.timestamp, data.isValid ? "是" : "否");
    #endif
}

/**
 * 获取错误信息
 */
String DataCollectionManager::getErrorInfo() const {
    String errorInfo = "";
    
    if (currentStatus == CollectionStatus::ERROR) {
        errorInfo += "采集器处于错误状态; ";
        errorInfo += "连续错误次数: " + String(consecutiveErrors) + "; ";
    }
    
    if (sensorManager) {
        String sensorError = sensorManager->getErrorInfo();
        if (sensorError != "无错误") {
            errorInfo += "传感器错误: " + sensorError + "; ";
        }
    }
    
    return errorInfo.length() > 0 ? errorInfo : "无错误";
}

/**
 * 检查是否有错误
 */
bool DataCollectionManager::hasError() const {
    return currentStatus == CollectionStatus::ERROR || consecutiveErrors > 0;
}

/**
 * 清除错误状态
 */
void DataCollectionManager::clearError() {
    resetErrorState();
    if (sensorManager) {
        sensorManager->resetErrorCounts();
    }
    DEBUG_PRINTLN("错误状态已清除");
}

/**
 * 设置最大连续错误次数
 */
void DataCollectionManager::setMaxConsecutiveErrors(int maxErrors) {
    maxConsecutiveErrors = max(1, maxErrors);
}

/**
 * 设置错误恢复延迟
 */
void DataCollectionManager::setErrorRecoveryDelay(unsigned long delay) {
    errorRecoveryDelay = max(1000UL, delay); // 最小1秒
}

/**
 * 获取下次采集时间
 */
unsigned long DataCollectionManager::getNextCollectionTime() const {
    return nextCollectionTime;
}

/**
 * 获取距离下次采集的时间
 */
unsigned long DataCollectionManager::getTimeToNextCollection() const {
    unsigned long currentTime = millis();
    if (currentTime >= nextCollectionTime) {
        return 0;
    }
    return nextCollectionTime - currentTime;
}

/**
 * 强制执行数据采集
 */
bool DataCollectionManager::forceCollection() {
    if (!sensorManager) {
        return false;
    }
    
    DEBUG_PRINTLN("强制执行数据采集...");
    SensorData data = collectOnce();
    return data.isValid;
}

/**
 * 检查是否正在采集
 */
bool DataCollectionManager::isCollecting() const {
    return currentStatus == CollectionStatus::COLLECTING || 
           currentStatus == CollectionStatus::PROCESSING;
}

/**
 * 检查自动采集是否启用
 */
bool DataCollectionManager::isAutoCollectionEnabled() const {
    return isAutoCollection;
}

/**
 * 获取系统信息
 */
String DataCollectionManager::getSystemInfo() const {
    DynamicJsonDocument doc(1024);
    
    doc["status"] = (int)currentStatus;
    doc["auto_collection"] = isAutoCollection;
    doc["enabled"] = isEnabled;
    doc["collection_interval"] = collectionInterval;
    doc["consecutive_errors"] = consecutiveErrors;
    doc["max_consecutive_errors"] = maxConsecutiveErrors;
    doc["buffer_count"] = dataBuffer.count;
    doc["buffer_full"] = dataBuffer.isFull;
    doc["next_collection_time"] = nextCollectionTime;
    doc["time_to_next"] = getTimeToNextCollection();
    
    // 统计信息
    JsonObject statsObj = doc.createNestedObject("stats");
    statsObj["total_collections"] = stats.totalCollections;
    statsObj["successful_collections"] = stats.successfulCollections;
    statsObj["failed_collections"] = stats.failedCollections;
    statsObj["success_rate"] = stats.successRate;
    statsObj["average_interval"] = stats.averageInterval;
    
    String result;
    serializeJson(doc, result);
    return result;
}