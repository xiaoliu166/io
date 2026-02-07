/** 传感器单条数据 */
export interface SensorData {
  timestamp: Date;
  moisture: number;
  light: number;
  temperature: number;
  humidity: number;
}

/** 植物状态（用于 UI 展示） */
export interface PlantStatus {
  isHealthy: boolean;
  needsWater: boolean;
  needsLight: boolean;
  batteryLevel: number;
}

/** 单株植物信息 */
export interface Plant {
  id: string;
  name: string;
  variety?: string;  // 品种，如 "绿萝" "多肉"
  addedAt: number;
  thumbnail?: string; // 缩略图 URL，可选
}

/** 养护记录（浇水/调光等） */
export interface CareRecord {
  id: string;
  plantId: string;
  type: 'water' | 'light' | 'other';
  action: string;
  at: number;
}

/** 用户资料（演示用） */
export interface UserProfile {
  nickname: string;
  avatar?: string;
}
