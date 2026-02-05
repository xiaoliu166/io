/**
 * AI智能植物养护机器人 - 音效控制器
 * 负责扬声器控制、音效播放和音量管理
 */

#ifndef SOUND_CONTROLLER_H
#define SOUND_CONTROLLER_H

#include <Arduino.h>
#include "StateManager.h"
#include "config.h"

/**
 * 音效类型枚举
 */
enum class SoundType {
    NONE,               // 无音效
    HAPPY,              // 开心音效
    WATER_NEEDED,       // 需要浇水音效
    LIGHT_NEEDED,       // 需要光照音效
    TOUCH_RESPONSE,     // 触摸响应音效
    ERROR,              // 错误音效
    LOW_BATTERY,        // 低电量音效
    STARTUP,            // 启动音效
    SHUTDOWN,           // 关机音效
    SUCCESS,            // 成功音效
    WARNING,            // 警告音效
    NOTIFICATION,       // 通知音效
    BEEP_SHORT,         // 短蜂鸣
    BEEP_LONG,          // 长蜂鸣
    MELODY_SIMPLE,      // 简单旋律
    MELODY_COMPLEX      // 复杂旋律
};

/**
 * 音调结构
 */
struct Tone {
    uint16_t frequency;     // 频率 (Hz)
    uint16_t duration;      // 持续时间 (ms)
    uint16_t pause;         // 暂停时间 (ms)
    
    Tone() : frequency(0), duration(0), pause(0) {}
    Tone(uint16_t freq, uint16_t dur, uint16_t p = 0) 
        : frequency(freq), duration(dur), pause(p) {}
};

/**
 * 音效序列结构
 */
struct SoundSequence {
    Tone* tones;            // 音调数组
    uint8_t toneCount;      // 音调数量
    bool loop;              // 是否循环播放
    uint8_t volume;         // 音量 (0-100)
    String name;            // 音效名称
};

/**
 * 音效播放状态
 */
struct SoundStatus {
    bool isPlaying;         // 是否正在播放
    SoundType currentSound; // 当前音效类型
    uint8_t currentTone;    // 当前音调索引
    unsigned long startTime; // 开始播放时间
    unsigned long nextToneTime; // 下一个音调时间
    bool isLooping;         // 是否循环播放
    uint8_t volume;         // 当前音量
    bool isMuted;           // 是否静音
};

/**
 * 音效控制器类
 */
class SoundController {
private:
    SoundStatus status;
    SoundSequence currentSequence;
    uint8_t globalVolume;
    bool soundEnabled;
    unsigned long quietStartTime;
    unsigned long quietEndTime;
    bool isQuietHours;
    
    // 预定义音效序列
    static Tone happyTones[];
    static Tone waterNeededTones[];
    static Tone lightNeededTones[];
    static Tone touchResponseTones[];
    static Tone errorTones[];
    static Tone lowBatteryTones[];
    static Tone startupTones[];
    static Tone shutdownTones[];
    static Tone successTones[];
    static Tone warningTones[];
    static Tone notificationTones[];
    static Tone beepShortTones[];
    static Tone beepLongTones[];
    static Tone melodySimpleTones[];
    static Tone melodyComplexTones[];
    
    // 私有方法
    void playTone(uint16_t frequency, uint16_t duration);
    void stopTone();
    SoundSequence getSoundSequence(SoundType soundType);
    uint8_t calculateVolume(uint8_t baseVolume);
    bool isInQuietHours();
    void updateQuietHours();

public:
    /**
     * 构造函数
     */
    SoundController();
    
    /**
     * 析构函数
     */
    ~SoundController();
    
    /**
     * 初始化音效控制器
     * @return 初始化是否成功
     */
    bool initialize();
    
    /**
     * 更新音效播放（应在主循环中调用）
     */
    void update();
    
    /**
     * 播放音效
     * @param soundType 音效类型
     * @param volume 音量 (0-100)，默认使用全局音量
     */
    void playSound(SoundType soundType, uint8_t volume = 255);
    
    /**
     * 播放自定义音效序列
     * @param sequence 音效序列
     */
    void playSequence(const SoundSequence& sequence);
    
