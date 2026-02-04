/**
 * AI智能植物养护机器人 - 状态持久化管理器
 * 负责状态数据的持久化存储和恢复
 */

#ifndef STATE_PERSISTENCE_H
#define STATE_PERSISTENCE_H

#include <Arduino.h>
#include <EEPROM.h>
#include "StateManager.h"
#include "config.h"

// EEPROM地址分配
#define EEPROM_STATE_BASE_ADDR 200
#define EEPROM_STATE_MAGIC_ADDR EEPROM_STATE_BASE_ADDR
#define EEPROM_CURRENT_STATE_ADDR (EEPROM_STATE_BASE_ADDR + 2)
#define EEPROM_STATE_HISTORY_ADDR (EEPROM_STATE_BASE_ADDR + 50)
#define EEPROM_STATE_STATS_ADDR (EEPROM_STATE_BASE_ADDR + 200)

#define STATE_MAGIC_NUMBER 0x5678
#define MAX_STORED_HISTORY 5  // 存储最近5条状态变化记录

/**
 * 持久化状态数据结构
 */
struct PersistentStateData {
    PlantState currentState;        // 当前状态
    PlantState previousState;       // 之前状态
    unsigned long stateStartTime;   // 状态开始时间
    unsigned long lastUpdateTime;   // 最后更新时间
    int healthScore;                // 健康评分
    float lastSoilMoisture;         // 最后土壤湿度
    float lastLightLevel;           // 最后光照强度
    float lastTemperature;          // 最后温度
    bool needsAttention;            // 是否需要关注
    uint32_t checksum;              // 数据校验和
};

/**
 * 持久化状态历史记录
 */
struct PersistentStateHistory {
    StateChangeRecord records[MAX_STORED_HISTORY];
    int recordCount;
    int nextIndex;
    uint32_t checksum;
};

/**
 * 持久化统计信息
 */
struct PersistentStateStats {
    unsigned long totalEvaluations;
    unsigned long stateChanges;
    unsigned long timeInHealthy;
    unsigned long timeInNeedsWater;
    unsigned long timeInNeedsLight;
    unsigned long timeInCritical;
    float averageHealthScore;
    unsigned long lastStateChange;
    uint32_t checksum;
};

/**
 * 状态持久化管理器类
 */
class StatePersistence {
private:
    bool isInitialized;
    unsigned long lastSaveTime;
    unsigned long saveInterval;     // 保存间隔
    bool autoSaveEnabled;           // 是否启用自动保存
    
    // 私有方法
    uint32_t calculateChecksum(const void* data, size_t size);
    bool verifyChecksum(const void* data, size_t size, uint32_t expectedChecksum);
    bool writeToEEPROM(int address, const void* data, size_t size);
    bool readFromEEPROM(int address, void* data, size_t size);
    void initializeEEPROM();

public:
    /**
     * 构造函数
     */
    StatePersistence();
    
    /**
     * 析构函数
     */
    ~StatePersistence();
    
    /**
     * 初始化持久化管理器
     * @return 初始化是否成功
     */
    bool initialize();
    
    /**
     * 保存当前状态到EEPROM
     * @param status 植物状态信息
     * @return 保存是否成功
     */
    bool saveCurrentState(const PlantStatus& status);
    
    /**
     * 从EEPROM加载状态
     * @param status 输出的植物状态信息
     * @return 加载是否成功
     */
    bool loadCurrentState(PlantStatus& status);
    
    /**
     * 保存状态历史记录
     * @param history 状态变化记录数组
     * @param count 记录数量
     * @return 保存是否成功
     */
    bool saveStateHistory(const StateChangeRecord* history, int count);
    
    /**
     * 加载状态历史记录
     * @param history 输出的状态变化记录数组
     * @param maxCount 最大记录数量
     * @return 实际加载的记录数量
     */
    int loadStateHistory(StateChangeRecord* history, int maxCount);
    
    /**
     * 保存统计信息
     * @param stats 状态统计信息
     * @return 保存是否成功
     */
    bool saveStateStats(const StateStats& stats);
    
    /**
     * 加载统计信息
     * @param stats 输出的状态统计信息
     * @return 加载是否成功
     */
    bool loadStateStats(StateStats& stats);
    
    /**
     * 保存完整状态数据
     * @param stateManager 状态管理器指针
     * @return 保存是否成功
     */
    bool saveCompleteState(StateManager* stateManager);
    
    /**
     * 加载完整状态数据
     * @param stateManager 状态管理器指针
     * @return 加载是否成功
     */
    bool loadCompleteState(StateManager* stateManager);
    
    /**
     * 清除所有持久化数据
     * @return 清除是否成功
     */
    bool clearAllData();
    
    /**
     * 检查EEPROM中是否有有效数据
     * @return 是否有有效数据
     */
    bool hasValidData();
    
    /**
     * 获取EEPROM使用情况
     * @return 使用的字节数
     */
    int getEEPROMUsage();
    
    /**
     * 设置自动保存间隔
     * @param interval 保存间隔（毫秒）
     */
    void setAutoSaveInterval(unsigned long interval);
    
    /**
     * 启用或禁用自动保存
     * @param enabled 是否启用
     */
    void setAutoSaveEnabled(bool enabled);
    
    /**
     * 检查是否需要自动保存
     * @return 是否需要保存
     */
    bool needsAutoSave();
    
    /**
     * 执行自动保存
     * @param stateManager 状态管理器指针
     * @return 保存是否成功
     */
    bool performAutoSave(StateManager* stateManager);
    
    /**
     * 验证EEPROM数据完整性
     * @return 数据是否完整
     */
    bool verifyDataIntegrity();
    
    /**
     * 修复损坏的EEPROM数据
     * @return 修复是否成功
     */
    bool repairCorruptedData();
    
    /**
     * 获取最后保存时间
     * @return 最后保存的时间戳
     */
    unsigned long getLastSaveTime() const;
    
    /**
     * 获取持久化信息
     * @return JSON格式的持久化信息
     */
    String getPersistenceInfo() const;
    
    /**
     * 执行持久化系统自检
     * @return 自检是否通过
     */
    bool performSelfTest();
    
    /**
     * 备份当前数据到备用区域
     * @return 备份是否成功
     */
    bool backupData();
    
    /**
     * 从备用区域恢复数据
     * @return 恢复是否成功
     */
    bool restoreFromBackup();
    
    /**
     * 获取数据版本信息
     * @return 数据版本号
     */
    uint16_t getDataVersion();
    
    /**
     * 迁移旧版本数据
     * @param oldVersion 旧版本号
     * @return 迁移是否成功
     */
    bool migrateData(uint16_t oldVersion);
};

#endif // STATE_PERSISTENCE_H