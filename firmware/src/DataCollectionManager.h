/**
 * AI智能植物养护机器人 - 数据采集管理器
 * 负责定时数据采集、数据缓存和异常处理
 */

#ifndef DATA_COLLECTION_MANAGER_H
#define DATA_COLLECTION_MANAGER_H

#include <Arduino.h>
#include "SensorManager.h"
#include "config.h"

/**
 * 数据采集状态
 */
enum class CollectionStatus {
    IDLE,           // 空闲
    COLLECTING,     // 采集中
    PROCESSING,     // 处理中
    ERROR,          // 错误
    PAUSED          // 暂停
};

/**
 * 数据缓冲区结构
 */
struct DataBuffer {
    SensorData data[SENSOR_BUFFER_SIZE];
    int head;           // 头指针
    int tail;           // 尾指针
    int count;          // 当前数据量
    bool isFull;        // 缓冲区是否满
};

/**
 * 采集统计信息
 */
struct CollectionStats {
    unsigned long totalCollections;     // 总采集次数
    unsigned long successfulCollections; // 成功采集次数
    unsigned long failedCollections;    // 失败采集次数
    unsigned long lastCollectionTime;   // 上次采集时间
    float successRate;                  // 成功率
    unsigned long averageInterval;      // 平均采集间隔
};

/**
 * 数据采集管理器类
 */
class DataCollectionManager {
private:
    SensorManager* sensorManager;
    
    // 采集配置
    unsigned long collectionInterval;   // 采集间隔 (ms)
    bool isAutoCollection;              // 是否自动采集
    bool isEnabled;                     // 是否启用
    
    // 状态管理
    CollectionStatus currentStatus;
    unsigned long lastCollectionTime;
    unsigned long nextCollectionTime;
    
    // 数据缓冲
    DataBuffer dataBuffer;
    
    // 统计信息
    CollectionStats stats;
    
    // 错误处理
    int consecutiveErrors;
    int maxConsecutiveErrors;
    unsigned long errorRecoveryDelay;
    
    // 私有方法
    void initializeBuffer();
    bool addToBuffer(const SensorData& data);
    SensorData getFromBuffer(int index);
    void updateStats(bool success);
    void handleCollectionError();
    void resetErrorState();
    bool isTimeForCollection();
    void processCollectedData(const SensorData& data);

public:
    /**
     * 构造函数
     * @param sensorMgr 传感器管理器指针
     */
    DataCollectionManager(SensorManager* sensorMgr);
    
    /**
     * 析构函数
     */
    ~DataCollectionManager();
    
    /**
     * 初始化数据采集管理器
     * @return 初始化是否成功
     */
    bool initialize();
    
    /**
     * 更新数据采集（应在主循环中调用）
     */
    void update();
    
    /**
     * 开始自动数据采集
     * @param interval 采集间隔（毫秒）
     * @return 启动是否成功
     */
    bool startAutoCollection(unsigned long interval = DATA_COLLECTION_INTERVAL);
    
    /**
     * 停止自动数据采集
     */
    void stopAutoCollection();
    
    /**
     * 执行单次数据采集
     * @return 采集到的传感器数据
     */
    SensorData collectOnce();
    
    /**
     * 暂停数据采集
     */
    void pauseCollection();
    
    /**
     * 恢复数据采集
     */
    void resumeCollection();
    
    /**
     * 设置采集间隔
     * @param interval 新的采集间隔（毫秒）
     */
    void setCollectionInterval(unsigned long interval);
    
    /**
     * 获取采集间隔
     * @return 当前采集间隔（毫秒）
     */
    unsigned long getCollectionInterval() const;
    
    /**
     * 获取当前状态
     * @return 当前采集状态
     */
    CollectionStatus getCurrentStatus() const;
    
    /**
     * 获取最新数据
     * @return 最新的传感器数据
     */
    SensorData getLatestData();
    
    /**
     * 获取历史数据
     * @param count 要获取的数据条数
     * @param data 输出数组
     * @return 实际获取的数据条数
     */
    int getHistoryData(int count, SensorData* data);
    
    /**
     * 获取缓冲区中的数据数量
     * @return 数据数量
     */
    int getBufferCount() const;
    
    /**
     * 检查缓冲区是否为空
     * @return 是否为空
     */
    bool isBufferEmpty() const;
    
    /**
     * 检查缓冲区是否已满
     * @return 是否已满
     */
    bool isBufferFull() const;
    
    /**
     * 清空数据缓冲区
     */
    void clearBuffer();
    
    /**
     * 获取统计信息
     * @return 采集统计信息
     */
    CollectionStats getStats() const;
    
    /**
     * 重置统计信息
     */
    void resetStats();
    
    /**
     * 获取错误信息
     * @return 错误信息字符串
     */
    String getErrorInfo() const;
    
    /**
     * 检查是否有错误
     * @return 是否有错误
     */
    bool hasError() const;
    
    /**
     * 清除错误状态
     */
    void clearError();
    
    /**
     * 设置最大连续错误次数
     * @param maxErrors 最大连续错误次数
     */
    void setMaxConsecutiveErrors(int maxErrors);
    
    /**
     * 设置错误恢复延迟
     * @param delay 恢复延迟（毫秒）
     */
    void setErrorRecoveryDelay(unsigned long delay);
    
    /**
     * 获取下次采集时间
     * @return 下次采集的时间戳
     */
    unsigned long getNextCollectionTime() const;
    
    /**
     * 获取距离下次采集的时间
     * @return 剩余时间（毫秒）
     */
    unsigned long getTimeToNextCollection() const;
    
    /**
     * 强制执行数据采集
     * @return 采集是否成功
     */
    bool forceCollection();
    
    /**
     * 检查是否正在采集
     * @return 是否正在采集
     */
    bool isCollecting() const;
    
    /**
     * 检查自动采集是否启用
     * @return 是否启用自动采集
     */
    bool isAutoCollectionEnabled() const;
    
    /**
     * 获取系统信息
     * @return JSON格式的系统信息
     */
    String getSystemInfo() const;
};

#endif // DATA_COLLECTION_MANAGER_H