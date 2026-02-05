/**
 * AI智能植物养护机器人 - 传感器管理器实现
 */

#include "SensorManager.h"
#include <EEPROM.h>
#include <ArduinoJson.h>

// EEPROM地址定义
#define EEPROM_CALIBRATION_ADDR 0
#define EEPROM_CALIBRATION_SIZE sizeof(CalibrationData)
#define CALIBRATION_MAGIC_NUMBER 0xABCD

/**
 * 构造函数
 */
SensorManager::SensorManager() 
    : dht(DHT_PIN, DHT_TYPE),
      dhtStatus(SensorStatus::NOT_INITIALIZED),
      soilMoistureStatus(SensorStatus::NOT_INITIALIZED),
      lightSensorStatus(SensorStatus::NOT_INITIALIZED),
      dhtErrorCount(0),
      soilMoistureErrorCount(0),
      lightSensorErrorCount(0),
      samplingCount(5),
      lastReadTime(0) {
    
    // 初始化校准数据
    calibrationData = {
        .soilMoistureMin = 3000,    // 默认干燥值
        .soilMoistureMax = 1000,    // 默认湿润值
        .lightSensorMin = 0,        // 默认黑暗值
        .lightSensorMax = 4095,     // 默认明亮值
        .lightConversionFactor = 2.44, // 默认转换系数
        .temperatureOffset = 0.0,   // 默认无偏移
        .isCalibrated = false
    };
    
    // 初始化数据结构
    lastValidData = {0, 0, 0, 0, 0, false};
    currentData = {0, 0, 0, 0, 0, false};
}

/**
 * 析构函数
 */
SensorManager::~SensorManager() {
    // 清理资源
}

/**
 * 初始化所有传感器
 */
bool SensorManager::initialize() {
    DEBUG_PRINTLN("初始化传感器管理器...");
    
    // 初始化EEPROM
    EEPROM.begin(512);
    
    // 初始化ADC
    analogReadResolution(ADC_RESOLUTION);
    analogSetAttenuation(ADC_11db);
    
    // 初始化DHT22传感器
    dht.begin();
    delay(2000); // DHT22需要2秒启动时间
    
    // 测试DHT22
    float testTemp = dht.readTemperature();
    float testHum = dht.readHumidity();
    
    if (isnan(testTemp) || isnan(testHum)) {
        DEBUG_PRINTLN("✗ DHT22传感器初始化失败");
        dhtStatus = SensorStatus::ERROR;
    } else {
        DEBUG_PRINTLN("✓ DHT22传感器初始化成功");
        dhtStatus = SensorStatus::OK;
    }
    
    // 测试土壤湿度传感器
    int soilTest = analogRead(SOIL_MOISTURE_PIN);
    if (soilTest < 0 || soilTest > 4095) {
        DEBUG_PRINTLN("✗ 土壤湿度传感器初始化失败");
        soilMoistureStatus = SensorStatus::ERROR;
    } else {
        DEBUG_PRINTLN("✓ 土壤湿度传感器初始化成功");
        soilMoistureStatus = SensorStatus::OK;
    }
    
    // 测试光感传感器
    int lightTest = analogRead(LIGHT_SENSOR_PIN);
    if (lightTest < 0 || lightTest > 4095) {
        DEBUG_PRINTLN("✗ 光感传感器初始化失败");
        lightSensorStatus = SensorStatus::ERROR;
    } else {
        DEBUG_PRINTLN("✓ 光感传感器初始化成功");
        lightSensorStatus = SensorStatus::OK;
    }
    
    // 加载校准数据
    if (!loadCalibrationFromEEPROM()) {
        DEBUG_PRINTLN("未找到校准数据，使用默认值");
    } else {
        DEBUG_PRINTLN("✓ 校准数据加载成功");
    }
    
    // 执行自检
    bool selfTestResult = performSelfTest();
    
    DEBUG_PRINTF("传感器初始化完成，自检结果: %s\n", 
                 selfTestResult ? "通过" : "失败");
    
    return isAllSensorsOK();
}

/**
 * 校准传感器
 */
