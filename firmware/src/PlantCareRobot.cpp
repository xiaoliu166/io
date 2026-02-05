/**
 * AI智能植物养护机器人 - 主控制类实现
 */

#include "PlantCareRobot.h"

PlantCareRobot::PlantCareRobot()
    : currentMode(SystemMode::INITIALIZING)
    , isInitialized(false)
    , isFirstBoot(true)
    , lastDataCollection(0)
    , lastHeartbeat(0)
    , errorCount(0)
    , lastError("") {
}

PlantCareRobot::~PlantCareRobot() {
    // 清理资源
}

bool PlantCareRobot::initialize() {
    DEBUG_PRINTLN("PlantCareRobot: 开始初始化系统...");
    
    // 初始化传感器管理器
    if (!sensorManager.initialize()) {
        handleError("传感器管理器初始化失败");
        return false;
    }
    DEBUG_PRINTLN("✓ 传感器管理器初始化成功");
    
    // 初始化数据采集管理器
    if (!dataCollectionManager.initialize(&sensorManager)) {
        handleError("数据采集管理器初始化失败");
        return false;
    }
    DEBUG_PRINTLN("✓ 数据采集管理器初始化成功");
    
    // 初始化状态管理器
    if (!stateManager.initialize()) {
        handleError("状态管理器初始化失败");
        return false;
    }
    DEBUG_PRINTLN("✓ 状态管理器初始化成功");
    
    // 初始化交互控制器
    if (!interactionController.initialize()) {
        handleError("交互控制器初始化失败");
        return false;
    }
    DEBUG_PRINTLN("✓ 交互控制器初始化成功");
    
    // 系统初始化完成
    isInitialized = true;
    currentMode = SystemMode::NORMAL;
    lastHeartbeat = millis();
    
    // 显示系统就绪状态
    interactionController.triggerEvent(InteractionEvent::SYSTEM_READY);
    
    DEBUG_PRINTLN("PlantCareRobot: 系统初始化完成");
    return true;
}

void PlantCareRobot::update() {
    if (!isInitialized) {
        return;
    }
    
    unsigned long currentTime = millis();
    
    // 更新心跳
    lastHeartbeat = currentTime;
    
    // 根据当前模式执行相应逻辑
    switch (currentMode) {
        case SystemMode::NORMAL:
            // 正常运行模式
            performDataCollection();
            updateSystemState();
            handleAlerts();
            break;
            
        case SystemMode::CONFIGURATION:
            // 配置模式 - 暂时不实现
            break;
            
        case SystemMode::LOW_POWER:
            // 低功耗模式 - 减少更新频率
            if (currentTime - lastDataCollection > DATA_COLLECTION_INTERVAL * 2) {
                performDataCollection();
            }
            break;
            
        case SystemMode::ERROR:
            // 错误模式 - 尝试恢复
            if (checkSystemHealth()) {
                resumeNormalMode();
            }
            break;
            
        case SystemMode::OFFLINE:
            // 离线模式 - 仅本地功能
            performDataCollection();
            updateSystemState();
            handleAlerts();
            break;
            
        case SystemMode::INITIALIZING:
            // 初始化中 - 不应该到达这里
            break;
    }
    
    // 更新交互控制器
    interactionController.update();
    
    // 执行系统维护
    performMaintenance();
}

void PlantCareRobot::performDataCollection() {
    unsigned long currentTime = millis();
    
    // 检查是否到了数据采集时间
    if (currentTime - lastDataCollection >= DATA_COLLECTION_INTERVAL) {
        DEBUG_PRINTLN("PlantCareRobot: 执行数据采集");
        
        // 执行数据采集
        dataCollectionManager.collectData();
        lastDataCollection = currentTime;
        
        // 获取最新数据并更新状态
        SensorData latestData = dataCollectionManager.getLatestData();
        stateManager.updateState(latestData);
    }
}

void PlantCareRobot::updateSystemState() {
    // 获取当前植物状态
    PlantStatus currentStatus = stateManager.getCurrentStatus();
    
    // 根据状态触发相应的交互事件
    static PlantState lastState = PlantState::HEALTHY;
    
    if (currentStatus.state != lastState) {
        DEBUG_PRINTF("PlantCareRobot: 植物状态变化: %d -> %d\n", (int)lastState, (int)currentStatus.state);
        
        switch (currentStatus.state) {
            case PlantState::HEALTHY:
                interactionController.triggerEvent(InteractionEvent::PLANT_HEALTHY);
                break;
                
            case PlantState::NEEDS_WATER:
                interactionController.triggerEvent(InteractionEvent::NEEDS_WATER);
                break;
                
            case PlantState::NEEDS_LIGHT:
                interactionController.triggerEvent(InteractionEvent::NEEDS_LIGHT);
                break;
                
            case PlantState::CRITICAL:
                // 严重状态，同时需要水和光
                if (currentStatus.soilMoisture < MOISTURE_THRESHOLD) {
                    interactionController.triggerEvent(InteractionEvent::NEEDS_WATER);
                } else {
                    interactionController.triggerEvent(InteractionEvent::NEEDS_LIGHT);
                }
                break;
        }
        
        lastState = currentStatus.state;
    }
}

