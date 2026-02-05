"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const DataSyncService_1 = require("../services/DataSyncService");
const router = express_1.default.Router();
const dataSyncService = new DataSyncService_1.DataSyncService();
const deviceDataSchema = joi_1.default.object({
    deviceId: joi_1.default.string().required(),
    timestamp: joi_1.default.date().required(),
    sensorData: joi_1.default.object({
        moisture: joi_1.default.number().min(0).max(100).required(),
        light: joi_1.default.number().min(0).max(10000).required(),
        temperature: joi_1.default.number().min(-50).max(100).optional(),
        humidity: joi_1.default.number().min(0).max(100).optional(),
        batteryLevel: joi_1.default.number().min(0).max(100).optional()
    }).required(),
    deviceStatus: joi_1.default.object({
        isOnline: joi_1.default.boolean().required(),
        lastSeen: joi_1.default.date().required()
    }).required(),
    alerts: joi_1.default.object({
        needsWater: joi_1.default.boolean().optional(),
        needsLight: joi_1.default.boolean().optional(),
        lowBattery: joi_1.default.boolean().optional()
    }).optional()
});
const userActionSchema = joi_1.default.object({
    deviceId: joi_1.default.string().required(),
    userId: joi_1.default.string().required(),
    actionType: joi_1.default.string().valid('water', 'move_to_light', 'fertilize', 'prune', 'repot', 'other').required(),
    description: joi_1.default.string().required(),
    timestamp: joi_1.default.date().required(),
    beforeState: joi_1.default.object({
        moisture: joi_1.default.number().min(0).max(100).required(),
        light: joi_1.default.number().min(0).max(10000).required(),
        isHealthy: joi_1.default.boolean().required()
    }).optional(),
    afterState: joi_1.default.object({
        moisture: joi_1.default.number().min(0).max(100).required(),
        light: joi_1.default.number().min(0).max(10000).required(),
        isHealthy: joi_1.default.boolean().required()
    }).optional(),
    notes: joi_1.default.string().optional()
});
router.post('/device-data', async (req, res) => {
    try {
        const { error, value } = deviceDataSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: '数据验证失败',
                details: error.details
            });
            return;
        }
        const deviceData = value;
        const result = await dataSyncService.uploadDeviceData(deviceData);
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error('上传设备数据API错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});
router.post('/user-action', async (req, res) => {
    try {
        const { error, value } = userActionSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                success: false,
                message: '数据验证失败',
                details: error.details
            });
            return;
        }
        const userActionData = value;
        const result = await dataSyncService.recordUserAction(userActionData);
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error('记录用户操作API错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});
router.get('/device-history/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { startDate, endDate, limit } = req.query;
        if (!deviceId) {
            res.status(400).json({
                success: false,
                message: '设备ID不能为空'
            });
            return;
        }
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        const maxLimit = limit ? parseInt(limit) : 1000;
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
    }
    catch (error) {
        console.error('获取设备历史数据API错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});
router.get('/user-actions/:deviceId/:userId', async (req, res) => {
    try {
        const { deviceId, userId } = req.params;
        const { limit } = req.query;
        if (!deviceId || !userId) {
            res.status(400).json({
                success: false,
                message: '设备ID和用户ID不能为空'
            });
            return;
        }
        const maxLimit = limit ? parseInt(limit) : 100;
        const actions = await dataSyncService.getUserActionHistory(deviceId, userId, maxLimit);
        res.json({
            success: true,
            data: actions,
            count: actions.length
        });
    }
    catch (error) {
        console.error('获取用户操作历史API错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});
router.put('/device-config/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const configuration = req.body;
        const configSchema = joi_1.default.object({
            moistureThreshold: joi_1.default.number().min(0).max(100).optional(),
            lightThreshold: joi_1.default.number().min(0).max(10000).optional(),
            alertsEnabled: joi_1.default.boolean().optional(),
            monitoringEnabled: joi_1.default.boolean().optional()
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
        }
        else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error('同步设备配置API错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});
router.post('/backup/:deviceId', async (req, res) => {
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
    }
    catch (error) {
        console.error('备份设备数据API错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});
router.post('/restore', async (req, res) => {
    try {
        const backupData = req.body;
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
        }
        else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error('恢复设备数据API错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});
exports.default = router;
//# sourceMappingURL=sync.js.map