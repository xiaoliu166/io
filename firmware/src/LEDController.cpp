/**
 * AI智能植物养护机器人 - LED控制器实现
 */

#include "LEDController.h"

// 预定义颜色常量
const LEDColor LEDController::COLOR_RED(255, 0, 0);
const LEDColor LEDController::COLOR_GREEN(0, 255, 0);
const LEDColor LEDController::COLOR_BLUE(0, 0, 255);
const LEDColor LEDController::COLOR_YELLOW(255, 255, 0);
const LEDColor LEDController::COLOR_ORANGE(255, 165, 0);
const LEDColor LEDController::COLOR_PURPLE(128, 0, 128);
const LEDColor LEDController::COLOR_WHITE(255, 255, 255);
const LEDColor LEDController::COLOR_BLACK(0, 0, 0);

// 植物状态颜色
const LEDColor LEDController::COLOR_HEALTHY(0, 255, 0);      // 绿色
const LEDColor LEDController::COLOR_NEEDS_WATER(255, 255, 0); // 黄色
const LEDColor LEDController::COLOR_NEEDS_LIGHT(255, 0, 0);   // 红色
const LEDColor LEDController::COLOR_CRITICAL(255, 0, 255);    // 紫色
const LEDColor LEDController::COLOR_LOW_BATTERY(255, 165, 0); // 橙色
const LEDColor LEDController::COLOR_ERROR(255, 0, 255);       // 紫色

/**
 * 构造函数
 */
LEDController::LEDController()
    : animStartTime(0),
      lastFrameTime(0),
      animFrame(0),
      animDirection(0),
      globalBrightness(LED_BRIGHTNESS),
      targetBrightness(LED_BRIGHTNESS),
      isFading(false) {
    
    // 初始化状态
    status = {
        .isOn = false,
        .currentColor = COLOR_BLACK,
        .brightness = LED_BRIGHTNESS,
        .currentAnimation = LEDAnimation::NONE,
        .lastUpdate = 0,
        .isAnimating = false
    };
    
    // 初始化动画配置
    animConfig = {
        .type = LEDAnimation::NONE,
        .primaryColor = COLOR_BLACK,
        .secondaryColor = COLOR_BLACK,
        .duration = 1000,
        .speed = 50,
        .intensity = 255,
        .loop = false,
        .fadeAmount = 5
    };
}

/**
 * 析构函数
 */
LEDController::~LEDController() {
    clear();
    show();
}

/**
 * 初始化LED控制器
 */
bool LEDController::initialize() {
    DEBUG_PRINTLN("初始化LED控制器...");
    
    // 初始化FastLED
    FastLED.addLeds<WS2812B, LED_DATA_PIN, GRB>(leds, LED_COUNT);
    FastLED.setBrightness(globalBrightness);
    FastLED.setCorrection(TypicalLEDStrip);
    FastLED.setTemperature(Tungsten40W);
    
    // 清除所有LED
    clear();
    show();
    
    // 执行LED测试
    if (!performTest()) {
        DEBUG_PRINTLN("✗ LED测试失败");
        return false;
    }
    
    status.isOn = true;
    status.lastUpdate = millis();
    
    DEBUG_PRINTLN("✓ LED控制器初始化成功");
    return true;
}

/**
 * 更新LED显示
 */
void LEDController::update() {
    unsigned long currentTime = millis();
    
    // 处理亮度渐变
    if (isFading) {
        // 简单的线性渐变实现
        if (globalBrightness != targetBrightness) {
            if (globalBrightness < targetBrightness) {
                globalBrightness = min(targetBrightness, globalBrightness + 2);
            } else {
                globalBrightness = max(targetBrightness, globalBrightness - 2);
            }
            FastLED.setBrightness(globalBrightness);
        } else {
            isFading = false;
        }
    }
    
    // 更新动画
    if (status.isAnimating) {
        updateAnimation();
    }
    
    // 应用全局亮度并显示
    if (currentTime - status.lastUpdate >= 20) { // 50 FPS
        applyGlobalBrightness();
        show();
        status.lastUpdate = currentTime;
    }
}

/**
 * 更新动画
 */
void LEDController::updateAnimation() {
    unsigned long currentTime = millis();
    
    // 检查动画是否结束
    if (!animConfig.loop && (currentTime - animStartTime >= animConfig.duration)) {
        stopAnimation();
        return;
    }
    
    // 检查是否到了下一帧时间
    if (currentTime - lastFrameTime < animConfig.speed) {
        return;
    }
    
    lastFrameTime = currentTime;
    animFrame++;
    
    // 根据动画类型播放相应动画
    switch (animConfig.type) {
        case LEDAnimation::BREATHING:
            playBreathingAnimation();
            break;
        case LEDAnimation::BLINKING:
            playBlinkingAnimation();
            break;
        case LEDAnimation::RAINBOW:
            playRainbowAnimation();
            break;
        case LEDAnimation::PULSE:
            playPulseAnimation();
            break;
        case LEDAnimation::WAVE:
            playWaveAnimation();
            break;
        case LEDAnimation::SPARKLE:
            playSparkleAnimation();
            break;
        case LEDAnimation::FADE_IN:
        case LEDAnimation::FADE_OUT:
            playFadeAnimation();
            break;
        case LEDAnimation::ROTATE:
            playRotateAnimation();
            break;
        default:
            break;
    }
}

