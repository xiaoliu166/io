/**
 * AI智能植物养护机器人 - 音效控制器实现
 */

#include "SoundController.h"

// 预定义音效序列
Tone SoundController::happyTones[] = {
    Tone(NOTE_C5, 200, 50),
    Tone(NOTE_E5, 200, 50),
    Tone(NOTE_G5, 300, 0)
};

Tone SoundController::waterNeededTones[] = {
    Tone(NOTE_A4, 300, 100),
    Tone(NOTE_F4, 300, 100),
    Tone(NOTE_A4, 300, 0)
};

Tone SoundController::lightNeededTones[] = {
    Tone(NOTE_G4, 250, 50),
    Tone(NOTE_E4, 250, 50),
    Tone(NOTE_C4, 400, 0)
};

Tone SoundController::touchResponseTones[] = {
    Tone(FREQ_BEEP, 100, 0)
};

Tone SoundController::errorTones[] = {
    Tone(FREQ_ERROR, 500, 100),
    Tone(FREQ_ERROR, 500, 0)
};

Tone SoundController::lowBatteryTones[] = {
    Tone(NOTE_D4, 200, 50),
    Tone(NOTE_D4, 200, 50),
    Tone(NOTE_D4, 200, 0)
};

Tone SoundController::startupTones[] = {
    Tone(NOTE_C4, 150, 50),
    Tone(NOTE_E4, 150, 50),
    Tone(NOTE_G4, 150, 50),
    Tone(NOTE_C5, 300, 0)
};

Tone SoundController::shutdownTones[] = {
    Tone(NOTE_C5, 150, 50),
    Tone(NOTE_G4, 150, 50),
    Tone(NOTE_E4, 150, 50),
    Tone(NOTE_C4, 300, 0)
};

Tone SoundController::successTones[] = {
    Tone(FREQ_SUCCESS, 150, 50),
    Tone(FREQ_SUCCESS * 1.2, 150, 0)
};

Tone SoundController::warningTones[] = {
    Tone(FREQ_ALERT, 200, 100),
    Tone(FREQ_ALERT, 200, 100),
    Tone(FREQ_ALERT, 200, 0)
};

Tone SoundController::notificationTones[] = {
    Tone(NOTE_A5, 100, 50),
    Tone(NOTE_C5, 200, 0)
};

Tone SoundController::beepShortTones[] = {
    Tone(FREQ_BEEP, 100, 0)
};

Tone SoundController::beepLongTones[] = {
    Tone(FREQ_BEEP, 500, 0)
};

Tone SoundController::melodySimpleTones[] = {
    Tone(NOTE_C4, 200, 50),
    Tone(NOTE_D4, 200, 50),
    Tone(NOTE_E4, 200, 50),
    Tone(NOTE_F4, 200, 50),
    Tone(NOTE_G4, 400, 0)
};

Tone SoundController::melodyComplexTones[] = {
    Tone(NOTE_C5, 150, 50),
    Tone(NOTE_G4, 150, 50),
    Tone(NOTE_E4, 150, 50),
    Tone(NOTE_A4, 150, 50),
    Tone(NOTE_B4, 150, 50),
    Tone(NOTE_C5, 300, 100),
    Tone(NOTE_G4, 150, 50),
    Tone(NOTE_C5, 300, 0)
};

/**
 * 构造函数
 */
SoundController::SoundController()
    : globalVolume(SPEAKER_VOLUME),
      soundEnabled(true),
      quietStartTime(0),
      quietEndTime(0),
      isQuietHours(false) {
    
    // 初始化状态
    status = {
        .isPlaying = false,
        .currentSound = SoundType::NONE,
        .currentTone = 0,
        .startTime = 0,
        .nextToneTime = 0,
        .isLooping = false,
        .volume = globalVolume,
        .isMuted = false
    };
    
    // 初始化当前序列
    currentSequence = {
        .tones = nullptr,
        .toneCount = 0,
        .loop = false,
        .volume = globalVolume,
        .name = ""
    };
}

