/**
 * AI智能植物养护机器人 - 共享类型定义
 * 定义系统中使用的核心数据结构和接口
 */

// ============= 传感器数据类型 =============

export interface SensorData {
  /** 土壤湿度 (%) */
  soilHumidity: number;
  /** 空气湿度 (%) */
  airHumidity: number;
  /** 温度 (°C) */
  temperature: number;
  /** 光照强度 (lux) */
  lightIntensity: number;
  /** 时间戳 */
  timestamp: number;
}

// ============= 植物状态类型 =============

export enum PlantState {
  HEALTHY = 'healthy',
  NEEDS_WATER = 'needs_water',
  NEEDS_LIGHT = 'needs_light',
  CRITICAL = 'critical'
}

export interface PlantStatus {
  state: PlantState;
  soilMoisture: number;
  lightLevel: number;
  temperature: number;
  lastWatered?: Date;
  needsAttention: boolean;
  batteryLevel?: number;
}

// ============= 硬件交互类型 =============

export enum SoundType {
  HAPPY = 'happy',
  WATER_NEEDED = 'water_needed',
  LIGHT_NEEDED = 'light_needed',
  TOUCH_RESPONSE = 'touch_response',
  ERROR = 'error',
  LOW_BATTERY = 'low_battery'
}

export enum AnimationType {
  BREATHING = 'breathing',
  BLINKING = 'blinking',
  RAINBOW = 'rainbow',
  PULSE = 'pulse'
}

export interface LEDColor {
  r: number;
  g: number;
  b: number;
}

// ============= 设备配置类型 =============

export interface DeviceConfig {
  deviceId: string;
  plantType: string;
  moistureThreshold: number;
  lightThreshold: number;
  alertInterval: number; // 分钟
  soundEnabled: boolean;
  ledBrightness: number;
}

// ============= 用户交互记录 =============

export interface CareRecord {
  id: string;
  deviceId: string;
  action: 'watered' | 'moved_to_light' | 'fertilized' | 'touched';
  timestamp: Date;
  sensorDataBefore: SensorData;
  sensorDataAfter?: SensorData;
  notes?: string;
}

// ============= 用户设置 =============

export interface UserPreferences {
  userId: string;
  notificationsEnabled: boolean;
  quietHours: {
    start: string; // "22:00"
    end: string;   // "08:00"
  };
  plantNicknames: Map<string, string>;
  theme: 'light' | 'dark' | 'auto';
}

// ============= 通信协议 =============

export enum MessageType {
  SENSOR_DATA = 'sensor_data',
  STATUS_UPDATE = 'status_update',
  COMMAND = 'command',
  CONFIG_UPDATE = 'config_update',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error'
}

export interface DeviceMessage {
  type: MessageType;
  deviceId: string;
  timestamp: number;
  payload: any;
}

export interface DeviceCommand {
  command: 'led_color' | 'play_sound' | 'set_config' | 'calibrate' | 'restart';
  parameters?: any;
}

// ============= 错误处理 =============

export enum ErrorType {
  SENSOR_FAILURE = 'sensor_failure',
  NETWORK_ERROR = 'network_error',
  LOW_BATTERY = 'low_battery',
  HARDWARE_ERROR = 'hardware_error',
  CONFIG_ERROR = 'config_error'
}

export interface SystemError {
  type: ErrorType;
  message: string;
  timestamp: number;
  deviceId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============= 数据分析类型 =============

export interface HealthReport {
  deviceId: string;
  period: {
    start: Date;
    end: Date;
  };
  averageConditions: {
    soilMoisture: number;
    lightLevel: number;
    temperature: number;
  };
  careEvents: CareRecord[];
  recommendations: string[];
  healthScore: number; // 0-100
}

export interface TrendData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface ChartData {
  soilMoisture: TrendData[];
  lightLevel: TrendData[];
  temperature: TrendData[];
  careEvents: CareRecord[];
}

// ============= 常量定义 =============

export const SENSOR_THRESHOLDS = {
  MOISTURE_LOW: 30,      // 30%
  LIGHT_LOW: 500,        // 500 lux
  TEMPERATURE_MIN: 15,   // 15°C
  TEMPERATURE_MAX: 35,   // 35°C
  BATTERY_LOW: 20        // 20%
} as const;

export const TIMING_CONSTANTS = {
  DATA_COLLECTION_INTERVAL: 5 * 60 * 1000,    // 5分钟
  ALERT_DELAY: 30 * 60 * 1000,                // 30分钟
  REPEAT_ALERT_INTERVAL: 2 * 60 * 60 * 1000,  // 2小时
  STARTUP_TIMEOUT: 30 * 1000,                 // 30秒
  RESPONSE_TIMEOUT: 1000                       // 1秒
} as const;

export const LED_COLORS = {
  HEALTHY: { r: 0, g: 255, b: 0 },      // 绿色
  NEEDS_WATER: { r: 255, g: 255, b: 0 }, // 黄色
  NEEDS_LIGHT: { r: 255, g: 0, b: 0 },   // 红色
  LOW_BATTERY: { r: 255, g: 165, b: 0 }, // 橙色
  ERROR: { r: 255, g: 0, b: 255 },       // 紫色
  OFF: { r: 0, g: 0, b: 0 }              // 关闭
} as const;