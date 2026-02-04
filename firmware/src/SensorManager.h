/**
 * AI智能植物养护机器人 - 传感器管理器
 * 负责所有传感器的初始化、校准和数据采集
 */

#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>
#include <DHT.h>
#include "config.h"

/**
 * 传感器数据结构
 */
struct SensorData {
    float soilHumidity;      // 土壤湿度 (%)
    float airHumidity;       // 空气湿度 (%)
    float temperature;       // 温度 (°C)
    float lightIntensity;    // 光照强度 (lux)
    unsigned long timestamp; // 时间戳
    bool isValid;            // 数据是否有效
};

/**
 * 传感器状态枚举
 */
enum class SensorStatus {
    OK,                 // 正常
    ERROR,              // 错误
    CALIBRATING,        // 校准中
    NOT_INITIALIZED     // 未初始化
};

/**
 * 传感器校准数据
 */
struct CalibrationData {
    // 土壤湿度校准
    int soilMoistureMin;    // 干燥时的ADC值
    int soilMoistureMax;    // 完全湿润时的ADC值
    
    // 光感传感器校准
    int lightSensorMin;     // 黑暗时的ADC值
    int lightSensorMax;     // 强光时的ADC值
    float lightConversionFactor; // 转换系数
    
    // 温度补偿
    float temperatureOffset; // 温度偏移量
    
    bool isCalibrated;      // 是否已校准
};

/**
 * 传感器管理器类
 */
class SensorManager {
private:
    // DHT22 温湿度传感器
    DHT dht;
    
    // 传感器状态
    SensorStatus dhtStatus;
    SensorStatus soilMoistureStatus;
    SensorStatus lightSensorStatus;
    
    // 校准数据
    CalibrationData calibrationData;
    
    // 数据缓存
    SensorData lastValidData;
    SensorData currentData;
    
    // 错误计数
    int dhtErrorCount;
    int soilMoistureErrorCount;
    int lightSensorErrorCount;
    
    // 采样配置
    int samplingCount;          // 采样次数
    unsigned long lastReadTime; // 上次读取时间
    
    // 私有方法
    float readSoilMoisture();
    float readLightIntensity();
    float readTemperature();
    float readAirHumidity();
    bool validateSensorData(const SensorData& data);
    void applyCalibration(SensorData& data);
    float mapFloat(float value, float inMin, float inMax, float outMin, float outMax);
    int getMedianReading(int pin, int samples = 5);

public:
    /**
     * 构造函数
     */
    SensorManager();
    
    /**
     * 析构函数
     */
    ~SensorManager();
    
    /**
     * 初始化所有传感器
     * @return 初始化是否成功
     */
    bool initialize();
    
    /**
     * 校准传感器
     * @param autoCalibrate 是否自动校准
     * @return 校准是否成功
     */
    bool calibrate(bool autoCalibrate = true);
    
    /**
     * 手动校准土壤湿度传感器
     * @param dryValue 干燥时的ADC值
     * @param wetValue 湿润时的ADC值
     * @return 校准是否成功
     */
    bool calibrateSoilMoisture(int dryValue, int wetValue);
    
    /**
     * 手动校准光感传感器
     * @param darkValue 黑暗时的ADC值
     * @param brightValue 明亮时的ADC值
     * @param maxLux 最大光照强度
     * @return 校准是否成功
     */
    bool calibrateLightSensor(int darkValue, int brightValue, float maxLux = 10000.0);
    
    /**
     * 读取所有传感器数据
     * @return 传感器数据结构
     */
    SensorData readAll();
    
    /**
     * 读取单个传感器数据
     */
    float getSoilMoisture();
    float getAirHumidity();
    float getTemperature();
    float getLightIntensity();
    
    /**
     * 获取传感器状态
     */
    SensorStatus getDHTStatus() const;
    SensorStatus getSoilMoistureStatus() const;
    SensorStatus getLightSensorStatus() const;
    
    /**
     * 获取最后有效数据
     * @return 最后一次有效的传感器数据
     */
    SensorData getLastValidData() const;
    
    /**
     * 检查传感器是否正常工作
     * @return 所有传感器是否正常
     */
    bool isAllSensorsOK() const;
    
    /**
     * 获取错误信息
     * @return 错误信息字符串
     */
    String getErrorInfo() const;
    
    /**
     * 重置错误计数
     */
    void resetErrorCounts();
    
    /**
     * 设置采样次数
     * @param count 采样次数（用于提高精度）
     */
    void setSamplingCount(int count);
    
    /**
     * 获取校准数据
     * @return 校准数据结构
     */
    CalibrationData getCalibrationData() const;
    
    /**
     * 设置校准数据
     * @param data 校准数据
     */
    void setCalibrationData(const CalibrationData& data);
    
    /**
     * 保存校准数据到EEPROM
     * @return 保存是否成功
     */
    bool saveCalibrationToEEPROM();
    
    /**
     * 从EEPROM加载校准数据
     * @return 加载是否成功
     */
    bool loadCalibrationFromEEPROM();
    
    /**
     * 执行传感器自检
     * @return 自检结果
     */
    bool performSelfTest();
    
    /**
     * 获取传感器信息
     * @return JSON格式的传感器信息
     */
    String getSensorInfo() const;
    
    /**
     * 设置温度补偿
     * @param offset 温度偏移量
     */
    void setTemperatureOffset(float offset);
};

#endif // SENSOR_MANAGER_H