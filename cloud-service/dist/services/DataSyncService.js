"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataSyncService = void 0;
const Device_1 = require("../models/Device");
const SensorData_1 = require("../models/SensorData");
const UserAction_1 = require("../models/UserAction");
class DataSyncService {
    async uploadDeviceData(data) {
        try {
            const device = await Device_1.Device.findOne({ deviceId: data.deviceId });
            if (!device) {
                return { success: false, message: '设备不存在' };
            }
            await Device_1.Device.updateOne({ deviceId: data.deviceId }, {
                isOnline: data.deviceStatus.isOnline,
                lastSeen: data.deviceStatus.lastSeen
            });
            const isHealthy = this.calculatePlantHealth(data.sensorData.moisture, data.sensorData.light, device.configuration);
            const sensorData = new SensorData_1.SensorData({
                deviceId: data.deviceId,
                timestamp: data.timestamp,
                moisture: data.sensorData.moisture,
                light: data.sensorData.light,
                temperature: data.sensorData.temperature,
                humidity: data.sensorData.humidity,
                batteryLevel: data.sensorData.batteryLevel,
                isHealthy: isHealthy.isHealthy,
                needsWater: isHealthy.needsWater,
                needsLight: isHealthy.needsLight,
                alertTriggered: data.alerts ? (data.alerts.needsWater || data.alerts.needsLight) : false,
                dataSource: 'device'
            });
            await sensorData.save();
            return { success: true, message: '数据上传成功' };
        }
        catch (error) {
            console.error('上传设备数据失败:', error);
            return { success: false, message: '数据上传失败' };
        }
    }
    async recordUserAction(data) {
        try {
            const device = await Device_1.Device.findOne({ deviceId: data.deviceId });
            if (!device) {
                return { success: false, message: '设备不存在' };
            }
            let effectiveness;
            if (data.beforeState && data.afterState) {
                effectiveness = this.calculateActionEffectiveness(data.beforeState, data.afterState);
            }
            const userAction = new UserAction_1.UserAction({
                deviceId: data.deviceId,
                userId: data.userId,
                actionType: data.actionType,
                description: data.description,
                timestamp: data.timestamp,
                beforeState: data.beforeState,
                afterState: data.afterState,
                effectiveness,
                notes: data.notes
            });
            await userAction.save();
            return { success: true, message: '用户操作记录成功' };
        }
        catch (error) {
            console.error('记录用户操作失败:', error);
            return { success: false, message: '操作记录失败' };
        }
    }
    async getDeviceHistory(deviceId, startDate, endDate, limit = 1000) {
        try {
            return await SensorData_1.SensorData.find({
                deviceId,
                timestamp: { $gte: startDate, $lte: endDate }
            })
                .sort({ timestamp: -1 })
                .limit(limit)
                .exec();
        }
        catch (error) {
            console.error('获取设备历史数据失败:', error);
            return [];
        }
    }
    async getUserActionHistory(deviceId, userId, limit = 100) {
        try {
            return await UserAction_1.UserAction.find({
                deviceId,
                userId
            })
                .sort({ timestamp: -1 })
                .limit(limit)
                .exec();
        }
        catch (error) {
            console.error('获取用户操作历史失败:', error);
            return [];
        }
    }
    async syncDeviceConfiguration(deviceId, configuration) {
        try {
            const result = await Device_1.Device.updateOne({ deviceId }, { $set: { configuration } });
            if (result.matchedCount === 0) {
                return { success: false, message: '设备不存在' };
            }
            return { success: true, message: '配置同步成功' };
        }
        catch (error) {
            console.error('同步设备配置失败:', error);
            return { success: false, message: '配置同步失败' };
        }
    }
    async backupDeviceData(deviceId) {
        try {
            const device = await Device_1.Device.findOne({ deviceId });
            const sensorData = await SensorData_1.SensorData.find({ deviceId }).sort({ timestamp: -1 });
            const userActions = await UserAction_1.UserAction.find({ deviceId }).sort({ timestamp: -1 });
            return { device, sensorData, userActions };
        }
        catch (error) {
            console.error('备份设备数据失败:', error);
            return { device: null, sensorData: [], userActions: [] };
        }
    }
    async restoreDeviceData(backupData) {
        try {
            await Device_1.Device.findOneAndUpdate({ deviceId: backupData.device.deviceId }, backupData.device, { upsert: true });
            if (backupData.sensorData.length > 0) {
                await SensorData_1.SensorData.insertMany(backupData.sensorData, { ordered: false });
            }
            if (backupData.userActions.length > 0) {
                await UserAction_1.UserAction.insertMany(backupData.userActions, { ordered: false });
            }
            return { success: true, message: '数据恢复成功' };
        }
        catch (error) {
            console.error('恢复设备数据失败:', error);
            return { success: false, message: '数据恢复失败' };
        }
    }
    calculatePlantHealth(moisture, light, configuration) {
        const needsWater = moisture < configuration.moistureThreshold;
        const needsLight = light < configuration.lightThreshold;
        const isHealthy = !needsWater && !needsLight;
        return { isHealthy, needsWater, needsLight };
    }
    calculateActionEffectiveness(beforeState, afterState) {
        if (!beforeState.isHealthy && afterState.isHealthy) {
            return 'positive';
        }
        if (beforeState.isHealthy && !afterState.isHealthy) {
            return 'negative';
        }
        const moistureImprovement = afterState.moisture - beforeState.moisture;
        const lightImprovement = afterState.light - beforeState.light;
        const totalImprovement = moistureImprovement + (lightImprovement / 10);
        if (totalImprovement > 5) {
            return 'positive';
        }
        else if (totalImprovement < -5) {
            return 'negative';
        }
        else {
            return 'neutral';
        }
    }
}
exports.DataSyncService = DataSyncService;
//# sourceMappingURL=DataSyncService.js.map