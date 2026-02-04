/**
 * AI智能植物养护机器人 - 状态持久化管理器实现
 */

#include "StatePersistence.h"
#include <ArduinoJson.h>

/**
 * 构造函数
 */
StatePersistence::StatePersistence()
    : isInitialized(false),
      lastSaveTime(0),
      saveInterval(300000), // 默认5分钟保存间隔
      autoSaveEnabled(true) {
}

/**
 * 析构函数
 */
StatePersistence::~StatePersistence() {
    // 清理资源
}

/**
 * 初始化持久化管理器
 */
bool StatePersistence::initialize() {
    DEBUG_PRINTLN("初始化状态持久化管理器...");
    
    // 初始化EEPROM
    if (!EEPROM.begin(512)) {
        DEBUG_PRINTLN("✗ EEPROM初始化失败");
        return false;
    }
    
    // 检查是否需要初始化EEPROM
    if (!hasValidData()) {
        DEBUG_PRINTLN("EEPROM中无有效数据，执行初始化...");
        initializeEEPROM();
    } else {
        DEBUG_PRINTLN("✓ 发现有效的持久化数据");
    }
    
    // 验证数据完整性
    if (!verifyDataIntegrity()) {
        DEBUG_PRINTLN("⚠ 数据完整性检查失败，尝试修复...");
        if (!repairCorruptedData()) {
            DEBUG_PRINTLN("✗ 数据修复失败，重新初始化");
            initializeEEPROM();
        } else {
            DEBUG_PRINTLN("✓ 数据修复成功");
        }
    }
    
    isInitialized = true;
    DEBUG_PRINTLN("✓ 状态持久化管理器初始化成功");
    return true;
}

/**
 * 初始化EEPROM
 */
void StatePersistence::initializeEEPROM() {
    // 写入魔数
    EEPROM.writeUShort(EEPROM_STATE_MAGIC_ADDR, STATE_MAGIC_NUMBER);
    
    // 初始化当前状态数据
    PersistentStateData initialState = {
        .currentState = PlantState::UNKNOWN,
        .previousState = PlantState::UNKNOWN,
        .stateStartTime = 0,
        .lastUpdateTime = 0,
        .healthScore = 0,
        .lastSoilMoisture = 0,
        .lastLightLevel = 0,
        .lastTemperature = 0,
        .needsAttention = false,
        .checksum = 0
    };
    initialState.checksum = calculateChecksum(&initialState, sizeof(initialState) - sizeof(uint32_t));
    writeToEEPROM(EEPROM_CURRENT_STATE_ADDR, &initialState, sizeof(initialState));
    
    // 初始化历史记录
    PersistentStateHistory initialHistory = {
        .recordCount = 0,
        .nextIndex = 0,
        .checksum = 0
    };
    initialHistory.checksum = calculateChecksum(&initialHistory, sizeof(initialHistory) - sizeof(uint32_t));
    writeToEEPROM(EEPROM_STATE_HISTORY_ADDR, &initialHistory, sizeof(initialHistory));
    
    // 初始化统计信息
    PersistentStateStats initialStats = {
        .totalEvaluations = 0,
        .stateChanges = 0,
        .timeInHealthy = 0,
        .timeInNeedsWater = 0,
        .timeInNeedsLight = 0,
        .timeInCritical = 0,
        .averageHealthScore = 0.0,
        .lastStateChange = 0,
        .checksum = 0
    };
    initialStats.checksum = calculateChecksum(&initialStats, sizeof(initialStats) - sizeof(uint32_t));
    writeToEEPROM(EEPROM_STATE_STATS_ADDR, &initialStats, sizeof(initialStats));
    
    EEPROM.commit();
    DEBUG_PRINTLN("EEPROM初始化完成");
}

/**
 * 计算校验和
 */
uint32_t StatePersistence::calculateChecksum(const void* data, size_t size) {
    uint32_t checksum = 0;
    const uint8_t* bytes = (const uint8_t*)data;
    
    for (size_t i = 0; i < size; i++) {
        checksum += bytes[i];
        checksum = (checksum << 1) | (checksum >> 31); // 循环左移
    }
    
    return checksum;
}

/**
 * 验证校验和
 */
