/**
 * 反馈管理器
 * 优化用户交互反馈体验
 */

#ifndef FEEDBACK_MANAGER_H
#define FEEDBACK_MANAGER_H

#include <Arduino.h>

enum class FeedbackType {
  STARTUP_STATUS,
  TOUCH_CONFIRMATION,
  PROBLEM_SOLVED,
  STATUS_CHANGE,
  ERROR_FEEDBACK,
  SUCCESS_FEEDBACK
};

enum class FeedbackIntensity {
  SUBTLE,    // 微妙的反馈
  NORMAL,    // 正常反馈
  STRONG,    // 强烈反馈
  CELEBRATION // 庆祝反馈
};

struct FeedbackPattern {
  uint8_t red, green, blue;
  uint16_t duration;
  uint16_t interval;
  uint8_t repetitions;
  uint16_t frequency; // 音频频率
  uint16_t soundDuration;
};

class FeedbackManager {
private:
  bool immediateStatusEnabled;
  bool touchFeedbackEnabled;
  bool celebrationEnabled;
  bool soundEnabled;
  
  unsigned long lastFeedbackTime;
  FeedbackType currentFeedback;
  bool feedbackActive;
  
  // 预定义反馈模式
  static const FeedbackPattern STARTUP_PATTERN;
  static const FeedbackPattern TOUCH_PATTERN;
  static const FeedbackPattern PROBLEM_SOLVED_PATTERN;
  static const FeedbackPattern SUCCESS_PATTERN;
  static const FeedbackPattern ERROR_PATTERN;
  
  void executeFeedbackPattern(const FeedbackPattern& pattern, FeedbackIntensity intensity);
  void playFeedbackSound(uint16_t frequency, uint16_t duration, FeedbackIntensity intensity);
  void showFeedbackLight(uint8_t r, uint8_t g, uint8_t b, uint16_t duration, FeedbackIntensity intensity);

public:
  FeedbackManager();
  
  // 初始化和配置
  void begin();
  void setImmediateStatusEnabled(bool enabled);
  void setTouchFeedbackEnabled(bool enabled);
  void setCelebrationEnabled(bool enabled);
  void setSoundEnabled(bool enabled);
  
  // 反馈触发
  void triggerStartupStatus();
  void triggerTouchConfirmation();
  void triggerProblemSolved();
  void triggerStatusChange();
  void triggerSuccess();
  void triggerError();
  
  // 立即状态显示
  void showImmediateStatus();
  void updateStatusDisplay();
  
  // 触摸反馈优化
  void handleTouchStart();
  void handleTouchEnd();
  void handleTouchConfirm();
  
  // 庆祝反馈
  void celebrateWaterProblemSolved();
  void celebrateLightProblemSolved();
  void celebrateAllProblemsSolved();
  
  // 反馈强度控制
  void setFeedbackIntensity(FeedbackIntensity intensity);
  FeedbackIntensity getFeedbackIntensity() const;
  
  // 更新处理
  void update();
  
  // 状态查询
  bool isFeedbackActive() const;
  FeedbackType getCurrentFeedback() const;
};

#endif // FEEDBACK_MANAGER_H