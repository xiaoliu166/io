/**
 * 反馈管理器实现
 */

#include "FeedbackManager.h"
#include "LEDController.h"
#include "SoundController.h"
#include "SensorManager.h"
#include "StateManager.h"

extern LEDController ledController;
extern SoundController soundController;
extern SensorManager sensorManager;
extern StateManager stateManager;

// 预定义反馈模式
const FeedbackPattern FeedbackManager::STARTUP_PATTERN = {
  0, 255, 0,    // 绿色
  2000,         // 持续2秒
  0,            // 无间隔
  1,            // 1次
  523,          // C5音符
  300           // 音效300ms
};

const FeedbackPattern FeedbackManager::TOUCH_PATTERN = {
  0, 150, 255,  // 蓝色
  200,          // 持续200ms
  0,            // 无间隔
  1,            // 1次
  659,          // E5音符
  100           // 音效100ms
};

const FeedbackPattern FeedbackManager::PROBLEM_SOLVED_PATTERN = {
  0, 255, 0,    // 绿色
  500,          // 持续500ms
  200,          // 间隔200ms
  3,            // 3次闪烁
  784,          // G5音符
  200           // 音效200ms
};

const FeedbackPattern FeedbackManager::SUCCESS_PATTERN = {
  255, 215, 0,  // 金色
  300,          // 持续300ms
  100,          // 间隔100ms
  5,            // 5次闪烁
  1047,         // C6音符
  150           // 音效150ms
};

const FeedbackPattern FeedbackManager::ERROR_PATTERN = {
  255, 0, 0,    // 红色
  100,          // 持续100ms
  100,          // 间隔100ms
  2,            // 2次闪烁
  440,          // A4音符
  200           // 音效200ms
};

FeedbackManager::FeedbackManager()
  : immediateStatusEnabled(true),
    touchFeedbackEnabled(true),
    celebrationEnabled(true),
    soundEnabled(true),
    lastFeedbackTime(0),
    currentFeedback(FeedbackType::STARTUP_STATUS),
    feedbackActive(false) {
}

void FeedbackManager::begin() {
  Serial.println("FeedbackManager: Initializing feedback system");
  
  // 触发启动状态显示
  if (immediateStatusEnabled) {
    triggerStartupStatus();
  }
}

void FeedbackManager::setImmediateStatusEnabled(bool enabled) {
  immediateStatusEnabled = enabled;
  Serial.print("FeedbackManager: Immediate status display ");
  Serial.println(enabled ? "enabled" : "disabled");
}

void FeedbackManager::setTouchFeedbackEnabled(bool enabled) {
  touchFeedbackEnabled = enabled;
  Serial.print("FeedbackManager: Touch feedback ");
  Serial.println(enabled ? "enabled" : "disabled");
}

void FeedbackManager::setCelebrationEnabled(bool enabled) {
  celebrationEnabled = enabled;
  Serial.print("FeedbackManager: Celebration feedback ");
  Serial.println(enabled ? "enabled" : "disabled");
}

void FeedbackManager::setSoundEnabled(bool enabled) {
  soundEnabled = enabled;
  Serial.print("FeedbackManager: Sound feedback ");
  Serial.println(enabled ? "enabled" : "disabled");
}

void FeedbackManager::triggerStartupStatus() {
  Serial.println("FeedbackManager: Triggering startup status");
  currentFeedback = FeedbackType::STARTUP_STATUS;
  executeFeedbackPattern(STARTUP_PATTERN, FeedbackIntensity::NORMAL);
  
  // 立即显示当前植物状态
  showImmediateStatus();
}

void FeedbackManager::triggerTouchConfirmation() {
  if (!touchFeedbackEnabled) return;
  
  Serial.println("FeedbackManager: Triggering touch confirmation");
  currentFeedback = FeedbackType::TOUCH_CONFIRMATION;
  executeFeedbackPattern(TOUCH_PATTERN, FeedbackIntensity::SUBTLE);
}

void FeedbackManager::triggerProblemSolved() {
  if (!celebrationEnabled) return;
  
  Serial.println("FeedbackManager: Triggering problem solved celebration");
  currentFeedback = FeedbackType::PROBLEM_SOLVED;
  executeFeedbackPattern(PROBLEM_SOLVED_PATTERN, FeedbackIntensity::CELEBRATION);
}