bool StatePersistence::verifyChecksum(const void* data, size_t size, uint32_t expectedChecksum) {
    uint32_t actualChecksum = calculateChecksum(data, size);
    return actualChecksum == expectedChecksum;
}

/**
 * 写入EEPROM
 */
bool StatePersistence::writeToEEPROM(int address, const void* data, size_t size) {
    const uint8_t* bytes = (const uint8_t*)data;
    
    for (size_t i = 0; i < size; i++) {
        EEPROM.write(address + i, bytes[i]);
    }
    
    return true;
}

/**
 * 从EEPROM读取
 */
bool StatePersistence::readFromEEPROM(int address, void* data, size_t size) {
    uint8_t* bytes = (uint8_t*)data;
    
    for (size_t i = 0; i < size; i++) {
        bytes[i] = EEPROM.read(address + i);
    }
    
    return true;
}

/**
 * 保存当前状态
 */
bool StatePersistence::saveCurrentState(const PlantStatus& status) {
    if (!isInitialized) {
        DEBUG_PRINTLN("持久化管理器未初始化");
        return false;
    }
    
    PersistentStateData stateData = {
        .currentState = status.state,
        .previousState = PlantState::UNKNOWN, // 这里需要从StateManager获取
        .stateStartTime = millis(), // 简化处理
        .lastUpdateTime = millis(),
        .healthScore = status.healthScore,
        .lastSoilMoisture = status.soilMoisture,
        .lastLightLevel = status.lightLevel,
        .lastTemperature = status.temperature,
        .needsAttention = status.needsAttention,
        .checksum = 0
    };
    
    stateData.checksum = calculateChecksum(&stateData, sizeof(stateData) - sizeof(uint32_t));
    
    bool success = writeToEEPROM(EEPROM_CURRENT_STATE_ADDR, &stateData, sizeof(stateData));
    if (success) {
        EEPROM.commit();
        lastSaveTime = millis();
        DEBUG_PRINTLN("当前状态保存成功");
    } else {
        DEBUG_PRINTLN("当前状态保存失败");
    }
    
    return success;
}

/**
 * 加载当前状态
 */
bool StatePersistence::loadCurrentState(PlantStatus& status) {
    if (!isInitialized) {
        DEBUG_PRINTLN("持久化管理器未初始化");
        return false;
    }
    
    PersistentStateData stateData;
    if (!readFromEEPROM(EEPROM_CURRENT_STATE_ADDR, &stateData, sizeof(stateData))) {
        DEBUG_PRINTLN("读取状态数据失败");
        return false;
    }
    
    // 验证校验和
    if (!verifyChecksum(&stateData, sizeof(stateData) - sizeof(uint32_t), stateData.checksum)) {
        DEBUG_PRINTLN("状态数据校验和验证失败");
        return false;
    }
    
    // 转换为PlantStatus结构
    status = {
        .state = stateData.currentState,
        .soilMoisture = stateData.lastSoilMoisture,
        .lightLevel = stateData.lastLightLevel,
        .temperature = stateData.lastTemperature,
        .airHumidity = 0, // 历史数据中没有存储
        .timestamp = stateData.lastUpdateTime,
        .needsAttention = stateData.needsAttention,
        .statusMessage = "", // 需要重新生成
        .healthScore = stateData.healthScore
    };
    
    DEBUG_PRINTLN("当前状态加载成功");
    return true;
}

/**
 * 保存状态历史记录
 */
bool StatePersistence::saveStateHistory(const StateChangeRecord* history, int count) {
    if (!isInitialized || !history || count <= 0) {
        return false;
    }
    
    PersistentStateHistory historyData;
    historyData.recordCount = min(count, MAX_STORED_HISTORY);
    historyData.nextIndex = 0;
    
    // 复制最近的记录
    for (int i = 0; i < historyData.recordCount; i++) {
        historyData.records[i] = history[i];
    }
    
    historyData.checksum = calculateChecksum(&historyData, sizeof(historyData) - sizeof(uint32_t));
    
    bool success = writeToEEPROM(EEPROM_STATE_HISTORY_ADDR, &historyData, sizeof(historyData));
    if (success) {
        EEPROM.commit();
        DEBUG_PRINTF("状态历史保存成功，记录数: %d\n", historyData.recordCount);
    } else {
        DEBUG_PRINTLN("状态历史保存失败");
    }
    
    return success;
}

