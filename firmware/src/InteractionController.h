/**
 * AI智能植物养护机器人 - 交互控制器
 * 整合LED、音效和触摸传感器，提供统一的交互接口
 */

#ifndef INTERACTION_CONTROLLER_H
#define INTERACTION_CONTROLLER_H

#include <Arduino.h>
#include "LEDController.h"
#include "SoundController.h"
#include "TouchSensor.h"
#include "AlertManager.h"
#include "config.h"

/**
 * 交互模式
 */
enum class InteractionMode {
    NORMAL,         // 正常模式
    ALERT,          // 提醒模式
    CELEBRATION,    // 庆祝模式
    ERROR,          // 错误模式
    SLEEP           // 休眠模式
};

/**
 * 交互事件类型
 */
enum class InteractionEvent {
    PLANT_HEALTHY,      // 植物健康
    NEEDS_WATER,        // 需要浇水
    NEEDS_LIGHT,        // 需要光照
    PROBLEM_SOLVED,     // 问题解决
    TOUCH_RESPONSE,     // 触摸响应
    LOW_BATTERY,        // 低电量
    ERROR_OCCURRED,     // 发生错误
    SYSTEM_READY        // 系统就绪
};

/**
 * 交互控制器类
 */
class InteractionController {
private:
    // 硬件控制器
    LEDController ledController;
    SoundController soundController;
    TouchSensor touchSensor;
    AlertManager alertManager;
    
    // 状态变量
    InteractionMode currentMode;
    bool isEnabled;
    bool isSoundEnabled;
    bool isLEDEnabled;
    bool isTouchEnabled;
    
    // 提醒状态
    bool isAlerting;
    unsigned long alertStartTime;
    unsigned long lastAlertTime;
    InteractionEvent currentAlert;
    
    // 触摸处理
    unsigned long lastTouchResponse;
    int touchResponseCount;
    
    // 私有方法
    void handleTouchEvent(const TouchEvent& event);
    void playInteractionSequence(InteractionEvent event);
    void updateAlertMode();
    void stopCurrentAlert();
    
    // 静态回调函数
    static void touchCallbackWrapper(const TouchEvent& event);
    static InteractionController* instance;

public:
    /**
     * 构造函数
     */
    InteractionController();
    
    /**
     * 析构函数
     */
    ~InteractionController();
    
    /**
     * 初始化交互控制器
     * @return 初始化是否成功
     */
    bool initialize();
    
    /**
     * 更新交互状态（应在主循环中调用）
     */
    void update();
    
    /**
     * 触发交互事件
     * @param event 交互事件类型
     */
    void triggerEvent(InteractionEvent event);
    
    /**
     * 设置交互模式
     * @param mode 交互模式
     */
    void setMode(InteractionMode mode);
    
    /**
     * 获取当前交互模式
     * @return 当前交互模式
     */
    InteractionMode getCurrentMode() const;
    
    /**
     * 启用/禁用交互功能
     * @param enabled 是否启用
     */
    void setEnabled(bool enabled);
    
    /**
     * 启用/禁用音效
     * @param enabled 是否启用音效
     */
    void setSoundEnabled(bool enabled);
    
    /**
     * 启用/禁用LED
     * @param enabled 是否启用LED
     */
    void setLEDEnabled(bool enabled);
    
    /**
     * 启用/禁用触摸检测
     * @param enabled 是否启用触摸检测
     */
    void setTouchEnabled(bool enabled);
    
    /**
     * 开始提醒序列
     * @param event 提醒事件类型
     */
    void startAlert(InteractionEvent event);
    
    /**
     * 停止提醒序列
     */
    void stopAlert();
    
    /**
     * 检查是否正在提醒
     * @return 是否正在提醒
     */
    bool isAlertActive() const;
    
    /**
     * 播放庆祝动画
     */
    void playCelebration();
    
    /**
     * 显示系统就绪状态
     */
    void showSystemReady();
    
    /**
     * 显示错误状态
     */
    void showError();
    
    /**
     * 进入休眠模式
     */
    void enterSleepMode();
    
    /**
     * 退出休眠模式
     */
    void exitSleepMode();
    
    /**
     * 获取LED控制器引用
     * @return LED控制器引用
     */
    LEDController& getLEDController();
    
    /**
     * 获取音效控制器引用
     * @return 音效控制器引用
     */
    SoundController& getSoundController();
    
    /**
     * 获取触摸传感器引用
     * @return 触摸传感器引用
     */
    TouchSensor& getTouchSensor();
    
    /**
     * 获取提醒管理器引用
     * @return 提醒管理器引用
     */
    AlertManager& getAlertManager();
    
    /**
     * 开始主动提醒
     * @param type 提醒类型
     * @param isUrgent 是否紧急
     */
    void startActiveAlert(AlertType type, bool isUrgent = false);
    
    /**
     * 停止主动提醒
     */
    void stopActiveAlert();
    
    /**
     * 用户确认提醒
     */
    void acknowledgeActiveAlert();
    
    /**
     * 暂停提醒
     * @param duration 暂停时长 (ms)
     */
    void snoozeActiveAlert(unsigned long duration = 0);
    
    /**
     * 校准触摸传感器
     */
    void calibrateTouch();
    
    /**
     * 获取触摸统计信息
     * @return 触摸统计信息
     */
    String getTouchStatistics() const;
    
    /**
     * 重置交互统计
     */
    void resetStatistics();
    
    /**
     * 获取系统信息
     * @return JSON格式的系统信息
     */
    String getSystemInfo() const;
    
    /**
     * 检查所有硬件是否正常工作
     * @return 硬件是否正常
     */
    bool isHardwareWorking() const;
};

#endif // INTERACTION_CONTROLLER_H