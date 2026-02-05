/**
 * AI智能植物养护机器人 - 触摸传感器控制器
 * 处理压力传感器输入，实现触摸检测和防抖动
 */

#ifndef TOUCH_SENSOR_H
#define TOUCH_SENSOR_H

#include <Arduino.h>
#include "config.h"

/**
 * 触摸事件类型
 */
enum class TouchEventType {
    TOUCH_START,    // 开始触摸
    TOUCH_END,      // 结束触摸
    TOUCH_HOLD,     // 长按
    TOUCH_TAP       // 轻触
};

/**
 * 触摸事件结构
 */
struct TouchEvent {
    TouchEventType type;
    unsigned long timestamp;
    int pressure;           // 压力值 (0-4095)
    unsigned long duration; // 触摸持续时间 (ms)
};

/**
 * 触摸回调函数类型
 */
typedef void (*TouchCallback)(const TouchEvent& event);

/**
 * 触摸传感器控制器类
 */
class TouchSensor {
private:
    // 硬件配置
    int sensorPin;
    int adcResolution;
    
    // 触摸检测参数
    int touchThreshold;      // 触摸阈值
    int releaseThreshold;    // 释放阈值
    unsigned long debounceTime;    // 防抖时间 (ms)
    unsigned long holdTime;        // 长按时间 (ms)
    
    // 状态变量
    bool isTouched;
    bool lastTouchState;
    unsigned long touchStartTime;
    unsigned long lastReadTime;
    int lastRawValue;
    int filteredValue;
    
    // 回调函数
    TouchCallback touchCallback;
    
    // 统计信息
    unsigned long totalTouches;
    unsigned long totalHolds;
    unsigned long lastTouchTime;
    
    // 私有方法
    int readRawValue();
    int applyFilter(int rawValue);
    bool detectTouch(int value);
    void processTouch();
    void triggerEvent(TouchEventType type, int pressure, unsigned long duration = 0);

public:
    /**
     * 构造函数
     * @param pin 触摸传感器引脚
     */
    TouchSensor(int pin = TOUCH_SENSOR_PIN);
    
    /**
     * 析构函数
     */
    ~TouchSensor();
    
    /**
     * 初始化触摸传感器
     * @return 初始化是否成功
     */
    bool initialize();
    
    /**
     * 更新触摸状态（应在主循环中调用）
     */
    void update();
    
    /**
     * 设置触摸回调函数
     * @param callback 回调函数指针
     */
    void setTouchCallback(TouchCallback callback);
    
    /**
     * 设置触摸阈值
     * @param threshold 触摸阈值 (0-4095)
     */
    void setTouchThreshold(int threshold);
    
    /**
     * 设置释放阈值
     * @param threshold 释放阈值 (0-4095)
     */
    void setReleaseThreshold(int threshold);
    
    /**
     * 设置防抖时间
     * @param time 防抖时间 (ms)
     */
    void setDebounceTime(unsigned long time);
    
    /**
     * 设置长按时间
     * @param time 长按时间 (ms)
     */
    void setHoldTime(unsigned long time);
    
    /**
     * 获取当前触摸状态
     * @return 是否正在被触摸
     */
    bool isTouchActive() const;
    
    /**
     * 获取当前压力值
     * @return 压力值 (0-4095)
     */
    int getCurrentPressure() const;
    
    /**
     * 获取滤波后的压力值
     * @return 滤波后的压力值
     */
    int getFilteredPressure() const;
    
    /**
     * 获取触摸持续时间
     * @return 当前触摸持续时间 (ms)，未触摸时返回0
     */
    unsigned long getTouchDuration() const;
    
    /**
     * 校准触摸传感器
     * 在无触摸状态下调用以设置基准值
     */
    void calibrate();
    
    /**
     * 重置统计信息
     */
    void resetStatistics();
    
    /**
     * 获取总触摸次数
     * @return 总触摸次数
     */
    unsigned long getTotalTouches() const;
    
    /**
     * 获取总长按次数
     * @return 总长按次数
     */
    unsigned long getTotalHolds() const;
    
    /**
     * 获取最后触摸时间
     * @return 最后触摸时间戳
     */
    unsigned long getLastTouchTime() const;
    
    /**
     * 获取系统信息
     * @return JSON格式的系统信息
     */
    String getSystemInfo() const;
    
    /**
     * 启用/禁用触摸检测
     * @param enabled 是否启用
     */
    void setEnabled(bool enabled);
    
    /**
     * 设置触摸灵敏度
     * @param sensitivity 灵敏度 (0.5-2.0)
     */
    void setTouchSensitivity(float sensitivity);
    
    /**
     * 设置长按阈值
     * @param threshold 长按阈值 (ms)
     */
    void setHoldThreshold(unsigned long threshold);
    
    /**
     * 启用触摸反馈
     * @param enabled 是否启用反馈
     */
    void enableTouchFeedback(bool enabled);
    
    /**
     * 检查触摸传感器是否正常工作
     * @return 传感器是否正常
     */
    bool isWorking() const;
};

#endif // TOUCH_SENSOR_H