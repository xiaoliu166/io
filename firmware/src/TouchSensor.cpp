/**
 * AI智能植物养护机器人 - 触摸传感器控制器实现
 */

#include "TouchSensor.h"

// 默认配置常量
const int DEFAULT_TOUCH_THRESHOLD = 2000;    // 触摸阈值
const int DEFAULT_RELEASE_THRESHOLD = 1800;  // 释放阈值
const unsigned long DEFAULT_DEBOUNCE_TIME = 50;    // 防抖时间 (ms)
const unsigned long DEFAULT_HOLD_TIME = 1000;      // 长按时间 (ms)
const int FILTER_ALPHA = 8;  // 低通滤波器系数 (1/8)

TouchSensor::TouchSensor(int pin) 
    : sensorPin(pin)
    , adcResolution(ADC_RESOLUTION)
    , touchThreshold(DEFAULT_TOUCH_THRESHOLD)
    , releaseThreshold(DEFAULT_RELEASE_THRESHOLD)
    , debounceTime(DEFAULT_DEBOUNCE_TIME)
    , holdTime(DEFAULT_HOLD_TIME)
    , isTouched(false)
    , lastTouchState(false)
    , touchStartTime(0)
    , lastReadTime(0)
    , lastRawValue(0)
    , filteredValue(0)
    , touchCallback(nullptr)
    , totalTouches(0)
    , totalHolds(0)
    , lastTouchTime(0) {
}

TouchSensor::~TouchSensor() {
    // 清理资源
}

bool TouchSensor::initialize() {
    DEBUG_PRINTLN("TouchSensor: 初始化触摸传感器...");
    
    // 配置ADC引脚
    pinMode(sensorPin, INPUT);
    
    // 设置ADC分辨率
    analogReadResolution(adcResolution);
    
    // 初始化滤波器
    int initialValue = readRawValue();
    filteredValue = initialValue;
    lastRawValue = initialValue;
    
    DEBUG_PRINTF("TouchSensor: 初始化完成，基准值: %d\n", initialValue);
    return true;
}

void TouchSensor::update() {
    unsigned long currentTime = millis();
    
    // 限制读取频率（每10ms读取一次）
    if (currentTime - lastReadTime < 10) {
        return;
    }
    lastReadTime = currentTime;
    
    // 读取并滤波传感器值
    int rawValue = readRawValue();
    filteredValue = applyFilter(rawValue);
    
    // 检测触摸状态
    bool currentTouchState = detectTouch(filteredValue);
    
    // 处理状态变化
    if (currentTouchState != lastTouchState) {
        // 防抖处理
        if (currentTime - touchStartTime > debounceTime) {
            if (currentTouchState && !lastTouchState) {
                // 开始触摸
                isTouched = true;
                touchStartTime = currentTime;
                lastTouchTime = currentTime;
                totalTouches++;
                triggerEvent(TouchEventType::TOUCH_START, filteredValue);
                
                DEBUG_PRINTF("TouchSensor: 触摸开始，压力值: %d\n", filteredValue);
                
            } else if (!currentTouchState && lastTouchState) {
                // 结束触摸
                unsigned long duration = currentTime - touchStartTime;
                isTouched = false;
                
                // 判断是长按还是轻触
                if (duration >= holdTime) {
                    totalHolds++;
                    triggerEvent(TouchEventType::TOUCH_HOLD, filteredValue, duration);
                    DEBUG_PRINTF("TouchSensor: 长按结束，持续时间: %lu ms\n", duration);
                } else {
                    triggerEvent(TouchEventType::TOUCH_TAP, filteredValue, duration);
                    DEBUG_PRINTF("TouchSensor: 轻触结束，持续时间: %lu ms\n", duration);
                }
                
                triggerEvent(TouchEventType::TOUCH_END, filteredValue, duration);
            }
            
            lastTouchState = currentTouchState;
        }
    } else if (currentTouchState) {
        // 持续触摸中，检查是否达到长按时间
        unsigned long duration = currentTime - touchStartTime;
        if (duration >= holdTime && !lastTouchState) {
            // 第一次达到长按时间
            triggerEvent(TouchEventType::TOUCH_HOLD, filteredValue, duration);
            DEBUG_PRINTF("TouchSensor: 检测到长按，持续时间: %lu ms\n", duration);
        }
    }
}

int TouchSensor::readRawValue() {
    return analogRead(sensorPin);
}

int TouchSensor::applyFilter(int rawValue) {
    // 简单的低通滤波器：filtered = (7 * filtered + rawValue) / 8
    return (filteredValue * (FILTER_ALPHA - 1) + rawValue) / FILTER_ALPHA;
}

bool TouchSensor::detectTouch(int value) {
    if (isTouched) {
        // 已经在触摸状态，使用释放阈值
        return value > releaseThreshold;
    } else {
        // 未触摸状态，使用触摸阈值
        return value > touchThreshold;
    }
}

void TouchSensor::triggerEvent(TouchEventType type, int pressure, unsigned long duration) {
    if (touchCallback != nullptr) {
        TouchEvent event;
        event.type = type;
        event.timestamp = millis();
        event.pressure = pressure;
        event.duration = duration;
        
        touchCallback(event);
    }
}

void TouchSensor::setTouchCallback(TouchCallback callback) {
    touchCallback = callback;
    DEBUG_PRINTLN("TouchSensor: 触摸回调函数已设置");
}