void PlantCareRobot::handleAlerts() {
    // 获取当前植物状态
    PlantStatus currentStatus = stateManager.getCurrentStatus();
    
    if (currentStatus.needsAttention) {
        // 需要注意，报告异常状态给提醒管理器
        AlertType alertType = AlertType::NONE;
        
        switch (currentStatus.state) {
            case PlantState::NEEDS_WATER:
                alertType = AlertType::NEEDS_WATER;
                break;
                
            case PlantState::NEEDS_LIGHT:
                alertType = AlertType::NEEDS_LIGHT;
                break;
                
            case PlantState::CRITICAL:
                alertType = AlertType::CRITICAL;
                break;
                
            default:
                break;
        }
        
        if (alertType != AlertType::NONE) {
            // 严重状态标记为紧急
            bool isUrgent = (currentStatus.state == PlantState::CRITICAL);
            interactionController.startActiveAlert(alertType, isUrgent);
        }
    } else {
        // 状态正常，停止提醒
        interactionController.stopActiveAlert();
    }
}

void PlantCareRobot::performMaintenance() {
    // 执行系统维护任务
    static unsigned long lastMaintenance = 0;
    unsigned long currentTime = millis();
    
    // 每分钟执行一次维护
    if (currentTime - lastMaintenance > 60000) {
        lastMaintenance = currentTime;
        
        // 检查系统健康状态
        if (!checkSystemHealth()) {
            errorCount++;
            if (errorCount > 5) {
                enterErrorMode();
            }
        } else {
            errorCount = 0;
        }
    }
}

bool PlantCareRobot::checkSystemHealth() {
    // 检查各个组件是否正常工作
    if (!sensorManager.isWorking()) {
        handleError("传感器系统异常");
        return false;
    }
    
    if (!interactionController.isHardwareWorking()) {
        handleError("交互硬件异常");
        return false;
    }
    
    return true;
}

void PlantCareRobot::handleError(const String& error) {
    lastError = error;
    DEBUG_PRINTF("PlantCareRobot: 错误 - %s\n", error.c_str());
    
    // 触发错误交互事件
    interactionController.triggerEvent(InteractionEvent::ERROR_OCCURRED);
}

void PlantCareRobot::resetSystem() {
    DEBUG_PRINTLN("PlantCareRobot: 重置系统");
    
    // 重置各个组件
    errorCount = 0;
    lastError = "";
    
    // 恢复正常模式
    currentMode = SystemMode::NORMAL;
    interactionController.setMode(InteractionMode::NORMAL);
}

SystemMode PlantCareRobot::getCurrentMode() const {
    return currentMode;
}

void PlantCareRobot::setMode(SystemMode mode) {
    if (currentMode == mode) {
        return;
    }
    
    DEBUG_PRINTF("PlantCareRobot: 切换系统模式: %d -> %d\n", (int)currentMode, (int)mode);
    currentMode = mode;
    
    // 根据模式设置交互控制器
    switch (mode) {
        case SystemMode::NORMAL:
            interactionController.setMode(InteractionMode::NORMAL);
            break;
            
        case SystemMode::LOW_POWER:
            interactionController.setMode(InteractionMode::SLEEP);
            break;
            
        case SystemMode::ERROR:
            interactionController.setMode(InteractionMode::ERROR);
            break;
            
        default:
            break;
    }
}

PlantStatus PlantCareRobot::getCurrentPlantStatus() {
    return stateManager.getCurrentStatus();
}

SensorData PlantCareRobot::getLatestSensorData() {
    return dataCollectionManager.getLatestData();
}

void PlantCareRobot::handleTouchEvent() {
    DEBUG_PRINTLN("PlantCareRobot: 处理触摸事件");
    
    // 如果正在主动提醒，确认提醒
    if (interactionController.getAlertManager().isCurrentlyAlerting()) {
        interactionController.acknowledgeActiveAlert();
        interactionController.triggerEvent(InteractionEvent::PROBLEM_SOLVED);
    } else if (interactionController.isAlertActive()) {
        // 如果正在普通提醒，停止提醒
        interactionController.stopAlert();
        interactionController.triggerEvent(InteractionEvent::PROBLEM_SOLVED);
    } else {
        // 正常触摸响应
        interactionController.triggerEvent(InteractionEvent::TOUCH_RESPONSE);
    }
}