/**
 * 播放呼吸动画
 */
void LEDController::playBreathingAnimation() {
    uint8_t brightness = calculateSineWave(animFrame * 8, animConfig.intensity);
    LEDColor adjustedColor = adjustBrightness(animConfig.primaryColor, brightness);
    setAllLEDs(adjustedColor);
}

/**
 * 播放闪烁动画
 */
void LEDController::playBlinkingAnimation() {
    if ((animFrame / 10) % 2 == 0) {
        setAllLEDs(animConfig.primaryColor);
    } else {
        setAllLEDs(COLOR_BLACK);
    }
}

/**
 * 播放彩虹动画
 */
void LEDController::playRainbowAnimation() {
    for (int i = 0; i < LED_COUNT; i++) {
        uint8_t hue = (animFrame * 2 + i * (256 / LED_COUNT)) % 256;
        leds[i] = CHSV(hue, 255, animConfig.intensity);
    }
}

/**
 * 播放脉冲动画
 */
void LEDController::playPulseAnimation() {
    uint8_t pulse = calculateSineWave(animFrame * 12, animConfig.intensity);
    
    // 从中心向外扩散
    int center = LED_COUNT / 2;
    for (int i = 0; i < LED_COUNT; i++) {
        int distance = abs(i - center);
        uint8_t brightness = max(0, pulse - distance * 30);
        LEDColor adjustedColor = adjustBrightness(animConfig.primaryColor, brightness);
        setLED(i, adjustedColor);
    }
}

/**
 * 播放波浪动画
 */
void LEDController::playWaveAnimation() {
    for (int i = 0; i < LED_COUNT; i++) {
        uint8_t wave = calculateSineWave((animFrame * 4 + i * 20) % 256, animConfig.intensity);
        LEDColor adjustedColor = adjustBrightness(animConfig.primaryColor, wave);
        setLED(i, adjustedColor);
    }
}

/**
 * 播放闪烁星光动画
 */
void LEDController::playSparkleAnimation() {
    // 随机闪烁效果
    if (animFrame % 5 == 0) {
        int randomLED = random(LED_COUNT);
        if (random(100) < 30) { // 30% 概率闪烁
            setLED(randomLED, animConfig.primaryColor);
        } else {
            setLED(randomLED, COLOR_BLACK);
        }
    }
}

/**
 * 播放淡入淡出动画
 */
void LEDController::playFadeAnimation() {
    uint16_t progress = min(255, (animFrame * animConfig.fadeAmount));
    
    if (animConfig.type == LEDAnimation::FADE_OUT) {
        progress = 255 - progress;
    }
    
    LEDColor adjustedColor = adjustBrightness(animConfig.primaryColor, progress);
    setAllLEDs(adjustedColor);
}

/**
 * 播放旋转动画
 */
void LEDController::playRotateAnimation() {
    clear();
    
    int position = (animFrame / 2) % LED_COUNT;
    setLED(position, animConfig.primaryColor);
    
    // 添加拖尾效果
    for (int i = 1; i <= 3; i++) {
        int trailPos = (position - i + LED_COUNT) % LED_COUNT;
        uint8_t trailBrightness = animConfig.intensity / (i + 1);
        LEDColor trailColor = adjustBrightness(animConfig.primaryColor, trailBrightness);
        setLED(trailPos, trailColor);
    }
}

/**
 * 设置所有LED颜色
 */
void LEDController::setAllLEDs(const LEDColor& color) {
    for (int i = 0; i < LED_COUNT; i++) {
        leds[i] = color.toCRGB();
    }
    status.currentColor = color;
}

/**
 * 设置单个LED颜色
 */
void LEDController::setLED(int index, const LEDColor& color) {
    if (index >= 0 && index < LED_COUNT) {
        leds[index] = color.toCRGB();
    }
}

/**
 * 混合两种颜色
 */
LEDColor LEDController::blendColors(const LEDColor& color1, const LEDColor& color2, uint8_t blend) {
    uint8_t r = ((uint16_t)color1.r * (255 - blend) + (uint16_t)color2.r * blend) / 255;
    uint8_t g = ((uint16_t)color1.g * (255 - blend) + (uint16_t)color2.g * blend) / 255;
    uint8_t b = ((uint16_t)color1.b * (255 - blend) + (uint16_t)color2.b * blend) / 255;
    return LEDColor(r, g, b);
}