void TouchSensor::setTouchThreshold(int threshold) {
    touchThreshold = constrain(threshold, 0, (1 << adcResolution) - 1);
    DEBUG_PRINTF("TouchSensor: 触摸阈值设置为: %d\n", touchThreshold);
}

void TouchSensor::setReleaseThreshold(int threshold) {
    releaseThreshold = constrain(threshold, 0, (1 << adcResolution) - 1);
    DEBUG_PRINTF("TouchSensor: 释放阈值设置为: %d\n", releaseThreshold);
}

void TouchSensor::setDebounceTime(unsigned long time) {
    debounceTime = time;
    DEBUG_PRINTF("TouchSensor: 防抖时间设置为: %lu ms\n", debounceTime);
}

void TouchSensor::setHoldTime(unsigned long time) {
    holdTime = time;
    DEBUG_PRINTF("TouchSensor: 长按时间设置为: %lu ms\n", holdTime);
}

bool TouchSensor::isTouchActive() const {
    return isTouched;
}

int TouchSensor::getCurrentPressure() const {
    return lastRawValue;
}

int TouchSensor::getFilteredPressure() const {
    return filteredValue;
}

unsigned long TouchSensor::getTouchDuration() const {
    if (isTouched) {
        return millis() - touchStartTime;
    }
    return 0;
}

void TouchSensor::calibrate() {
    DEBUG_PRINTLN("TouchSensor: 开始校准...");
    
    // 读取多个样本计算平均值
    long sum = 0;
    const int samples = 100;
    
    for (int i = 0; i < samples; i++) {
        sum += readRawValue();
        delay(10);
    }
    
    int baseline = sum / samples;
    
    // 设置阈值（基准值 + 偏移量）
    touchThreshold = baseline + 200;
    releaseThreshold = baseline + 150;
    
    // 重置滤波器
    filteredValue = baseline;
    
    DEBUG_PRINTF("TouchSensor: 校准完成，基准值: %d, 触摸阈值: %d, 释放阈值: %d\n", 
                 baseline, touchThreshold, releaseThreshold);
}

void TouchSensor::resetStatistics() {
    totalTouches = 0;
    totalHolds = 0;
    lastTouchTime = 0;
    DEBUG_PRINTLN("TouchSensor: 统计信息已重置");
}

unsigned long TouchSensor::getTotalTouches() const {
    return totalTouches;
}

unsigned long TouchSensor::getTotalHolds() const {
    return totalHolds;
}

unsigned long TouchSensor::getLastTouchTime() const {
    return lastTouchTime;
}

String TouchSensor::getSystemInfo() const {
    String info = "{\n";
    info += "  \"sensor\": \"TouchSensor\",\n";
    info += "  \"pin\": " + String(sensorPin) + ",\n";
    info += "  \"touchThreshold\": " + String(touchThreshold) + ",\n";
    info += "  \"releaseThreshold\": " + String(releaseThreshold) + ",\n";
    info += "  \"debounceTime\": " + String(debounceTime) + ",\n";
    info += "  \"holdTime\": " + String(holdTime) + ",\n";
    info += "  \"currentPressure\": " + String(getCurrentPressure()) + ",\n";
    info += "  \"filteredPressure\": " + String(getFilteredPressure()) + ",\n";
    info += "  \"isTouched\": " + String(isTouched ? "true" : "false") + ",\n";
    info += "  \"touchDuration\": " + String(getTouchDuration()) + ",\n";
    info += "  \"totalTouches\": " + String(totalTouches) + ",\n";
    info += "  \"totalHolds\": " + String(totalHolds) + ",\n";
    info += "  \"lastTouchTime\": " + String(lastTouchTime) + ",\n";
    info += "  \"working\": " + String(isWorking() ? "true" : "false") + "\n";
    info += "}";
    return info;
}

void TouchSensor::setEnabled(bool enabled) {
    if (enabled) {
        DEBUG_PRINTLN("TouchSensor: 触摸检测已启用");
    } else {
        DEBUG_PRINTLN("TouchSensor: 触摸检测已禁用");
        isTouched = false;
        lastTouchState = false;
    }
}

bool TouchSensor::isWorking() const {
    // 检查传感器是否正常工作
    // 如果读取值在合理范围内，认为传感器正常
    int currentValue = analogRead(sensorPin);
    return (currentValue >= 0 && currentValue < (1 << adcResolution));
}
/**
 * 设置触摸灵敏度
 */
void TouchSensor::setTouchSensitivity(float sensitivity) {
    // 根据灵敏度调整阈值
    int baseThreshold = 500; // 基础阈值
    touchThreshold = baseThreshold * (2.0f - sensitivity); // 灵敏度越高，阈值越低
    releaseThreshold = touchThreshold * 0.8f; // 释放阈值为触摸阈值的80%
    
    Serial.print("TouchSensor: Sensitivity set to ");
    Serial.print(sensitivity);
    Serial.print(", threshold: ");
    Serial.println(touchThreshold);
}

/**
 * 设置长按阈值
 */
void TouchSensor::setHoldThreshold(unsigned long threshold) {
    holdTime = threshold;
    Serial.print("TouchSensor: Hold threshold set to ");
    Serial.print(threshold);
    Serial.println(" ms");
}

/**
 * 启用触摸反馈
 */
void TouchSensor::enableTouchFeedback(bool enabled) {
    // 这个方法可以用来启用/禁用触摸反馈
    // 实际的反馈逻辑在FeedbackManager中处理
    Serial.print("TouchSensor: Touch feedback ");
    Serial.println(enabled ? "enabled" : "disabled");
}