/**
 * 加载状态历史记录
 */
int StatePersistence::loadStateHistory(StateChangeRecord* history, int maxCount) {
    if (!isInitialized || !history || maxCount <= 0) {
        return 0;
    }
    
    PersistentStateHistory historyData;
    if (!readFromEEPROM(EEPROM_STATE_HISTORY_ADDR, &historyData, sizeof(historyData))) {
        DEBUG_PRINTLN("读取历史数据失败");
        return 0;
    }
    
    // 验证校验和
    if (!verifyChecksum(&historyData, sizeof(historyData) - sizeof(uint32_t), historyData.checksum)) {
        DEBUG_PRINTLN("历史数据校验和验证失败");
        return 0;
    }
    
    int actualCount = min(historyData.recordCount, maxCount);
    
    // 复制记录
    for (int i = 0; i < actualCount; i++) {
        history[i] = historyData.records[i];
    }
    
    DEBUG_PRINTF("状态历史加载成功，记录数: %d\n", actualCount);
    return actualCount;
}

/**
 * 保存统计信息
 */
bool StatePersistence::saveStateStats(const StateStats& stats) {
    if (!isInitialized) {
        return false;
    }
    
    PersistentStateStats statsData = {
        .totalEvaluations = stats.totalEvaluations,
        .stateChanges = stats.stateChanges,
        .timeInHealthy = stats.timeInHealthy,
        .timeInNeedsWater = stats.timeInNeedsWater,
        .timeInNeedsLight = stats.timeInNeedsLight,
        .timeInCritical = stats.timeInCritical,
        .averageHealthScore = stats.averageHealthScore,
        .lastStateChange = stats.lastStateChange,
        .checksum = 0
    };
    
    statsData.checksum = calculateChecksum(&statsData, sizeof(statsData) - sizeof(uint32_t));
    
    bool success = writeToEEPROM(EEPROM_STATE_STATS_ADDR, &statsData, sizeof(statsData));
    if (success) {
        EEPROM.commit();
        DEBUG_PRINTLN("统计信息保存成功");
    } else {
        DEBUG_PRINTLN("统计信息保存失败");
    }
    
    return success;
}

/**
 * 加载统计信息
 */
bool StatePersistence::loadStateStats(StateStats& stats) {
    if (!isInitialized) {
        return false;
    }
    
    PersistentStateStats statsData;
    if (!readFromEEPROM(EEPROM_STATE_STATS_ADDR, &statsData, sizeof(statsData))) {
        DEBUG_PRINTLN("读取统计数据失败");
        return false;
    }
    
    // 验证校验和
    if (!verifyChecksum(&statsData, sizeof(statsData) - sizeof(uint32_t), statsData.checksum)) {
        DEBUG_PRINTLN("统计数据校验和验证失败");
        return false;
    }
    
    // 转换为StateStats结构
    stats = {
        .totalEvaluations = statsData.totalEvaluations,
        .stateChanges = statsData.stateChanges,
        .timeInHealthy = statsData.timeInHealthy,
        .timeInNeedsWater = statsData.timeInNeedsWater,
        .timeInNeedsLight = statsData.timeInNeedsLight,
        .timeInCritical = statsData.timeInCritical,
        .averageHealthScore = statsData.averageHealthScore,
        .lastStateChange = statsData.lastStateChange
    };
    
    DEBUG_PRINTLN("统计信息加载成功");
    return true;
}

/**
 * 保存完整状态数据
 */
bool StatePersistence::saveCompleteState(StateManager* stateManager) {
    if (!stateManager) {
        return false;
    }
    
    bool success = true;
    
    // 保存当前状态
    PlantStatus currentStatus = stateManager->getCurrentStatus();
    success &= saveCurrentState(currentStatus);
    
    // 保存状态历史
    StateChangeRecord history[10];
    int historyCount = stateManager->getStateHistory(history, 10);
    if (historyCount > 0) {
        success &= saveStateHistory(history, historyCount);
    }
    
    // 保存统计信息
    StateStats stats = stateManager->getStats();
    success &= saveStateStats(stats);
    
    if (success) {
        lastSaveTime = millis();
        DEBUG_PRINTLN("完整状态数据保存成功");
    } else {
        DEBUG_PRINTLN("完整状态数据保存失败");
    }
    
    return success;
}