/**
 * 析构函数
 */
SoundController::~SoundController() {
    stopSound();
}

/**
 * 初始化音效控制器
 */
bool SoundController::initialize() {
    DEBUG_PRINTLN("初始化音效控制器...");
    
    // 配置扬声器引脚
    pinMode(SPEAKER_PIN, OUTPUT);
    digitalWrite(SPEAKER_PIN, LOW);
    
    // 执行音效测试
    if (!performTest()) {
        DEBUG_PRINTLN("✗ 音效测试失败");
        return false;
    }
    
    DEBUG_PRINTLN("✓ 音效控制器初始化成功");
    return true;
}

/**
 * 更新音效播放
 */
void SoundController::update() {
    if (!status.isPlaying || !soundEnabled || status.isMuted) {
        return;
    }
    
    // 更新静音时段状态
    updateQuietHours();
    
    // 如果在静音时段，停止播放
    if (isInQuietHours()) {
        stopSound();
        return;
    }
    
    unsigned long currentTime = millis();
    
    // 检查是否到了播放下一个音调的时间
    if (currentTime >= status.nextToneTime) {
        // 如果当前音调播放完毕
        if (status.currentTone >= currentSequence.toneCount) {
            if (currentSequence.loop) {
                // 循环播放，重新开始
                status.currentTone = 0;
            } else {
                // 播放完毕，停止
                stopSound();
                return;
            }
        }
        
        // 播放当前音调
        Tone& tone = currentSequence.tones[status.currentTone];
        if (tone.frequency > 0) {
            playTone(tone.frequency, tone.duration);
        }
        
        // 计算下一个音调的播放时间
        status.nextToneTime = currentTime + tone.duration + tone.pause;
        status.currentTone++;
    }
}

/**
 * 播放音调
 */
void SoundController::playTone(uint16_t frequency, uint16_t duration) {
    if (!soundEnabled || status.isMuted || isInQuietHours()) {
        return;
    }
    
    // 使用PWM生成音调
    tone(SPEAKER_PIN, frequency, duration);
}

/**
 * 停止音调
 */
void SoundController::stopTone() {
    noTone(SPEAKER_PIN);
    digitalWrite(SPEAKER_PIN, LOW);
}

/**
 * 获取音效序列
 */
