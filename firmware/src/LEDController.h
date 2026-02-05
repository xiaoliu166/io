/**
 * AI智能植物养护机器人 - LED控制器
 * 负责RGB LED灯组的控制、动画效果和状态显示
 */

#ifndef LED_CONTROLLER_H
#define LED_CONTROLLER_H

#include <Arduino.h>
#include <FastLED.h>
#include "StateManager.h"
#include "config.h"

/**
 * LED动画类型
 */
enum class LEDAnimation {
    NONE,           // 无动画
    BREATHING,      // 呼吸效果
    BLINKING,       // 闪烁效果
    RAINBOW,        // 彩虹效果
    PULSE,          // 脉冲效果
    WAVE,           // 波浪效果
    SPARKLE,        // 闪烁星光效果
    FADE_IN,        // 淡入效果
    FADE_OUT,       // 淡出效果
    ROTATE          // 旋转效果
};

/**
 * LED颜色结构
 */
struct LEDColor {
    uint8_t r;      // 红色分量 (0-255)
    uint8_t g;      // 绿色分量 (0-255)
    uint8_t b;      // 蓝色分量 (0-255)
    
    LEDColor() : r(0), g(0), b(0) {}
    LEDColor(uint8_t red, uint8_t green, uint8_t blue) : r(red), g(green), b(blue) {}
    LEDColor(uint32_t color) : r((color >> 16) & 0xFF), g((color >> 8) & 0xFF), b(color & 0xFF) {}
    
    uint32_t toUint32() const { return ((uint32_t)r << 16) | ((uint32_t)g << 8) | b; }
    CRGB toCRGB() const { return CRGB(r, g, b); }
};

/**
 * LED动画配置
 */
struct LEDAnimationConfig {
    LEDAnimation type;          // 动画类型
    LEDColor primaryColor;      // 主要颜色
    LEDColor secondaryColor;    // 次要颜色
    uint16_t duration;          // 动画持续时间 (ms)
    uint16_t speed;             // 动画速度 (ms per frame)
    uint8_t intensity;          // 强度 (0-255)
    bool loop;                  // 是否循环
    uint8_t fadeAmount;         // 淡化量
};

/**
 * LED状态信息
 */
struct LEDStatus {
    bool isOn;                  // 是否开启
    LEDColor currentColor;      // 当前颜色
    uint8_t brightness;         // 亮度 (0-255)
    LEDAnimation currentAnimation; // 当前动画
    unsigned long lastUpdate;   // 上次更新时间
    bool isAnimating;           // 是否正在播放动画
};

/**
 * LED控制器类
 */
class LEDController {
private:
    CRGB leds[LED_COUNT];       // LED数组
    LEDStatus status;           // LED状态
    LEDAnimationConfig animConfig; // 动画配置
    
    // 动画状态
    unsigned long animStartTime;
    unsigned long lastFrameTime;
    uint16_t animFrame;
    uint8_t animDirection;      // 动画方向 (0=正向, 1=反向)
    
    // 亮度控制
    uint8_t globalBrightness;
    uint8_t targetBrightness;
    bool isFading;
    
    // 私有方法
    void updateAnimation();
    void playBreathingAnimation();
    void playBlinkingAnimation();
    void playRainbowAnimation();
    void playPulseAnimation();
    void playWaveAnimation();
    void playSparkleAnimation();
    void playFadeAnimation();
    void playRotateAnimation();
    
    void setAllLEDs(const LEDColor& color);
    void setLED(int index, const LEDColor& color);
    LEDColor blendColors(const LEDColor& color1, const LEDColor& color2, uint8_t blend);
    LEDColor adjustBrightness(const LEDColor& color, uint8_t brightness);
    uint8_t calculateSineWave(uint16_t phase, uint8_t amplitude = 255);
    void applyGlobalBrightness();

public:
    /**
     * 构造函数
     */
    LEDController();
    
    /**
     * 析构函数
     */
    ~LEDController();
    
    /**
     * 初始化LED控制器
     * @return 初始化是否成功
     */
    bool initialize();
    
    /**
     * 更新LED显示（应在主循环中调用）
     */
    void update();
    
    /**
     * 设置LED颜色
     * @param color LED颜色
     */
    void setColor(const LEDColor& color);
    
    /**
     * 设置LED颜色（RGB分量）
     * @param r 红色分量 (0-255)
     * @param g 绿色分量 (0-255)
     * @param b 蓝色分量 (0-255)
     */
    void setColor(uint8_t r, uint8_t g, uint8_t b);
    