/**
 * 调整颜色亮度
 */
LEDColor LEDController::adjustBrightness(const LEDColor& color, uint8_t brightness) {
    uint8_t r = ((uint16_t)color.r * brightness) / 255;
    uint8_t g = ((uint16_t)color.g * brightness) / 255;
    uint8_t b = ((uint16_t)color.b * brightness) / 255;
    return LEDColor(r, g, b);
}

/**
 * 计算正弦波值
 */
uint8_t LEDController::calculateSineWave(uint16_t phase, uint8_t amplitude) {
    // 使用查找表或近似计算正弦波
    float radians = (phase * 2.0 * PI) / 256.0;
    float sineValue = (sin(radians) + 1.0) / 2.0; // 归一化到0-1
    return (uint8_t)(sineValue * amplitude);
}

/**
 * 应用全局亮度
 */
void LEDController::applyGlobalBrightness() {
    FastLED.setBrightness(globalBrightness);
}

// ============= 公共方法实现 =============

/**
 * 设置LED颜色
 */
void LEDController::setColor(const LEDColor& color) {
    stopAnimation();
    setAllLEDs(color);
    status.isOn = (color.r > 0 || color.g > 0 || color.b > 0);
}

void LEDController::setColor(uint8_t r, uint8_t g, uint8_t b) {
    setColor(LEDColor(r, g, b));
}

void LEDController::setColor(uint32_t color) {
    setColor(LEDColor(color));
}

/**
 * 设置亮度
 */
void LEDController::setBrightness(uint8_t brightness) {
    globalBrightness = brightness;
    targetBrightness = brightness;
    status.brightness = brightness;
    FastLED.setBrightness(globalBrightness);
    isFading = false;
}

/**
 * 渐变到目标亮度
 */
void LEDController::fadeToBrightness(uint8_t targetBrightness, uint16_t duration) {
    this->targetBrightness = targetBrightness;
    isFading = true;
    // 简化实现，实际应该根据duration计算渐变速度
}

/**
 * 开启LED
 */
void LEDController::turnOn() {
    if (!status.isOn) {
        setColor(COLOR_WHITE);
        status.isOn = true;
    }
}

/**
 * 关闭LED
 */
void LEDController::turnOff() {
    stopAnimation();
    setAllLEDs(COLOR_BLACK);
    status.isOn = false;
}

/**
 * 切换LED开关状态
 */
void LEDController::toggle() {
    if (status.isOn) {
        turnOff();
    } else {
        turnOn();
    }
}

/**
 * 播放动画
 */
void LEDController::playAnimation(const LEDAnimationConfig& config) {
    animConfig = config;
    animStartTime = millis();
    lastFrameTime = 0;
    animFrame = 0;
    animDirection = 0;
    status.isAnimating = true;
    status.currentAnimation = config.type;
}

void LEDController::playAnimation(LEDAnimation type, const LEDColor& color, uint16_t duration, bool loop) {
    LEDAnimationConfig config = {
        .type = type,
        .primaryColor = color,
        .secondaryColor = COLOR_BLACK,
        .duration = duration,
        .speed = 50,
        .intensity = 255,
        .loop = loop,
        .fadeAmount = 5
    };
    playAnimation(config);
}

/**
 * 停止当前动画
 */
void LEDController::stopAnimation() {
    status.isAnimating = false;
    status.currentAnimation = LEDAnimation::NONE;
}

/**
 * 显示植物状态
 */
void LEDController::showPlantState(PlantState state) {
    LEDColor stateColor;
    
    switch (state) {
        case PlantState::HEALTHY:
            stateColor = COLOR_HEALTHY;
            playAnimation(LEDAnimation::BREATHING, stateColor, 3000, true);
            break;
        case PlantState::NEEDS_WATER:
            stateColor = COLOR_NEEDS_WATER;
            playAnimation(LEDAnimation::PULSE, stateColor, 2000, true);
            break;
        case PlantState::NEEDS_LIGHT:
            stateColor = COLOR_NEEDS_LIGHT;
            playAnimation(LEDAnimation::BLINKING, stateColor, 1500, true);
            break;
        case PlantState::CRITICAL:
            stateColor = COLOR_CRITICAL;
            playAnimation(LEDAnimation::BLINKING, stateColor, 500, true);
            break;
        default:
            stateColor = COLOR_WHITE;
            setColor(stateColor);
            break;
    }
    
    DEBUG_PRINTF("显示植物状态: %s\n", StateManager::getStateName(state).c_str());
}

/**
 * 显示健康评分
 */
