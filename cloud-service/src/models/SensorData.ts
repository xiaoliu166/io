/**
 * 传感器数据模型
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface ISensorData extends Document {
  deviceId: string;
  timestamp: Date;
  moisture: number;
  light: number;
  temperature?: number;
  humidity?: number;
  batteryLevel?: number;
  isHealthy: boolean;
  needsWater: boolean;
  needsLight: boolean;
  alertTriggered: boolean;
  dataSource: 'device' | 'manual' | 'estimated';
  createdAt: Date;
}

const SensorDataSchema = new Schema<ISensorData>({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  moisture: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  light: {
    type: Number,
    required: true,
    min: 0,
    max: 10000
  },
  temperature: {
    type: Number,
    min: -50,
    max: 100
  },
  humidity: {
    type: Number,
    min: 0,
    max: 100
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  isHealthy: {
    type: Boolean,
    required: true,
    default: true
  },
  needsWater: {
    type: Boolean,
    required: true,
    default: false
  },
  needsLight: {
    type: Boolean,
    required: true,
    default: false
  },
  alertTriggered: {
    type: Boolean,
    default: false
  },
  dataSource: {
    type: String,
    enum: ['device', 'manual', 'estimated'],
    default: 'device'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'sensor_data'
});

// 复合索引
SensorDataSchema.index({ deviceId: 1, timestamp: -1 });
SensorDataSchema.index({ deviceId: 1, createdAt: -1 });
SensorDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90天后自动删除

export const SensorData = mongoose.model<ISensorData>('SensorData', SensorDataSchema);