/**
 * 加载完整状态数据
 */
bool StatePersistence::loadCompleteState(StateManager* stateManager) {
    if (!stateManager) {
        return false;
    }
    
    bool success = true;
    
    // 加载统计信息
    StateStats stats;
    if (loadStateStats(stats)) {
        stateManager->setStats(stats);
        DEBUG_PRINTLN("统计信息加载成功");
    } else {
        success = false;
    }
    
    // 加载状态历史
    StateChangeRecord history[MAX_STORED_HISTORY];
    int historyCount = loadStateHistory(history, MAX_STORED_HISTORY);
    if (historyCount > 0) {
        stateManager->setStateHistory(history, historyCount);
        DEBUG_PRINTF("状态历史加载成功，记录数: %d\n", historyCount);
    }
    
    // 加载当前状态
    PlantStatus status;
    if (loadCurrentState(status)) {
        stateManager->setCurrentStatus(status);
        DEBUG_PRINTLN("当前状态加载成功");
    } else {
        success = false;
    }
    
    return success;
}

/**
 * 检查是否有有效数据
 */
bool StatePersistence::hasValidData() {
    uint16_t magic = EEPROM.readUShort(EEPROM_STATE_MAGIC_ADDR);
    return magic == STATE_MAGIC_NUMBER;
}

/**
 * 清除所有持久化数据
 */
bool StatePersistence::clearAllData() {
    // 清除魔数
    EEPROM.writeUShort(EEPROM_STATE_MAGIC_ADDR, 0);
    
    // 清除所有数据区域
    for (int i = EEPROM_STATE_BASE_ADDR; i < EEPROM_STATE_BASE_ADDR + 300; i++) {
        EEPROM.write(i, 0);
    }
    
    bool success = EEPROM.commit();
    
    if (success) {
        DEBUG_PRINTLN("所有持久化数据已清除");
    } else {
        DEBUG_PRINTLN("清除持久化数据失败");
    }
    
    return success;
}

/**
 * 获取EEPROM使用情况
 */
int StatePersistence::getEEPROMUsage() {
    return sizeof(PersistentStateData) + sizeof(PersistentStateHistory) + sizeof(PersistentStateStats) + 2; // +2 for magic number
}

/**
 * 设置自动保存间隔
 */
void StatePersistence::setAutoSaveInterval(unsigned long interval) {
    saveInterval = max(60000UL, interval); // 最小1分钟
}

/**
 * 启用或禁用自动保存
 */
void StatePersistence::setAutoSaveEnabled(bool enabled) {
    autoSaveEnabled = enabled;
}

/**
 * 检查是否需要自动保存
 */
bool StatePersistence::needsAutoSave() {
    return autoSaveEnabled && (millis() - lastSaveTime >= saveInterval);
}

/**
 * 执行自动保存
 */
bool StatePersistence::performAutoSave(StateManager* stateManager) {
    if (!needsAutoSave()) {
        return true; // 不需要保存
    }
    
    DEBUG_PRINTLN("执行自动保存...");
    return saveCompleteState(stateManager);
}

/**
 * 验证数据完整性
 */
bool StatePersistence::verifyDataIntegrity() {
    if (!hasValidData()) {
        return false;
    }
    
    // 验证当前状态数据
    PersistentStateData stateData;
    if (!readFromEEPROM(EEPROM_CURRENT_STATE_ADDR, &stateData, sizeof(stateData))) {
        return false;
    }
    if (!verifyChecksum(&stateData, sizeof(stateData) - sizeof(uint32_t), stateData.checksum)) {
        return false;
    }
    
    // 验证历史数据
    PersistentStateHistory historyData;
    if (!readFromEEPROM(EEPROM_STATE_HISTORY_ADDR, &historyData, sizeof(historyData))) {
        return false;
    }
    if (!verifyChecksum(&historyData, sizeof(historyData) - sizeof(uint32_t), historyData.checksum)) {
        return false;
    }
    
    // 验证统计数据
    PersistentStateStats statsData;
    if (!readFromEEPROM(EEPROM_STATE_STATS_ADDR, &statsData, sizeof(statsData))) {
        return false;
    }
    if (!verifyChecksum(&statsData, sizeof(statsData) - sizeof(uint32_t), statsData.checksum)) {
        return false;
    }
    
    return true;
}

