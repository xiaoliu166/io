/**
 * 设备数据模型
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IDevice extends Document {
  deviceId: string;
  deviceName: string;
  plantType: string;
  location: string;
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
  configuration: {
    moistureThreshold: number;
    lightThreshold: number;
    alertsEnabled: boolean;
    monitoringEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deviceName: {
    type: String,
    required: true,
    trim: true
  },
  plantType: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  configuration: {
    moistureThreshold: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 30
    },
    lightThreshold: {
      type: Number,
      required: true,
      min: 0,
      max: 10000,
      default: 500
    },
    alertsEnabled: {
      type: Boolean,
      default: true
    },
    monitoringEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  collection: 'devices'
});

// 索引
DeviceSchema.index({ userId: 1, deviceId: 1 });
DeviceSchema.index({ lastSeen: 1 });

export const Device = mongoose.model<IDevice>('Device', DeviceSchema);