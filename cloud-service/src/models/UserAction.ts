/**
 * 用户操作记录模型
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IUserAction extends Document {
  deviceId: string;
  userId: string;
  actionType: 'water' | 'move_to_light' | 'fertilize' | 'prune' | 'repot' | 'other';
  description: string;
  timestamp: Date;
  beforeState?: {
    moisture: number;
    light: number;
    isHealthy: boolean;
  };
  afterState?: {
    moisture: number;
    light: number;
    isHealthy: boolean;
  };
  effectiveness?: 'positive' | 'negative' | 'neutral';
  notes?: string;
  createdAt: Date;
}

const UserActionSchema = new Schema<IUserAction>({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  actionType: {
    type: String,
    required: true,
    enum: ['water', 'move_to_light', 'fertilize', 'prune', 'repot', 'other']
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  beforeState: {
    moisture: { type: Number, min: 0, max: 100 },
    light: { type: Number, min: 0, max: 10000 },
    isHealthy: { type: Boolean }
  },
  afterState: {
    moisture: { type: Number, min: 0, max: 100 },
    light: { type: Number, min: 0, max: 10000 },
    isHealthy: { type: Boolean }
  },
  effectiveness: {
    type: String,
    enum: ['positive', 'negative', 'neutral']
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'user_actions'
});

// 复合索引
UserActionSchema.index({ deviceId: 1, timestamp: -1 });
UserActionSchema.index({ userId: 1, timestamp: -1 });

export const UserAction = mongoose.model<IUserAction>('UserAction', UserActionSchema);