/**
 * 修复损坏的数据
 */
bool StatePersistence::repairCorruptedData() {
    DEBUG_PRINTLN("尝试修复损坏的数据...");
    
    // 简单的修复策略：重新初始化损坏的部分
    bool repaired = false;
    
    // 检查并修复当前状态数据
    PersistentStateData stateData;
    if (!readFromEEPROM(EEPROM_CURRENT_STATE_ADDR, &stateData, sizeof(stateData)) ||
        !verifyChecksum(&stateData, sizeof(stateData) - sizeof(uint32_t), stateData.checksum)) {
        
        // 重新初始化状态数据
        PersistentStateData newStateData = {
            .currentState = PlantState::UNKNOWN,
            .previousState = PlantState::UNKNOWN,
            .stateStartTime = millis(),
            .lastUpdateTime = millis(),
            .healthScore = 0,
            .lastSoilMoisture = 0,
            .lastLightLevel = 0,
            .lastTemperature = 0,
            .needsAttention = false,
            .checksum = 0
        };
        newStateData.checksum = calculateChecksum(&newStateData, sizeof(newStateData) - sizeof(uint32_t));
        writeToEEPROM(EEPROM_CURRENT_STATE_ADDR, &newStateData, sizeof(newStateData));
        repaired = true;
    }
    
    // 类似地修复其他数据...
    
    if (repaired) {
        EEPROM.commit();
        DEBUG_PRINTLN("数据修复完成");
    }
    
    return repaired;
}

/**
 * 获取最后保存时间
 */
unsigned long StatePersistence::getLastSaveTime() const {
    return lastSaveTime;
}

/**
 * 获取持久化信息
 */
String StatePersistence::getPersistenceInfo() const {
    DynamicJsonDocument doc(512);
    
    doc["initialized"] = isInitialized;
    doc["auto_save_enabled"] = autoSaveEnabled;
    doc["save_interval"] = saveInterval;
    doc["last_save_time"] = lastSaveTime;
    doc["eeprom_usage"] = getEEPROMUsage();
    doc["has_valid_data"] = hasValidData();
    
    String result;
    serializeJson(doc, result);
    return result;
}

/**
 * 执行自检
 */
bool StatePersistence::performSelfTest() {
    DEBUG_PRINTLN("执行持久化系统自检...");
    
    if (!isInitialized) {
        DEBUG_PRINTLN("✗ 持久化系统未初始化");
        return false;
    }
    
    if (!hasValidData()) {
        DEBUG_PRINTLN("✗ EEPROM中无有效数据");
        return false;
    }
    
    if (!verifyDataIntegrity()) {
        DEBUG_PRINTLN("✗ 数据完整性验证失败");
        return false;
    }
    
    DEBUG_PRINTLN("✓ 持久化系统自检通过");
    return true;
}

/**
 * 备份数据（简化实现）
 */
bool StatePersistence::backupData() {
    // 简化实现：这里可以实现数据备份到另一个EEPROM区域
    DEBUG_PRINTLN("数据备份功能待实现");
    return true;
}

/**
 * 从备份恢复数据（简化实现）
 */
bool StatePersistence::restoreFromBackup() {
    // 简化实现：这里可以实现从备份区域恢复数据
    DEBUG_PRINTLN("数据恢复功能待实现");
    return true;
}

/**
 * 获取数据版本
 */
uint16_t StatePersistence::getDataVersion() {
    return 1; // 当前版本号
}

/**
 * 迁移数据（简化实现）
 */
bool StatePersistence::migrateData(uint16_t oldVersion) {
    DEBUG_PRINTF("数据迁移: v%d -> v%d\n", oldVersion, getDataVersion());
    // 这里可以实现版本间的数据迁移逻辑
    return true;
}