SoundSequence SoundController::getSoundSequence(SoundType soundType) {
    SoundSequence sequence;
    sequence.volume = globalVolume;
    sequence.loop = false;
    
    switch (soundType) {
        case SoundType::HAPPY:
            sequence.tones = happyTones;
            sequence.toneCount = sizeof(happyTones) / sizeof(Tone);
            sequence.name = "Happy";
            break;
            
        case SoundType::WATER_NEEDED:
            sequence.tones = waterNeededTones;
            sequence.toneCount = sizeof(waterNeededTones) / sizeof(Tone);
            sequence.name = "Water Needed";
            break;
            
        case SoundType::LIGHT_NEEDED:
            sequence.tones = lightNeededTones;
            sequence.toneCount = sizeof(lightNeededTones) / sizeof(Tone);
            sequence.name = "Light Needed";
            break;
            
        case SoundType::TOUCH_RESPONSE:
            sequence.tones = touchResponseTones;
            sequence.toneCount = sizeof(touchResponseTones) / sizeof(Tone);
            sequence.name = "Touch Response";
            break;
            
        case SoundType::ERROR:
            sequence.tones = errorTones;
            sequence.toneCount = sizeof(errorTones) / sizeof(Tone);
            sequence.name = "Error";
            break;
            
        case SoundType::LOW_BATTERY:
            sequence.tones = lowBatteryTones;
            sequence.toneCount = sizeof(lowBatteryTones) / sizeof(Tone);
            sequence.name = "Low Battery";
            break;
            
        case SoundType::STARTUP:
            sequence.tones = startupTones;
            sequence.toneCount = sizeof(startupTones) / sizeof(Tone);
            sequence.name = "Startup";
            break;
            
        case SoundType::SHUTDOWN:
            sequence.tones = shutdownTones;
            sequence.toneCount = sizeof(shutdownTones) / sizeof(Tone);
            sequence.name = "Shutdown";
            break;
            
        case SoundType::SUCCESS:
            sequence.tones = successTones;
            sequence.toneCount = sizeof(successTones) / sizeof(Tone);
            sequence.name = "Success";
            break;
            
        case SoundType::WARNING:
            sequence.tones = warningTones;
            sequence.toneCount = sizeof(warningTones) / sizeof(Tone);
            sequence.name = "Warning";
            break;
            
        case SoundType::NOTIFICATION:
            sequence.tones = notificationTones;
            sequence.toneCount = sizeof(notificationTones) / sizeof(Tone);
            sequence.name = "Notification";
            break;
            
        case SoundType::BEEP_SHORT:
            sequence.tones = beepShortTones;
            sequence.toneCount = sizeof(beepShortTones) / sizeof(Tone);
            sequence.name = "Beep Short";
            break;
            
        case SoundType::BEEP_LONG:
            sequence.tones = beepLongTones;
            sequence.toneCount = sizeof(beepLongTones) / sizeof(Tone);
            sequence.name = "Beep Long";
            break;
            
        case SoundType::MELODY_SIMPLE:
            sequence.tones = melodySimpleTones;
            sequence.toneCount = sizeof(melodySimpleTones) / sizeof(Tone);
            sequence.name = "Simple Melody";
            break;
            
        case SoundType::MELODY_COMPLEX:
            sequence.tones = melodyComplexTones;
            sequence.toneCount = sizeof(melodyComplexTones) / sizeof(Tone);
            sequence.name = "Complex Melody";
            break;
            
        default:
            sequence.tones = nullptr;
            sequence.toneCount = 0;
            sequence.name = "None";
            break;
    }
    
    return sequence;
}

/**
 * 计算音量
 */
uint8_t SoundController::calculateVolume(uint8_t baseVolume) {
    if (status.isMuted || !soundEnabled) {
        return 0;
    }
    
    // 简化的音量计算，实际应该根据硬件特性调整
    return (baseVolume * globalVolume) / 100;
}

/**
 * 更新静音时段状态
 */
void SoundController::updateQuietHours() {
    // 简化实现，实际应该获取当前时间并与设置的静音时段比较
    // 这里假设没有RTC，使用运行时间模拟
    unsigned long currentTime = millis();
    
    // 如果设置了静音时段
    if (quietStartTime != 0 && quietEndTime != 0) {
        // 简化的时间检查逻辑
        isQuietHours = false; // 默认不在静音时段
    }
}

// ============= 公共方法实现 =============

/**
 * 播放音效
 */
void SoundController::playSound(SoundType soundType, uint8_t volume) {
    if (!soundEnabled || status.isMuted || isInQuietHours()) {
        return;
    }
    
    // 停止当前播放的音效
    stopSound();
    
    // 获取音效序列
    currentSequence = getSoundSequence(soundType);
    if (currentSequence.tones == nullptr || currentSequence.toneCount == 0) {
        return;
    }
    
    // 设置音量
    if (volume != 255) {
        currentSequence.volume = volume;
    }
    
    // 开始播放
    status.isPlaying = true;
    status.currentSound = soundType;
    status.currentTone = 0;
    status.startTime = millis();
    status.nextToneTime = millis();
    status.isLooping = currentSequence.loop;
    status.volume = currentSequence.volume;
    
    DEBUG_PRINTF("播放音效: %s\n", currentSequence.name.c_str());
}

/**
 * 播放自定义音效序列
 */
