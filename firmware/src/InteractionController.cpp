/**
 * AI智能植物养护机器人 - 交互控制器实现
 */

#include "InteractionController.h"

// 静态成员初始化
InteractionController* InteractionController::instance = nullptr;

// 提醒间隔常量
const unsigned long ALERT_BLINK_INTERVAL = 2000;    // 提醒闪烁间隔 (ms)
const unsigned long TOUCH_RESPONSE_COOLDOWN = 1000; // 触摸响应冷却时间 (ms)
const int MAX_TOUCH_RESPONSES = 5;                  // 最大连续触摸响应次数

// 提醒回调函数
void alertStartCallback(const AlertInfo& alert);
void alertStopCallback(const AlertInfo& alert);

InteractionController::InteractionController()
    : currentMode(InteractionMode::NORMAL)
    , isEnabled(true)
    , isSoundEnabled(true)
    , isLEDEnabled(true)
    , isTouchEnabled(true)
    , isAlerting(false)
    , alertStartTime(0)
    , lastAlertTime(0)
    , currentAlert(InteractionEvent::PLANT_HEALTHY)
    , lastTouchResponse(0)
    , touchResponseCount(0) {
    
    // 设置静态实例指针
    instance = this;
}

InteractionController::~InteractionController() {
    instance = nullptr;
}

bool InteractionController::initialize() {
    DEBUG_PRINTLN("InteractionController: 初始化交互控制器...");
    
    // 初始化LED控制器
    if (!ledController.initialize()) {
        DEBUG_PRINTLN("InteractionController: LED控制器初始化失败");
        return false;
    }
    
    // 初始化音效控制器
    if (!soundController.initialize()) {
        DEBUG_PRINTLN("InteractionController: 音效控制器初始化失败");
        return false;
    }
    
    // 初始化触摸传感器
    if (!touchSensor.initialize()) {
        DEBUG_PRINTLN("InteractionController: 触摸传感器初始化失败");
        return false;
    }
    
    // 初始化提醒管理器
    if (!alertManager.initialize()) {
        DEBUG_PRINTLN("InteractionController: 提醒管理器初始化失败");
        return false;
    }
    
    // 设置触摸回调
    touchSensor.setTouchCallback(touchCallbackWrapper);
    
    // 设置提醒回调
    alertManager.setAlertCallback(alertStartCallback);
    alertManager.setStopCallback(alertStopCallback);
    
    // 显示系统就绪状态
    showSystemReady();
    
    DEBUG_PRINTLN("InteractionController: 初始化完成");
    return true;
}

void InteractionController::update() {
    if (!isEnabled) {
        return;
    }
    
    // 更新各个组件
    if (isLEDEnabled) {
        ledController.update();
    }
    
    if (isSoundEnabled) {
        soundController.update();
    }
    
    if (isTouchEnabled) {
        touchSensor.update();
    }
    
    // 更新提醒管理器
    alertManager.update();
    
    // 更新提醒模式
    if (isAlerting) {
        updateAlertMode();
    }
}

void InteractionController::triggerEvent(InteractionEvent event) {
    if (!isEnabled) {
        return;
    }
    
    DEBUG_PRINTF("InteractionController: 触发交互事件: %d\n", (int)event);
    
    switch (event) {
        case InteractionEvent::PLANT_HEALTHY:
            stopAlert();
            if (isLEDEnabled) {
                ledController.setColor(0, 255, 0); // 绿色
                ledController.setAnimation(AnimationType::BREATHING);
            }
            if (isSoundEnabled) {
                soundController.playSound(SoundType::HAPPY);
            }
            break;
            
        case InteractionEvent::NEEDS_WATER:
            startAlert(event);
            if (isLEDEnabled) {
                ledController.setColor(255, 255, 0); // 黄色
                ledController.setAnimation(AnimationType::BLINKING);
            }
            if (isSoundEnabled) {
                soundController.playSound(SoundType::WATER_NEEDED);
            }
            break;
            
        case InteractionEvent::NEEDS_LIGHT:
            startAlert(event);
            if (isLEDEnabled) {
                ledController.setColor(255, 0, 0); // 红色
                ledController.setAnimation(AnimationType::PULSE);
            }
            if (isSoundEnabled) {
                soundController.playSound(SoundType::LIGHT_NEEDED);
            }
            break;
            
        case InteractionEvent::PROBLEM_SOLVED:
            stopAlert();
            playCelebration();
            break;
            
        case InteractionEvent::TOUCH_RESPONSE:
            playInteractionSequence(event);
            break;
            
        case InteractionEvent::LOW_BATTERY:
            if (isLEDEnabled) {
                ledController.setColor(255, 165, 0); // 橙色
                ledController.setAnimation(AnimationType::BLINKING);
            }
            if (isSoundEnabled) {
                soundController.playSound(SoundType::LOW_BATTERY);
            }
            break;
            
        case InteractionEvent::ERROR_OCCURRED:
            showError();
            break;
            
        case InteractionEvent::SYSTEM_READY:
            showSystemReady();
            break;
    }
}