void FeedbackManager::triggerStatusChange() {
  Serial.println("FeedbackManager: Triggering status change");
  currentFeedback = FeedbackType::STATUS_CHANGE;
  
  // 根据新状态显示相应反馈
  updateStatusDisplay();
}

void FeedbackManager::triggerSuccess() {
  Serial.println("FeedbackManager: Triggering success feedback");
  currentFeedback = FeedbackType::SUCCESS_FEEDBACK;
  executeFeedbackPattern(SUCCESS_PATTERN, FeedbackIntensity::STRONG);
}

void FeedbackManager::triggerError() {
  Serial.println("FeedbackManager: Triggering error feedback");
  currentFeedback = FeedbackType::ERROR_FEEDBACK;
  executeFeedbackPattern(ERROR_PATTERN, FeedbackIntensity::STRONG);
}

void FeedbackManager::showImmediateStatus() {
  if (!immediateStatusEnabled) return;
  
  // 获取当前传感器数据
  float moisture = sensorManager.getMoistureLevel();
  float light = sensorManager.getLightLevel();
  
  // 根据当前环境状态立即显示相应颜色
  if (moisture < 30.0f && light < 500.0f) {
    // 既缺水又缺光 - 红色
    ledController.setColor(255, 0, 0);
    ledController.setBrightness(255);
  } else if (moisture < 30.0f) {
    // 缺水 - 黄色
    ledController.setColor(255, 255, 0);
    ledController.setBrightness(200);
  } else if (light < 500.0f) {
    // 缺光 - 橙色
    ledController.setColor(255, 165, 0);
    ledController.setBrightness(200);
  } else {
    // 状态良好 - 绿色
    ledController.setColor(0, 255, 0);
    ledController.setBrightness(150);
  }
  
  ledController.turnOn();
  
  Serial.println("FeedbackManager: Immediate status displayed");
}

void FeedbackManager::updateStatusDisplay() {
  // 更新状态显示，与showImmediateStatus类似但更平滑
  showImmediateStatus();
}

void FeedbackManager::handleTouchStart() {
  if (!touchFeedbackEnabled) return;
  
  Serial.println("FeedbackManager: Touch start detected");
  
  // 触摸开始时的微妙反馈
  ledController.setBrightness(ledController.getBrightness() + 50);
  
  if (soundEnabled) {
    soundController.playTone(800, 50); // 短促的高音
  }
}

void FeedbackManager::handleTouchEnd() {
  if (!touchFeedbackEnabled) return;
  
  Serial.println("FeedbackManager: Touch end detected");
  
  // 恢复原始亮度
  ledController.setBrightness(ledController.getBrightness() - 50);
}

void FeedbackManager::handleTouchConfirm() {
  if (!touchFeedbackEnabled) return;
  
  Serial.println("FeedbackManager: Touch confirmation");
  triggerTouchConfirmation();
}

void FeedbackManager::celebrateWaterProblemSolved() {
  if (!celebrationEnabled) return;
  
  Serial.println("FeedbackManager: Celebrating water problem solved");
  
  // 蓝色到绿色的渐变庆祝
  for (int i = 0; i <= 255; i += 51) {
    ledController.setColor(0, i, 255 - i);
    ledController.setBrightness(200);
    ledController.turnOn();
    delay(100);
  }
  
  if (soundEnabled) {
    // 播放上升音阶
    soundController.playTone(523, 150); // C5
    delay(50);
    soundController.playTone(659, 150); // E5
    delay(50);
    soundController.playTone(784, 200); // G5
  }
  
  // 最终显示绿色
  ledController.setColor(0, 255, 0);
  ledController.turnOn();
}

void FeedbackManager::celebrateLightProblemSolved() {
  if (!celebrationEnabled) return;
  
  Serial.println("FeedbackManager: Celebrating light problem solved");
  
  // 橙色到绿色的渐变庆祝
  for (int i = 0; i <= 255; i += 51) {
    ledController.setColor(255 - i, 255, 0);
    ledController.setBrightness(200);
    ledController.turnOn();
    delay(100);
  }
  
  if (soundEnabled) {
    // 播放明亮的和弦
    soundController.playTone(659, 150); // E5
    delay(50);
    soundController.playTone(784, 150); // G5
    delay(50);
    soundController.playTone(988, 200); // B5
  }
  
  // 最终显示绿色
  ledController.setColor(0, 255, 0);
  ledController.turnOn();
}