void PlantCareRobot::enterConfigurationMode() {
    setMode(SystemMode::CONFIGURATION);
    DEBUG_PRINTLN("PlantCareRobot: 进入配置模式");
}

void PlantCareRobot::enterLowPowerMode() {
    setMode(SystemMode::LOW_POWER);
    DEBUG_PRINTLN("PlantCareRobot: 进入低功耗模式");
}

void PlantCareRobot::enterErrorMode() {
    setMode(SystemMode::ERROR);
    DEBUG_PRINTLN("PlantCareRobot: 进入错误模式");
}

void PlantCareRobot::enterOfflineMode() {
    setMode(SystemMode::OFFLINE);
    DEBUG_PRINTLN("PlantCareRobot: 进入离线模式");
}

void PlantCareRobot::resumeNormalMode() {
    resetSystem();
    DEBUG_PRINTLN("PlantCareRobot: 恢复正常模式");
}

void PlantCareRobot::restart() {
    DEBUG_PRINTLN("PlantCareRobot: 重启系统");
    ESP.restart();
}

String PlantCareRobot::getSystemInfo() {
    String info = "{\n";
    info += "  \"device\": \"PlantCareRobot\",\n";
    info += "  \"version\": \"" + String(FIRMWARE_VERSION) + "\",\n";
    info += "  \"mode\": " + String((int)currentMode) + ",\n";
    info += "  \"initialized\": " + String(isInitialized ? "true" : "false") + ",\n";
    info += "  \"firstBoot\": " + String(isFirstBoot ? "true" : "false") + ",\n";
    info += "  \"uptime\": " + String(getUptime()) + ",\n";
    info += "  \"errorCount\": " + String(errorCount) + ",\n";
    info += "  \"lastError\": \"" + lastError + "\",\n";
    info += "  \"healthy\": " + String(isSystemHealthy() ? "true" : "false") + ",\n";
    info += "  \"plantStatus\": {\n";
    
    PlantStatus status = getCurrentPlantStatus();
    info += "    \"state\": " + String((int)status.state) + ",\n";
    info += "    \"soilMoisture\": " + String(status.soilMoisture) + ",\n";
    info += "    \"lightLevel\": " + String(status.lightLevel) + ",\n";
    info += "    \"temperature\": " + String(status.temperature) + ",\n";
    info += "    \"needsAttention\": " + String(status.needsAttention ? "true" : "false") + "\n";
    info += "  }\n";
    info += "}";
    
    return info;
}

String PlantCareRobot::getLastError() const {
    return lastError;
}

void PlantCareRobot::clearError() {
    lastError = "";
    errorCount = 0;
    DEBUG_PRINTLN("PlantCareRobot: 错误状态已清除");
}

bool PlantCareRobot::isFirstBootup() const {
    return isFirstBoot;
}

void PlantCareRobot::setFirstBoot(bool firstBoot) {
    isFirstBoot = firstBoot;
}

unsigned long PlantCareRobot::getUptime() const {
    return millis();
}

bool PlantCareRobot::isSystemHealthy() const {
    return errorCount == 0 && checkSystemHealth();
}
/**
 * 处理配置模式
 */
void PlantCareRobot::handleConfigurationMode() {
    // 在配置模式下，只处理配置相关的消息和交互
    interactionController.update();
    
    // 检查是否有配置消息需要处理
    // 这里可以添加处理来自移动应用的配置消息的逻辑
    
    // 保持配置模式指示
    static unsigned long lastIndicatorUpdate = 0;
    if (millis() - lastIndicatorUpdate > 1000) {
        interactionController.indicateConfigurationMode();
        lastIndicatorUpdate = millis();
    }
}

/**
 * 显示当前状态
 */
void PlantCareRobot::showCurrentStatus() {
    PlantStatus status = getCurrentPlantStatus();
    
    // 根据植物状态显示相应的LED颜色
    switch (status.state) {
        case PlantState::HEALTHY:
            interactionController.showHealthyState();
            break;
        case PlantState::NEEDS_WATER:
            interactionController.showNeedsWaterState();
            break;
        case PlantState::NEEDS_LIGHT:
            interactionController.showNeedsLightState();
            break;
        case PlantState::CRITICAL:
            interactionController.showCriticalState();
            break;
        default:
            interactionController.showUnknownState();
            break;
    }
}