bool SensorManager::calibrate(bool autoCalibrate) {
    DEBUG_PRINTLN("开始传感器校准...");
    
    if (autoCalibrate) {
        // 自动校准模式
        DEBUG_PRINTLN("执行自动校准...");
        
        // 土壤湿度传感器自动校准
        DEBUG_PRINTLN("请确保土壤湿度传感器处于干燥状态，10秒后开始校准...");
        delay(10000);
        
        int dryValue = getMedianReading(SOIL_MOISTURE_PIN, 10);
        DEBUG_PRINTF("干燥状态ADC值: %d\n", dryValue);
        
        DEBUG_PRINTLN("请将土壤湿度传感器放入水中，10秒后继续校准...");
        delay(10000);
        
        int wetValue = getMedianReading(SOIL_MOISTURE_PIN, 10);
        DEBUG_PRINTF("湿润状态ADC值: %d\n", wetValue);
        
        if (!calibrateSoilMoisture(dryValue, wetValue)) {
            DEBUG_PRINTLN("✗ 土壤湿度传感器校准失败");
            return false;
        }
        
        // 光感传感器自动校准
        DEBUG_PRINTLN("请遮挡光感传感器，10秒后开始校准...");
        delay(10000);
        
        int darkValue = getMedianReading(LIGHT_SENSOR_PIN, 10);
        DEBUG_PRINTF("黑暗状态ADC值: %d\n", darkValue);
        
        DEBUG_PRINTLN("请将光感传感器置于强光下，10秒后继续校准...");
        delay(10000);
        
        int brightValue = getMedianReading(LIGHT_SENSOR_PIN, 10);
        DEBUG_PRINTF("明亮状态ADC值: %d\n", brightValue);
        
        if (!calibrateLightSensor(darkValue, brightValue, 10000.0)) {
            DEBUG_PRINTLN("✗ 光感传感器校准失败");
            return false;
        }
    }
    
    // 保存校准数据
    if (saveCalibrationToEEPROM()) {
        calibrationData.isCalibrated = true;
        DEBUG_PRINTLN("✓ 传感器校准完成并保存");
        return true;
    } else {
        DEBUG_PRINTLN("✗ 校准数据保存失败");
        return false;
    }
}

/**
 * 手动校准土壤湿度传感器
 */
bool SensorManager::calibrateSoilMoisture(int dryValue, int wetValue) {
    if (dryValue <= wetValue) {
        DEBUG_PRINTLN("✗ 校准参数错误：干燥值应大于湿润值");
        return false;
    }
    
    calibrationData.soilMoistureMin = wetValue;
    calibrationData.soilMoistureMax = dryValue;
    
    DEBUG_PRINTF("土壤湿度传感器校准: 干燥=%d, 湿润=%d\n", dryValue, wetValue);
    return true;
}

/**
 * 手动校准光感传感器
 */
bool SensorManager::calibrateLightSensor(int darkValue, int brightValue, float maxLux) {
    if (brightValue <= darkValue) {
        DEBUG_PRINTLN("✗ 校准参数错误：明亮值应大于黑暗值");
        return false;
    }
    
    calibrationData.lightSensorMin = darkValue;
    calibrationData.lightSensorMax = brightValue;
    calibrationData.lightConversionFactor = maxLux / (brightValue - darkValue);
    
    DEBUG_PRINTF("光感传感器校准: 黑暗=%d, 明亮=%d, 系数=%.2f\n", 
                 darkValue, brightValue, calibrationData.lightConversionFactor);
    return true;
}

/**
 * 读取所有传感器数据
 */
SensorData SensorManager::readAll() {
    currentData.timestamp = millis();
    
    // 读取各传感器数据
    currentData.soilHumidity = readSoilMoisture();
    currentData.airHumidity = readAirHumidity();
    currentData.temperature = readTemperature();
    currentData.lightIntensity = readLightIntensity();
    
    // 应用校准
    applyCalibration(currentData);
    
    // 验证数据有效性
    currentData.isValid = validateSensorData(currentData);
    
    if (currentData.isValid) {
        lastValidData = currentData;
        resetErrorCounts();
    }
    
    lastReadTime = millis();
    
    #if DEBUG_SENSORS
    DEBUG_PRINTF("传感器数据: 土壤湿度=%.1f%%, 空气湿度=%.1f%%, 温度=%.1f°C, 光照=%.0flux\n",
                 currentData.soilHumidity, currentData.airHumidity, 
                 currentData.temperature, currentData.lightIntensity);
    #endif
    
    return currentData;
}

/**
 * 读取土壤湿度
 */