    /**
     * 设置LED颜色（32位颜色值）
     * @param color 32位颜色值
     */
    void setColor(uint32_t color);
    
    /**
     * 设置亮度
     * @param brightness 亮度值 (0-255)
     */
    void setBrightness(uint8_t brightness);
    
    /**
     * 渐变到目标亮度
     * @param targetBrightness 目标亮度 (0-255)
     * @param duration 渐变时间 (ms)
     */
    void fadeToBrightness(uint8_t targetBrightness, uint16_t duration = 1000);
    
    /**
     * 开启LED
     */
    void turnOn();
    
    /**
     * 关闭LED
     */
    void turnOff();
    
    /**
     * 切换LED开关状态
     */
    void toggle();
    
    /**
     * 播放动画
     * @param config 动画配置
     */
    void playAnimation(const LEDAnimationConfig& config);
    
    /**
     * 播放预设动画
     * @param type 动画类型
     * @param color 主要颜色
     * @param duration 持续时间 (ms)
     * @param loop 是否循环
     */
    void playAnimation(LEDAnimation type, const LEDColor& color, uint16_t duration = 2000, bool loop = false);
    
    /**
     * 停止当前动画
     */
    void stopAnimation();
    
    /**
     * 显示植物状态
     * @param state 植物状态
     */
    void showPlantState(PlantState state);
    
    /**
     * 显示健康评分
     * @param score 健康评分 (0-100)
     */
    void showHealthScore(int score);
    
    /**
     * 显示错误状态
     * @param errorType 错误类型
     */
    void showError(const String& errorType);
    
    /**
     * 显示低电量警告
     * @param batteryLevel 电池电量 (0-100)
     */
    void showLowBattery(int batteryLevel);
    
    /**
     * 显示启动动画
     */
    void showStartupAnimation();
    
    /**
     * 显示关机动画
     */
    void showShutdownAnimation();
    
    /**
     * 显示触摸反馈
     */
    void showTouchFeedback();
    
    /**
     * 显示成功反馈
     */
    void showSuccessFeedback();
    
    /**
     * 获取当前颜色
     * @return 当前LED颜色
     */
    LEDColor getCurrentColor() const;
    
    /**
     * 获取当前亮度
     * @return 当前亮度值 (0-255)
     */
    uint8_t getCurrentBrightness() const;
    
    /**
     * 获取LED状态
     * @return LED状态信息
     */
    LEDStatus getStatus() const;
    
    /**
     * 检查是否正在播放动画
     * @return 是否正在播放动画
     */
    bool isAnimating() const;
    
    /**
     * 检查LED是否开启
     * @return LED是否开启
     */
    bool isOn() const;
    
    /**
     * 设置单个LED颜色
     * @param index LED索引 (0-LED_COUNT-1)
     * @param color LED颜色
     */
    void setLEDColor(int index, const LEDColor& color);
    
    /**
     * 获取单个LED颜色
     * @param index LED索引 (0-LED_COUNT-1)
     * @return LED颜色
     */
    LEDColor getLEDColor(int index) const;
    
    /**
     * 清除所有LED
     */
    void clear();
    
    /**
     * 立即刷新LED显示
     */
    void show();
    
    /**
     * 执行LED测试
     * @return 测试是否通过
     */
    bool performTest();
    
    /**
     * 获取系统信息
     * @return JSON格式的系统信息
     */
    String getSystemInfo() const;
    
    /**
     * 重置LED控制器
     */
    void reset();
    
    // 预定义颜色常量
    static const LEDColor COLOR_RED;
    static const LEDColor COLOR_GREEN;
    static const LEDColor COLOR_BLUE;
    static const LEDColor COLOR_YELLOW;
    static const LEDColor COLOR_ORANGE;
    static const LEDColor COLOR_PURPLE;
    static const LEDColor COLOR_WHITE;
    static const LEDColor COLOR_BLACK;
    
    // 植物状态颜色
    static const LEDColor COLOR_HEALTHY;
    static const LEDColor COLOR_NEEDS_WATER;
    static const LEDColor COLOR_NEEDS_LIGHT;
    static const LEDColor COLOR_CRITICAL;
    static const LEDColor COLOR_LOW_BATTERY;
    static const LEDColor COLOR_ERROR;
};

#endif // LED_CONTROLLER_H