void SoundController::playSequence(const SoundSequence& sequence) {
    if (!soundEnabled || status.isMuted || isInQuietHours()) {
        return;
    }
    
    stopSound();
    
    currentSequence = sequence;
    
    status.isPlaying = true;
    status.currentSound = SoundType::NONE; // 自定义序列
    status.currentTone = 0;
    status.startTime = millis();
    status.nextToneTime = millis();
    status.isLooping = sequence.loop;
    status.volume = sequence.volume;
    
    DEBUG_PRINTF("播放自定义音效序列: %s\n", sequence.name.c_str());
}

/**
 * 播放单个音调
 */
void SoundController::playTone(uint16_t frequency, uint16_t duration, uint8_t volume) {
    if (!soundEnabled || status.isMuted || isInQuietHours()) {
        return;
    }
    
    stopSound();
    playTone(frequency, duration);
    
    DEBUG_PRINTF("播放音调: %d Hz, %d ms\n", frequency, duration);
}

/**
 * 停止当前音效
 */
void SoundController::stopSound() {
    status.isPlaying = false;
    status.currentSound = SoundType::NONE;
    status.currentTone = 0;
    status.isLooping = false;
    
    stopTone();
}

/**
 * 设置全局音量
 */
void SoundController::setVolume(uint8_t volume) {
    globalVolume = constrain(volume, 0, 100);
    status.volume = globalVolume;
    
    DEBUG_PRINTF("设置音量: %d%%\n", globalVolume);
}

/**
 * 获取当前音量
 */
uint8_t SoundController::getVolume() const {
    return globalVolume;
}

/**
 * 静音
 */
void SoundController::mute() {
    status.isMuted = true;
    stopSound();
    DEBUG_PRINTLN("音效已静音");
}

/**
 * 取消静音
 */
void SoundController::unmute() {
    status.isMuted = false;
    DEBUG_PRINTLN("音效取消静音");
}

/**
 * 切换静音状态
 */
void SoundController::toggleMute() {
    if (status.isMuted) {
        unmute();
    } else {
        mute();
    }
}

/**
 * 检查是否静音
 */
bool SoundController::isMuted() const {
    return status.isMuted;
}

/**
 * 启用或禁用音效
 */
void SoundController::setSoundEnabled(bool enabled) {
    soundEnabled = enabled;
    if (!enabled) {
        stopSound();
    }
    
    DEBUG_PRINTF("音效%s\n", enabled ? "已启用" : "已禁用");
}

/**
 * 检查音效是否启用
 */
bool SoundController::isSoundEnabled() const {
    return soundEnabled;
}

/**
 * 设置静音时段
 */
void SoundController::setQuietHours(uint8_t startHour, uint8_t startMinute, uint8_t endHour, uint8_t endMinute) {
    // 简化实现，将时间转换为毫秒（假设从启动开始计算）
    quietStartTime = (startHour * 60 + startMinute) * 60 * 1000;
    quietEndTime = (endHour * 60 + endMinute) * 60 * 1000;
    
    DEBUG_PRINTF("设置静音时段: %02d:%02d - %02d:%02d\n", 
                 startHour, startMinute, endHour, endMinute);
}

/**
 * 检查是否在静音时段
 */
bool SoundController::isInQuietHours() const {
    return isQuietHours;
}

/**
 * 播放植物状态音效
 */
void SoundController::playPlantStateSound(PlantState state) {
    switch (state) {
        case PlantState::HEALTHY:
            playSound(SoundType::HAPPY);
            break;
        case PlantState::NEEDS_WATER:
            playSound(SoundType::WATER_NEEDED);
            break;
        case PlantState::NEEDS_LIGHT:
            playSound(SoundType::LIGHT_NEEDED);
            break;
        case PlantState::CRITICAL:
            playSound(SoundType::WARNING);
            break;
        default:
            playSound(SoundType::NOTIFICATION);
            break;
    }
}

