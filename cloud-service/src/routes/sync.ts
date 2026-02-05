/**
 * 数据同步API路由
 */

import express from 'express';
import Joi from 'joi';
import { DataSyncService, DeviceDataUpload, UserActionData } from '../services/DataSyncService';

const router = express.Router();
const dataSyncService = new DataSyncService();

// 数据验证模式
const deviceDataSchema = Joi.object({
  deviceId: Joi.string().required(),
  timestamp: Joi.date().required(),
  sensorData: Joi.object({
    moisture: Joi.number().min(0).max(100).required(),
    light: Joi.number().min(0).max(10000).required(),
    temperature: Joi.number().min(-50).max(100).optional(),
    humidity: Joi.number().min(0).max(100).optional(),
    batteryLevel: Joi.number().min(0).max(100).optional()
  }).required(),
  deviceStatus: Joi.object({
    isOnline: Joi.boolean().required(),
    lastSeen: Joi.date().required()
  }).required(),
  alerts: Joi.object({
    needsWater: Joi.boolean().optional(),
    needsLight: Joi.boolean().optional(),
    lowBattery: Joi.boolean().optional()
  }).optional()
});

const userActionSchema = Joi.object({
  deviceId: Joi.string().required(),
  userId: Joi.string().required(),
  actionType: Joi.string().valid('water', 'move_to_light', 'fertilize', 'prune', 'repot', 'other').required(),
  description: Joi.string().required(),
  timestamp: Joi.date().required(),
  beforeState: Joi.object({
    moisture: Joi.number().min(0).max(100).required(),
    light: Joi.number().min(0).max(10000).required(),
    isHealthy: Joi.boolean().required()
  }).optional(),
  afterState: Joi.object({
    moisture: Joi.number().min(0).max(100).required(),
    light: Joi.number().min(0).max(10000).required(),
    isHealthy: Joi.boolean().required()
  }).optional(),
  notes: Joi.string().optional()
});

/**
 * POST /api/v1/sync/device-data
 * 上传设备数据
 */
router.post('/device-data', async (req, res): Promise<void> => {
  try {
    // 验证请求数据
    const { error, value } = deviceDataSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: '数据验证失败',
        details: error.details
      });
      return;
    }
    
    const deviceData: DeviceDataUpload = value;
    const result = await dataSyncService.uploadDeviceData(deviceData);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('上传设备数据API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * POST /api/v1/sync/user-action
 * 记录用户操作
 */
router.post('/user-action', async (req, res): Promise<void> => {
  try {
    // 验证请求数据
    const { error, value } = userActionSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        message: '数据验证失败',
        details: error.details
      });
      return;
    }
    
    const userActionData: UserActionData = value;
    const result = await dataSyncService.recordUserAction(userActionData);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('记录用户操作API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * GET /api/v1/sync/device-history/:deviceId
 * 获取设备历史数据
 */
router.get('/device-history/:deviceId', async (req, res): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate, limit } = req.query;
    
    // 验证参数
    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: '设备ID不能为空'
      });
      return;
    }
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 默认7天前
    const end = endDate ? new Date(endDate as string) : new Date(); // 默认现在
    const maxLimit = limit ? parseInt(limit as string) : 1000;
    
    const history = await dataSyncService.getDeviceHistory(deviceId, start, end, maxLimit);
    
    res.json({
      success: true,
      data: history,
      count: history.length,
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      }
    });
    
  } catch (error) {
    console.error('获取设备历史数据API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * GET /api/v1/sync/user-actions/:deviceId/:userId
 * 获取用户操作历史
 */
router.get('/user-actions/:deviceId/:userId', async (req, res): Promise<void> => {
  try {
    const { deviceId, userId } = req.params;
    const { limit } = req.query;
    
    // 验证参数
    if (!deviceId || !userId) {
      res.status(400).json({
        success: false,
        message: '设备ID和用户ID不能为空'
      });
      return;
    }
    
    const maxLimit = limit ? parseInt(limit as string) : 100;
    const actions = await dataSyncService.getUserActionHistory(deviceId, userId, maxLimit);
    
    res.json({
      success: true,
      data: actions,
      count: actions.length
    });
    
  } catch (error) {
    console.error('获取用户操作历史API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * PUT /api/v1/sync/device-config/:deviceId
 * 同步设备配置
 */
router.put('/device-config/:deviceId', async (req, res): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const configuration = req.body;
    
    // 验证配置数据
    const configSchema = Joi.object({
      moistureThreshold: Joi.number().min(0).max(100).optional(),
      lightThreshold: Joi.number().min(0).max(10000).optional(),
      alertsEnabled: Joi.boolean().optional(),
      monitoringEnabled: Joi.boolean().optional()
    });
    
    const { error, value } = configSchema.validate(configuration);
    if (error) {
      res.status(400).json({
        success: false,
        message: '配置数据验证失败',
        details: error.details
      });
      return;
    }
    
    const result = await dataSyncService.syncDeviceConfiguration(deviceId, value);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('同步设备配置API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * POST /api/v1/sync/backup/:deviceId
 * 备份设备数据
 */
router.post('/backup/:deviceId', async (req, res): Promise<void> => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: '设备ID不能为空'
      });
      return;
    }
    
    const backupData = await dataSyncService.backupDeviceData(deviceId);
    
    res.json({
      success: true,
      message: '数据备份成功',
      data: backupData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('备份设备数据API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * POST /api/v1/sync/restore
 * 恢复设备数据
 */
router.post('/restore', async (req, res): Promise<void> => {
  try {
    const backupData = req.body;
    
    // 基本验证
    if (!backupData.device || !backupData.device.deviceId) {
      res.status(400).json({
        success: false,
        message: '备份数据格式不正确'
      });
      return;
    }
    
    const result = await dataSyncService.restoreDeviceData(backupData);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('恢复设备数据API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

export default router;