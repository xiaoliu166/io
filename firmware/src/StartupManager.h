/**
 * 启动管理器
 * 处理设备启动流程和状态显示
 */

#ifndef STARTUP_MANAGER_H
#define STARTUP_MANAGER_H

#include <Arduino.h>

enum class StartupPhase {
  POWER_ON,
  SYSTEM_INIT,
  SENSOR_INIT,
  WIFI_INIT,
  CONFIG_CHECK,
  READY,
  ERROR
};

enum class StartupError {
  NONE,
  SENSOR_FAILURE,
  WIFI_FAILURE,
  CONFIG_FAILURE,
  SYSTEM_FAILURE
};

class StartupManager {
private:
  StartupPhase currentPhase;
  StartupError lastError;
  unsigned long phaseStartTime;
  unsigned long totalStartupTime;
  bool startupComplete;
  
  static const unsigned long PHASE_TIMEOUT = 10000; // 10秒超时
  static const unsigned long STARTUP_TARGET_TIME = 30000; // 30秒目标启动时间

  void indicatePhase(StartupPhase phase);
  void indicateError(StartupError error);
  void playStartupSound();
  void playReadySound();
  void playErrorSound();

public:
  StartupManager();
  
  // 启动流程控制
  void begin();
  void setPhase(StartupPhase phase);
  void setError(StartupError error);
  void completeStartup();
  
  // 状态查询
  StartupPhase getCurrentPhase() const;
  StartupError getLastError() const;
  bool isStartupComplete() const;
  unsigned long getStartupTime() const;
  bool isPhaseTimeout() const;
  
  // 状态显示
  void showCurrentStatus();
  void showStartupProgress();
  
  // 更新处理
  void update();
  
  // 启动检查
  bool performSystemCheck();
  bool performSensorCheck();
  bool performWiFiCheck();
  bool performConfigCheck();
};

#endif // STARTUP_MANAGER_H