float SensorManager::readSoilMoisture() {
    int rawValue = getMedianReading(SOIL_MOISTURE_PIN, samplingCount);
    
    if (rawValue < 0) {
        soilMoistureErrorCount++;
        soilMoistureStatus = SensorStatus::ERROR;
        return lastValidData.soilHumidity;
    }
    
    // 转换为百分比 (注意：土壤湿度传感器值越大表示越干燥)
    float moisture = mapFloat(rawValue, 
                             calibrationData.soilMoistureMax, 
                             calibrationData.soilMoistureMin, 
                             0.0, 100.0);
    
    // 限制范围
    moisture = constrain(moisture, 0.0, 100.0);
    
    soilMoistureStatus = SensorStatus::OK;
    return moisture;
}

/**
 * 读取光照强度
 */
float SensorManager::readLightIntensity() {
    int rawValue = getMedianReading(LIGHT_SENSOR_PIN, samplingCount);
    
    if (rawValue < 0) {
        lightSensorErrorCount++;
        lightSensorStatus = SensorStatus::ERROR;
        return lastValidData.lightIntensity;
    }
    
    // 转换为lux
    float lux = (rawValue - calibrationData.lightSensorMin) * 
                calibrationData.lightConversionFactor;
    
    // 限制范围
    lux = constrain(lux, 0.0, 50000.0);
    
    lightSensorStatus = SensorStatus::OK;
    return lux;
}

/**
 * 读取温度
 */
float SensorManager::readTemperature() {
    float temp = dht.readTemperature();
    
    if (isnan(temp)) {
        dhtErrorCount++;
        dhtStatus = SensorStatus::ERROR;
        return lastValidData.temperature;
    }
    
    // 应用温度补偿
    temp += calibrationData.temperatureOffset;
    
    dhtStatus = SensorStatus::OK;
    return temp;
}

/**
 * 读取空气湿度
 */
float SensorManager::readAirHumidity() {
    float humidity = dht.readHumidity();
    
    if (isnan(humidity)) {
        dhtErrorCount++;
        dhtStatus = SensorStatus::ERROR;
        return lastValidData.airHumidity;
    }
    
    dhtStatus = SensorStatus::OK;
    return humidity;
}

/**
 * 验证传感器数据
 */
bool SensorManager::validateSensorData(const SensorData& data) {
    // 检查数据范围
    if (data.soilHumidity < 0 || data.soilHumidity > 100) return false;
    if (data.airHumidity < 0 || data.airHumidity > 100) return false;
    if (data.temperature < -40 || data.temperature > 80) return false;
    if (data.lightIntensity < 0 || data.lightIntensity > 50000) return false;
    
    return true;
}

/**
 * 应用校准
 */
void SensorManager::applyCalibration(SensorData& data) {
    // 温度校准已在读取时应用
    // 其他传感器的校准也已在读取时应用
    // 这里可以添加额外的校准逻辑
}

/**
 * 浮点数映射函数
 */