void InteractionController::setMode(InteractionMode mode) {
    if (currentMode == mode) {
        return;
    }
    
    DEBUG_PRINTF("InteractionController: 切换交互模式: %d -> %d\n", (int)currentMode, (int)mode);
    
    InteractionMode previousMode = currentMode;
    currentMode = mode;
    
    switch (mode) {
        case InteractionMode::NORMAL:
            if (previousMode == InteractionMode::SLEEP) {
                exitSleepMode();
            }
            break;
            
        case InteractionMode::ALERT:
            // 提醒模式由具体事件触发
            break;
            
        case InteractionMode::CELEBRATION:
            playCelebration();
            break;
            
        case InteractionMode::ERROR:
            showError();
            break;
            
        case InteractionMode::SLEEP:
            enterSleepMode();
            break;
    }
}

InteractionMode InteractionController::getCurrentMode() const {
    return currentMode;
}

void InteractionController::setEnabled(bool enabled) {
    isEnabled = enabled;
    if (!enabled) {
        stopAlert();
        ledController.turnOff();
        soundController.stopAll();
    }
    DEBUG_PRINTF("InteractionController: 交互功能%s\n", enabled ? "启用" : "禁用");
}

void InteractionController::setSoundEnabled(bool enabled) {
    isSoundEnabled = enabled;
    if (!enabled) {
        soundController.stopAll();
    }
    DEBUG_PRINTF("InteractionController: 音效%s\n", enabled ? "启用" : "禁用");
}

void InteractionController::setLEDEnabled(bool enabled) {
    isLEDEnabled = enabled;
    if (!enabled) {
        ledController.turnOff();
    }
    DEBUG_PRINTF("InteractionController: LED%s\n", enabled ? "启用" : "禁用");
}

void InteractionController::setTouchEnabled(bool enabled) {
    isTouchEnabled = enabled;
    touchSensor.setEnabled(enabled);
    DEBUG_PRINTF("InteractionController: 触摸检测%s\n", enabled ? "启用" : "禁用");
}

void InteractionController::startAlert(InteractionEvent event) {
    isAlerting = true;
    alertStartTime = millis();
    lastAlertTime = alertStartTime;
    currentAlert = event;
    setMode(InteractionMode::ALERT);
    
    DEBUG_PRINTF("InteractionController: 开始提醒序列，事件: %d\n", (int)event);
}

void InteractionController::stopAlert() {
    if (isAlerting) {
        isAlerting = false;
        alertStartTime = 0;
        lastAlertTime = 0;
        
        if (currentMode == InteractionMode::ALERT) {
            setMode(InteractionMode::NORMAL);
        }
        
        DEBUG_PRINTLN("InteractionController: 停止提醒序列");
    }
}

bool InteractionController::isAlertActive() const {
    return isAlerting;
}

void InteractionController::playCelebration() {
    DEBUG_PRINTLN("InteractionController: 播放庆祝动画");
    
    if (isLEDEnabled) {
        ledController.setAnimation(AnimationType::RAINBOW);
        ledController.setBrightness(255);
    }
    
    if (isSoundEnabled) {
        soundController.playMelody({
            {TONE_HAPPY, 200},
            {TONE_HAPPY * 1.2, 200},
            {TONE_HAPPY * 1.5, 300}
        });
    }
    
    // 3秒后恢复正常状态
    // 注意：这里应该使用非阻塞方式，实际实现中可能需要状态机
}

void InteractionController::showSystemReady() {
    DEBUG_PRINTLN("InteractionController: 显示系统就绪状态");
    
    if (isLEDEnabled) {
        ledController.setColor(0, 255, 0); // 绿色
        ledController.setAnimation(AnimationType::BREATHING);
        ledController.setBrightness(128);
    }
    
    if (isSoundEnabled) {
        soundController.playSound(SoundType::HAPPY);
    }
}

void InteractionController::showError() {
    DEBUG_PRINTLN("InteractionController: 显示错误状态");
    
    if (isLEDEnabled) {
        ledController.setColor(255, 0, 255); // 紫色
        ledController.setAnimation(AnimationType::BLINKING);
    }
    
    if (isSoundEnabled) {
        soundController.playSound(SoundType::ERROR);
    }
    
    setMode(InteractionMode::ERROR);
}