void FeedbackManager::celebrateAllProblemsSolved() {
  if (!celebrationEnabled) return;
  
  Serial.println("FeedbackManager: Celebrating all problems solved");
  
  // 彩虹庆祝效果
  uint8_t colors[][3] = {
    {255, 0, 0},   // 红
    {255, 165, 0}, // 橙
    {255, 255, 0}, // 黄
    {0, 255, 0},   // 绿
    {0, 0, 255},   // 蓝
    {75, 0, 130},  // 靛
    {148, 0, 211}  // 紫
  };
  
  for (int cycle = 0; cycle < 2; cycle++) {
    for (int i = 0; i < 7; i++) {
      ledController.setColor(colors[i][0], colors[i][1], colors[i][2]);
      ledController.setBrightness(255);
      ledController.turnOn();
      delay(200);
    }
  }
  
  if (soundEnabled) {
    // 播放胜利音效
    soundController.playTone(523, 200); // C5
    delay(50);
    soundController.playTone(659, 200); // E5
    delay(50);
    soundController.playTone(784, 200); // G5
    delay(50);
    soundController.playTone(1047, 400); // C6
  }
  
  // 最终显示绿色
  ledController.setColor(0, 255, 0);
  ledController.setBrightness(200);
  ledController.turnOn();
}

void FeedbackManager::executeFeedbackPattern(const FeedbackPattern& pattern, FeedbackIntensity intensity) {
  feedbackActive = true;
  lastFeedbackTime = millis();
  
  // 根据强度调整参数
  uint8_t brightness = 150;
  float soundVolume = 1.0f;
  
  switch (intensity) {
    case FeedbackIntensity::SUBTLE:
      brightness = 100;
      soundVolume = 0.5f;
      break;
    case FeedbackIntensity::NORMAL:
      brightness = 150;
      soundVolume = 0.8f;
      break;
    case FeedbackIntensity::STRONG:
      brightness = 200;
      soundVolume = 1.0f;
      break;
    case FeedbackIntensity::CELEBRATION:
      brightness = 255;
      soundVolume = 1.0f;
      break;
  }
  
  // 执行视觉反馈
  showFeedbackLight(pattern.red, pattern.green, pattern.blue, pattern.duration, intensity);
  
  // 执行音频反馈
  if (soundEnabled && pattern.frequency > 0) {
    playFeedbackSound(pattern.frequency, pattern.soundDuration, intensity);
  }
}

void FeedbackManager::playFeedbackSound(uint16_t frequency, uint16_t duration, FeedbackIntensity intensity) {
  // 根据强度调整音量和音调
  uint16_t adjustedFreq = frequency;
  uint16_t adjustedDuration = duration;
  
  switch (intensity) {
    case FeedbackIntensity::SUBTLE:
      adjustedFreq = frequency * 0.8f;
      adjustedDuration = duration * 0.7f;
      break;
    case FeedbackIntensity::CELEBRATION:
      adjustedFreq = frequency * 1.2f;
      adjustedDuration = duration * 1.5f;
      break;
    default:
      break;
  }
  
  soundController.playTone(adjustedFreq, adjustedDuration);
}

void FeedbackManager::showFeedbackLight(uint8_t r, uint8_t g, uint8_t b, uint16_t duration, FeedbackIntensity intensity) {
  // 根据强度调整亮度
  uint8_t brightness = 150;
  
  switch (intensity) {
    case FeedbackIntensity::SUBTLE:
      brightness = 80;
      break;
    case FeedbackIntensity::NORMAL:
      brightness = 150;
      break;
    case FeedbackIntensity::STRONG:
      brightness = 200;
      break;
    case FeedbackIntensity::CELEBRATION:
      brightness = 255;
      break;
  }
  
  ledController.setColor(r, g, b);
  ledController.setBrightness(brightness);
  ledController.turnOn();
  
  // 如果有持续时间，设置定时器
  if (duration > 0) {
    // 这里可以设置一个定时器来自动恢复状态
    // 简化实现中，我们依赖update()方法来处理
  }
}

void FeedbackManager::update() {
  // 检查反馈是否需要结束
  if (feedbackActive && (millis() - lastFeedbackTime > 3000)) {
    feedbackActive = false;
    
    // 恢复正常状态显示
    updateStatusDisplay();
  }
}

bool FeedbackManager::isFeedbackActive() const {
  return feedbackActive;
}

FeedbackType FeedbackManager::getCurrentFeedback() const {
  return currentFeedback;
}