    /**
     * 播放单个音调
     * @param frequency 频率 (Hz)
     * @param duration 持续时间 (ms)
     * @param volume 音量 (0-100)
     */
    void playTone(uint16_t frequency, uint16_t duration, uint8_t volume);
    
    /**
     * 停止当前音效
     */
    void stopSound();
    
    /**
     * 设置全局音量
     * @param volume 音量 (0-100)
     */
    void setVolume(uint8_t volume);
    
    /**
     * 获取当前音量
     * @return 当前音量 (0-100)
     */
    uint8_t getVolume() const;
    
    /**
     * 静音
     */
    void mute();
    
    /**
     * 取消静音
     */
    void unmute();
    
    /**
     * 切换静音状态
     */
    void toggleMute();
    
    /**
     * 检查是否静音
     * @return 是否静音
     */
    bool isMuted() const;
    
    /**
     * 启用或禁用音效
     * @param enabled 是否启用
     */
    void setSoundEnabled(bool enabled);
    
    /**
     * 检查音效是否启用
     * @return 音效是否启用
     */
    bool isSoundEnabled() const;
    
    /**
     * 设置静音时段
     * @param startHour 开始小时 (0-23)
     * @param startMinute 开始分钟 (0-59)
     * @param endHour 结束小时 (0-23)
     * @param endMinute 结束分钟 (0-59)
     */
    void setQuietHours(uint8_t startHour, uint8_t startMinute, uint8_t endHour, uint8_t endMinute);
    
    /**
     * 检查是否在静音时段
     * @return 是否在静音时段
     */
    bool isInQuietHours() const;
    
    /**
     * 播放植物状态音效
     * @param state 植物状态
     */
    void playPlantStateSound(PlantState state);
    
    /**
     * 播放触摸反馈音效
     */
    void playTouchFeedback();
    
    /**
     * 播放成功音效
     */
    void playSuccessSound();
    
    /**
     * 播放错误音效
     */
    void playErrorSound();
    
    /**
     * 播放警告音效
     */
    void playWarningSound();
    
    /**
     * 播放通知音效
     */
    void playNotificationSound();
    
    /**
     * 播放启动音效
     */
    void playStartupSound();
    
    /**
     * 播放关机音效
     */
    void playShutdownSound();
    
    /**
     * 播放低电量音效
     */
    void playLowBatterySound();
    
    /**
     * 检查是否正在播放
     * @return 是否正在播放
     */
    bool isPlaying() const;
    
    /**
     * 获取当前播放的音效类型
     * @return 当前音效类型
     */
    SoundType getCurrentSound() const;
    
    /**
     * 获取音效播放状态
     * @return 音效播放状态
     */
    SoundStatus getStatus() const;
    
    /**
     * 执行音效测试
     * @return 测试是否通过
     */
    bool performTest();
    
    /**
     * 获取系统信息
     * @return JSON格式的系统信息
     */
    String getSystemInfo() const;
    
    /**
     * 重置音效控制器
     */
    void reset();
    
    /**
     * 获取音效类型名称
     * @param soundType 音效类型
     * @return 音效类型名称
     */
    static String getSoundTypeName(SoundType soundType);
    
    // 音符频率常量 (Hz)
    static const uint16_t NOTE_C4 = 262;
    static const uint16_t NOTE_D4 = 294;
    static const uint16_t NOTE_E4 = 330;
    static const uint16_t NOTE_F4 = 349;
    static const uint16_t NOTE_G4 = 392;
    static const uint16_t NOTE_A4 = 440;
    static const uint16_t NOTE_B4 = 494;
    static const uint16_t NOTE_C5 = 523;
    static const uint16_t NOTE_D5 = 587;
    static const uint16_t NOTE_E5 = 659;
    static const uint16_t NOTE_F5 = 698;
    static const uint16_t NOTE_G5 = 784;
    static const uint16_t NOTE_A5 = 880;
    static const uint16_t NOTE_B5 = 988;
    
    // 特殊音效频率
    static const uint16_t FREQ_BEEP = 1000;
    static const uint16_t FREQ_ALERT = 800;
    static const uint16_t FREQ_ERROR = 200;
    static const uint16_t FREQ_SUCCESS = 1200;
};

#endif // SOUND_CONTROLLER_H