void LEDController::showHealthScore(int score) {
    LEDColor scoreColor;
    
    if (score >= 80) {
        scoreColor = COLOR_GREEN;
    } else if (score >= 60) {
        scoreColor = COLOR_YELLOW;
    } else if (score >= 40) {
        scoreColor = COLOR_ORANGE;
    } else {
        scoreColor = COLOR_RED;
    }
    
    // 根据评分点亮相应数量的LED
    clear();
    int ledsToLight = map(score, 0, 100, 0, LED_COUNT);
    
    for (int i = 0; i < ledsToLight; i++) {
        setLED(i, scoreColor);
    }
    
    DEBUG_PRINTF("显示健康评分: %d\n", score);
}

/**
 * 显示错误状态
 */
void LEDController::showError(const String& errorType) {
    playAnimation(LEDAnimation::BLINKING, COLOR_ERROR, 1000, true);
    DEBUG_PRINTF("显示错误状态: %s\n", errorType.c_str());
}

/**
 * 显示低电量警告
 */
void LEDController::showLowBattery(int batteryLevel) {
    playAnimation(LEDAnimation::BREATHING, COLOR_LOW_BATTERY, 2000, true);
    DEBUG_PRINTF("显示低电量警告: %d%%\n", batteryLevel);
}

/**
 * 显示启动动画
 */
void LEDController::showStartupAnimation() {
    playAnimation(LEDAnimation::RAINBOW, COLOR_WHITE, 3000, false);
    DEBUG_PRINTLN("播放启动动画");
}

/**
 * 显示关机动画
 */
void LEDController::showShutdownAnimation() {
    playAnimation(LEDAnimation::FADE_OUT, COLOR_WHITE, 2000, false);
    DEBUG_PRINTLN("播放关机动画");
}

/**
 * 显示触摸反馈
 */
void LEDController::showTouchFeedback() {
    playAnimation(LEDAnimation::PULSE, COLOR_BLUE, 500, false);
    DEBUG_PRINTLN("显示触摸反馈");
}

/**
 * 显示成功反馈
 */
void LEDController::showSuccessFeedback() {
    playAnimation(LEDAnimation::SPARKLE, COLOR_GREEN, 1500, false);
    DEBUG_PRINTLN("显示成功反馈");
}

/**
 * 获取当前颜色
 */
LEDColor LEDController::getCurrentColor() const {
    return status.currentColor;
}

/**
 * 获取当前亮度
 */
uint8_t LEDController::getCurrentBrightness() const {
    return globalBrightness;
}

/**
 * 获取LED状态
 */
LEDStatus LEDController::getStatus() const {
    return status;
}

/**
 * 检查是否正在播放动画
 */
bool LEDController::isAnimating() const {
    return status.isAnimating;
}

/**
 * 检查LED是否开启
 */
bool LEDController::isOn() const {
    return status.isOn;
}

/**
 * 设置单个LED颜色
 */
void LEDController::setLEDColor(int index, const LEDColor& color) {
    setLED(index, color);
}

/**
 * 获取单个LED颜色
 */
LEDColor LEDController::getLEDColor(int index) const {
    if (index >= 0 && index < LED_COUNT) {
        CRGB crgb = leds[index];
        return LEDColor(crgb.r, crgb.g, crgb.b);
    }
    return COLOR_BLACK;
}

/**
 * 清除所有LED
 */
void LEDController::clear() {
    FastLED.clear();
    status.currentColor = COLOR_BLACK;
}

/**
 * 立即刷新LED显示
 */
void LEDController::show() {
    FastLED.show();
}

/**
 * 执行LED测试
 */
bool LEDController::performTest() {
    DEBUG_PRINTLN("执行LED测试...");
    
    // 测试红色
    setColor(COLOR_RED);
    show();
    delay(200);
    
    // 测试绿色
    setColor(COLOR_GREEN);
    show();
    delay(200);
    
    // 测试蓝色
    setColor(COLOR_BLUE);
    show();
    delay(200);
    
    // 清除
    clear();
    show();
    
    DEBUG_PRINTLN("✓ LED测试完成");
    return true;
}

/**
 * 获取系统信息
 */
String LEDController::getSystemInfo() const {
    DynamicJsonDocument doc(512);
    
    doc["led_count"] = LED_COUNT;
    doc["is_on"] = status.isOn;
    doc["brightness"] = globalBrightness;
    doc["is_animating"] = status.isAnimating;
    doc["current_animation"] = (int)status.currentAnimation;
    doc["current_color"]["r"] = status.currentColor.r;
    doc["current_color"]["g"] = status.currentColor.g;
    doc["current_color"]["b"] = status.currentColor.b;
    
    String result;
    serializeJson(doc, result);
    return result;
}

/**
 * 重置LED控制器
 */
void LEDController::reset() {
    stopAnimation();
    clear();
    setBrightness(LED_BRIGHTNESS);
    status.isOn = false;
    DEBUG_PRINTLN("LED控制器已重置");
}