void InteractionController::enterSleepMode() {
    DEBUG_PRINTLN("InteractionController: 进入休眠模式");
    
    // 关闭LED
    if (isLEDEnabled) {
        ledController.turnOff();
    }
    
    // 停止所有音效
    if (isSoundEnabled) {
        soundController.stopAll();
    }
    
    // 停止提醒
    stopAlert();
}

void InteractionController::exitSleepMode() {
    DEBUG_PRINTLN("InteractionController: 退出休眠模式");
    
    // 恢复正常状态显示
    showSystemReady();
}

void InteractionController::handleTouchEvent(const TouchEvent& event) {
    if (!isTouchEnabled || !isEnabled) {
        return;
    }
    
    unsigned long currentTime = millis();
    
    DEBUG_PRINTF("InteractionController: 处理触摸事件，类型: %d，压力: %d\n", 
                 (int)event.type, event.pressure);
    
    switch (event.type) {
        case TouchEventType::TOUCH_START:
            // 触摸开始，可以提供即时反馈
            break;
            
        case TouchEventType::TOUCH_TAP:
            // 轻触处理
            if (currentTime - lastTouchResponse > TOUCH_RESPONSE_COOLDOWN) {
                if (alertManager.isCurrentlyAlerting()) {
                    // 如果正在主动提醒，确认提醒
                    acknowledgeActiveAlert();
                    triggerEvent(InteractionEvent::PROBLEM_SOLVED);
                } else if (isAlerting) {
                    // 如果正在普通提醒，停止提醒
                    stopAlert();
                    triggerEvent(InteractionEvent::PROBLEM_SOLVED);
                } else {
                    // 正常触摸响应
                    triggerEvent(InteractionEvent::TOUCH_RESPONSE);
                }
                lastTouchResponse = currentTime;
                touchResponseCount = 0;
            } else {
                touchResponseCount++;
                if (touchResponseCount < MAX_TOUCH_RESPONSES) {
                    triggerEvent(InteractionEvent::TOUCH_RESPONSE);
                }
            }
            break;
            
        case TouchEventType::TOUCH_HOLD:
            // 长按处理 - 可以用于特殊功能
            if (event.duration > 3000) {
                // 超长按 - 可以触发校准或重置
                calibrateTouch();
            }
            break;
            
        case TouchEventType::TOUCH_END:
            // 触摸结束
            break;
    }
}

void InteractionController::playInteractionSequence(InteractionEvent event) {
    if (event == InteractionEvent::TOUCH_RESPONSE) {
        // 触摸响应序列
        if (isLEDEnabled) {
            ledController.setColor(255, 255, 255); // 白色
            ledController.setAnimation(AnimationType::PULSE);
        }
        
        if (isSoundEnabled) {
            soundController.playSound(SoundType::TOUCH_RESPONSE);
        }
    }
}

void InteractionController::updateAlertMode() {
    unsigned long currentTime = millis();
    
    // 检查是否需要重复提醒
    if (currentTime - lastAlertTime > ALERT_BLINK_INTERVAL) {
        lastAlertTime = currentTime;
        
        // 重新触发提醒效果
        switch (currentAlert) {
            case InteractionEvent::NEEDS_WATER:
                if (isLEDEnabled) {
                    ledController.setAnimation(AnimationType::BLINKING);
                }
                break;
                
            case InteractionEvent::NEEDS_LIGHT:
                if (isLEDEnabled) {
                    ledController.setAnimation(AnimationType::PULSE);
                }
                break;
                
            default:
                break;
        }
    }
}

void InteractionController::stopCurrentAlert() {
    stopAlert();
}

// 静态回调函数
void InteractionController::touchCallbackWrapper(const TouchEvent& event) {
    if (instance != nullptr) {
        instance->handleTouchEvent(event);
    }
}

LEDController& InteractionController::getLEDController() {
    return ledController;
}

SoundController& InteractionController::getSoundController() {
    return soundController;
}

TouchSensor& InteractionController::getTouchSensor() {
    return touchSensor;
}

AlertManager& InteractionController::getAlertManager() {
    return alertManager;
}

void InteractionController::startActiveAlert(AlertType type, bool isUrgent) {
    DEBUG_PRINTF("InteractionController: 开始主动提醒，类型: %d\n", (int)type);
    alertManager.reportAbnormalState(type, isUrgent);
}

void InteractionController::stopActiveAlert() {
    DEBUG_PRINTLN("InteractionController: 停止主动提醒");
    alertManager.reportNormalState();
}

void InteractionController::acknowledgeActiveAlert() {
    DEBUG_PRINTLN("InteractionController: 确认主动提醒");
    alertManager.acknowledgeAlert();
}