/**
 * 播放触摸反馈音效
 */
void SoundController::playTouchFeedback() {
    playSound(SoundType::TOUCH_RESPONSE);
}

/**
 * 播放成功音效
 */
void SoundController::playSuccessSound() {
    playSound(SoundType::SUCCESS);
}

/**
 * 播放错误音效
 */
void SoundController::playErrorSound() {
    playSound(SoundType::ERROR);
}

/**
 * 播放警告音效
 */
void SoundController::playWarningSound() {
    playSound(SoundType::WARNING);
}

/**
 * 播放通知音效
 */
void SoundController::playNotificationSound() {
    playSound(SoundType::NOTIFICATION);
}

/**
 * 播放启动音效
 */
void SoundController::playStartupSound() {
    playSound(SoundType::STARTUP);
}

/**
 * 播放关机音效
 */
void SoundController::playShutdownSound() {
    playSound(SoundType::SHUTDOWN);
}

/**
 * 播放低电量音效
 */
void SoundController::playLowBatterySound() {
    playSound(SoundType::LOW_BATTERY);
}

/**
 * 检查是否正在播放
 */
bool SoundController::isPlaying() const {
    return status.isPlaying;
}

/**
 * 获取当前播放的音效类型
 */
SoundType SoundController::getCurrentSound() const {
    return status.currentSound;
}

/**
 * 获取音效播放状态
 */
SoundStatus SoundController::getStatus() const {
    return status;
}

/**
 * 执行音效测试
 */
bool SoundController::performTest() {
    DEBUG_PRINTLN("执行音效测试...");
    
    // 测试短蜂鸣
    playTone(FREQ_BEEP, 200, 50);
    delay(300);
    
    // 测试不同频率
    playTone(NOTE_C4, 150, 50);
    delay(200);
    playTone(NOTE_E4, 150, 50);
    delay(200);
    playTone(NOTE_G4, 150, 50);
    delay(200);
    
    DEBUG_PRINTLN("✓ 音效测试完成");
    return true;
}

/**
 * 获取系统信息
 */
String SoundController::getSystemInfo() const {
    DynamicJsonDocument doc(512);
    
    doc["sound_enabled"] = soundEnabled;
    doc["is_muted"] = status.isMuted;
    doc["volume"] = globalVolume;
    doc["is_playing"] = status.isPlaying;
    doc["current_sound"] = getSoundTypeName(status.currentSound);
    doc["is_quiet_hours"] = isQuietHours;
    
    String result;
    serializeJson(doc, result);
    return result;
}

/**
 * 重置音效控制器
 */
void SoundController::reset() {
    stopSound();
    setVolume(SPEAKER_VOLUME);
    unmute();
    setSoundEnabled(true);
    
    DEBUG_PRINTLN("音效控制器已重置");
}

/**
 * 获取音效类型名称
 */
String SoundController::getSoundTypeName(SoundType soundType) {
    switch (soundType) {
        case SoundType::HAPPY: return "Happy";
        case SoundType::WATER_NEEDED: return "Water Needed";
        case SoundType::LIGHT_NEEDED: return "Light Needed";
        case SoundType::TOUCH_RESPONSE: return "Touch Response";
        case SoundType::ERROR: return "Error";
        case SoundType::LOW_BATTERY: return "Low Battery";
        case SoundType::STARTUP: return "Startup";
        case SoundType::SHUTDOWN: return "Shutdown";
        case SoundType::SUCCESS: return "Success";
        case SoundType::WARNING: return "Warning";
        case SoundType::NOTIFICATION: return "Notification";
        case SoundType::BEEP_SHORT: return "Beep Short";
        case SoundType::BEEP_LONG: return "Beep Long";
        case SoundType::MELODY_SIMPLE: return "Simple Melody";
        case SoundType::MELODY_COMPLEX: return "Complex Melody";
        default: return "None";
    }
}