float SensorManager::mapFloat(float value, float inMin, float inMax, float outMin, float outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * 获取中位数读数
 */
int SensorManager::getMedianReading(int pin, int samples) {
    int readings[samples];
    
    // 采集多个样本
    for (int i = 0; i < samples; i++) {
        readings[i] = analogRead(pin);
        delay(10); // 短暂延时
    }
    
    // 冒泡排序
    for (int i = 0; i < samples - 1; i++) {
        for (int j = 0; j < samples - i - 1; j++) {
            if (readings[j] > readings[j + 1]) {
                int temp = readings[j];
                readings[j] = readings[j + 1];
                readings[j + 1] = temp;
            }
        }
    }
    
    // 返回中位数
    return readings[samples / 2];
}

/**
 * 获取传感器状态
 */
SensorStatus SensorManager::getDHTStatus() const {
    return dhtStatus;
}

SensorStatus SensorManager::getSoilMoistureStatus() const {
    return soilMoistureStatus;
}

SensorStatus SensorManager::getLightSensorStatus() const {
    return lightSensorStatus;
}

/**
 * 获取最后有效数据
 */
SensorData SensorManager::getLastValidData() const {
    return lastValidData;
}

/**
 * 检查所有传感器是否正常
 */
bool SensorManager::isAllSensorsOK() const {
    return (dhtStatus == SensorStatus::OK && 
            soilMoistureStatus == SensorStatus::OK && 
            lightSensorStatus == SensorStatus::OK);
}

/**
 * 获取错误信息
 */
String SensorManager::getErrorInfo() const {
    String errorInfo = "";
    
    if (dhtStatus != SensorStatus::OK) {
        errorInfo += "DHT22错误(" + String(dhtErrorCount) + "); ";
    }
    if (soilMoistureStatus != SensorStatus::OK) {
        errorInfo += "土壤湿度传感器错误(" + String(soilMoistureErrorCount) + "); ";
    }
    if (lightSensorStatus != SensorStatus::OK) {
        errorInfo += "光感传感器错误(" + String(lightSensorErrorCount) + "); ";
    }
    
    return errorInfo.length() > 0 ? errorInfo : "无错误";
}

/**
 * 重置错误计数
 */
void SensorManager::resetErrorCounts() {
    dhtErrorCount = 0;
    soilMoistureErrorCount = 0;
    lightSensorErrorCount = 0;
}

/**
 * 设置采样次数
 */
void SensorManager::setSamplingCount(int count) {
    samplingCount = constrain(count, 1, 20);
}

/**
 * 获取校准数据
 */
CalibrationData SensorManager::getCalibrationData() const {
    return calibrationData;
}

/**
 * 设置校准数据
 */
void SensorManager::setCalibrationData(const CalibrationData& data) {
    calibrationData = data;
}

/**
 * 保存校准数据到EEPROM
 */
bool SensorManager::saveCalibrationToEEPROM() {
    // 写入魔数
    EEPROM.writeUShort(EEPROM_CALIBRATION_ADDR, CALIBRATION_MAGIC_NUMBER);
    
    // 写入校准数据
    EEPROM.put(EEPROM_CALIBRATION_ADDR + 2, calibrationData);
    
    return EEPROM.commit();
}

/**
 * 从EEPROM加载校准数据
 */
bool SensorManager::loadCalibrationFromEEPROM() {
    // 检查魔数
    uint16_t magic = EEPROM.readUShort(EEPROM_CALIBRATION_ADDR);
    if (magic != CALIBRATION_MAGIC_NUMBER) {
        return false;
    }
    
    // 读取校准数据
    EEPROM.get(EEPROM_CALIBRATION_ADDR + 2, calibrationData);
    
    return calibrationData.isCalibrated;
}

/**
 * 执行传感器自检
 */
bool SensorManager::performSelfTest() {
    DEBUG_PRINTLN("执行传感器自检...");
    
    bool allPassed = true;
    
    // 测试DHT22
    float testTemp = dht.readTemperature();
    float testHum = dht.readHumidity();
    if (isnan(testTemp) || isnan(testHum)) {
        DEBUG_PRINTLN("✗ DHT22自检失败");
        dhtStatus = SensorStatus::ERROR;
        allPassed = false;
    } else {
        DEBUG_PRINTLN("✓ DHT22自检通过");
    }
    
    // 测试土壤湿度传感器
    int soilReading = analogRead(SOIL_MOISTURE_PIN);
    if (soilReading < 0 || soilReading > 4095) {
        DEBUG_PRINTLN("✗ 土壤湿度传感器自检失败");
        soilMoistureStatus = SensorStatus::ERROR;
        allPassed = false;
    } else {
        DEBUG_PRINTLN("✓ 土壤湿度传感器自检通过");
    }
    
    // 测试光感传感器
    int lightReading = analogRead(LIGHT_SENSOR_PIN);
    if (lightReading < 0 || lightReading > 4095) {
        DEBUG_PRINTLN("✗ 光感传感器自检失败");
        lightSensorStatus = SensorStatus::ERROR;
        allPassed = false;
    } else {
        DEBUG_PRINTLN("✓ 光感传感器自检通过");
    }
    
    return allPassed;
}

/**
 * 获取传感器信息
 */
String SensorManager::getSensorInfo() const {
    DynamicJsonDocument doc(1024);
    
    doc["dht_status"] = (int)dhtStatus;
    doc["soil_moisture_status"] = (int)soilMoistureStatus;
    doc["light_sensor_status"] = (int)lightSensorStatus;
    doc["is_calibrated"] = calibrationData.isCalibrated;
    doc["sampling_count"] = samplingCount;
    doc["error_counts"]["dht"] = dhtErrorCount;
    doc["error_counts"]["soil"] = soilMoistureErrorCount;
    doc["error_counts"]["light"] = lightSensorErrorCount;
    
    String result;
    serializeJson(doc, result);
    return result;
}

/**
 * 设置温度补偿
 */
void SensorManager::setTemperatureOffset(float offset) {
    calibrationData.temperatureOffset = offset;
}

// 单独的getter方法实现
float SensorManager::getSoilMoisture() {
    return readSoilMoisture();
}

float SensorManager::getAirHumidity() {
    return readAirHumidity();
}

float SensorManager::getTemperature() {
    return readTemperature();
}

float SensorManager::getLightIntensity() {
    return readLightIntensity();
}