void InteractionController::snoozeActiveAlert(unsigned long duration) {
    DEBUG_PRINTF("InteractionController: 暂停主动提醒 %lu ms\n", duration);
    alertManager.snoozeAlert(duration);
}

void InteractionController::calibrateTouch() {
    DEBUG_PRINTLN("InteractionController: 开始触摸传感器校准");
    touchSensor.calibrate();
    
    // 提供校准完成反馈
    if (isLEDEnabled) {
        ledController.setColor(0, 0, 255); // 蓝色
        ledController.setAnimation(AnimationType::BLINKING);
    }
    
    if (isSoundEnabled) {
        soundController.playMelody({
            {1000, 100},
            {1200, 100},
            {1000, 100}
        });
    }
}

String InteractionController::getTouchStatistics() const {
    return touchSensor.getSystemInfo();
}

void InteractionController::resetStatistics() {
    touchSensor.resetStatistics();
    DEBUG_PRINTLN("InteractionController: 统计信息已重置");
}

String InteractionController::getSystemInfo() const {
    String info = "{\n";
    info += "  \"controller\": \"InteractionController\",\n";
    info += "  \"mode\": " + String((int)currentMode) + ",\n";
    info += "  \"enabled\": " + String(isEnabled ? "true" : "false") + ",\n";
    info += "  \"soundEnabled\": " + String(isSoundEnabled ? "true" : "false") + ",\n";
    info += "  \"ledEnabled\": " + String(isLEDEnabled ? "true" : "false") + ",\n";
    info += "  \"touchEnabled\": " + String(isTouchEnabled ? "true" : "false") + ",\n";
    info += "  \"isAlerting\": " + String(isAlerting ? "true" : "false") + ",\n";
    info += "  \"currentAlert\": " + String((int)currentAlert) + ",\n";
    info += "  \"touchResponses\": " + String(touchResponseCount) + ",\n";
    info += "  \"hardwareWorking\": " + String(isHardwareWorking() ? "true" : "false") + "\n";
    info += "}";
    return info;
}

bool InteractionController::isHardwareWorking() const {
    return ledController.isWorking() && 
           soundController.isWorking() && 
           touchSensor.isWorking() &&
           alertManager.isWorking();
}

// 提醒回调函数实现
void alertStartCallback(const AlertInfo& alert) {
    if (InteractionController::instance != nullptr) {
        // 根据提醒类型触发相应的交互事件
        switch (alert.type) {
            case AlertType::NEEDS_WATER:
                InteractionController::instance->triggerEvent(InteractionEvent::NEEDS_WATER);
                break;
            case AlertType::NEEDS_LIGHT:
                InteractionController::instance->triggerEvent(InteractionEvent::NEEDS_LIGHT);
                break;
            case AlertType::LOW_BATTERY:
                InteractionController::instance->triggerEvent(InteractionEvent::LOW_BATTERY);
                break;
            case AlertType::SENSOR_ERROR:
            case AlertType::CRITICAL:
                InteractionController::instance->triggerEvent(InteractionEvent::ERROR_OCCURRED);
                break;
            default:
                break;
        }
    }
}

void alertStopCallback(const AlertInfo& alert) {
    if (InteractionController::instance != nullptr) {
        // 停止提醒时恢复正常状态
        InteractionController::instance->triggerEvent(InteractionEvent::PLANT_HEALTHY);
    }
}
/**
 * 指示配置模式
 */
void InteractionController::indicateConfigurationMode() {
    // 蓝色慢闪表示配置模式
    ledController.setColor(0, 0, 255);
    ledController.setBrightness(128);
    ledController.setBlinkPattern(1000, 1000); // 1秒开，1秒关
}

/**
 * 显示健康状态
 */
void InteractionController::showHealthyState() {
    ledController.setColor(0, 255, 0); // 绿色
    ledController.setBrightness(150);
    ledController.turnOn();
}

/**
 * 显示需要浇水状态
 */
void InteractionController::showNeedsWaterState() {
    ledController.setColor(255, 255, 0); // 黄色
    ledController.setBrightness(200);
    ledController.turnOn();
}

/**
 * 显示需要光照状态
 */
void InteractionController::showNeedsLightState() {
    ledController.setColor(255, 165, 0); // 橙色
    ledController.setBrightness(200);
    ledController.turnOn();
}

/**
 * 显示危急状态
 */
void InteractionController::showCriticalState() {
    ledController.setColor(255, 0, 0); // 红色
    ledController.setBrightness(255);
    ledController.setBlinkPattern(500, 500); // 快闪
}

/**
 * 显示未知状态
 */
void InteractionController::showUnknownState() {
    ledController.setColor(128, 128, 128); // 灰色
    ledController.setBrightness(100);
    ledController.turnOn();
}