import { IDevice } from '../models/Device';
import { ISensorData } from '../models/SensorData';
import { IUserAction } from '../models/UserAction';
export interface DeviceDataUpload {
    deviceId: string;
    timestamp: Date;
    sensorData: {
        moisture: number;
        light: number;
        temperature?: number;
        humidity?: number;
        batteryLevel?: number;
    };
    deviceStatus: {
        isOnline: boolean;
        lastSeen: Date;
    };
    alerts?: {
        needsWater: boolean;
        needsLight: boolean;
        lowBattery: boolean;
    };
}
export interface UserActionData {
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
    notes?: string;
}
export declare class DataSyncService {
    uploadDeviceData(data: DeviceDataUpload): Promise<{
        success: boolean;
        message: string;
    }>;
    recordUserAction(data: UserActionData): Promise<{
        success: boolean;
        message: string;
    }>;
    getDeviceHistory(deviceId: string, startDate: Date, endDate: Date, limit?: number): Promise<ISensorData[]>;
    getUserActionHistory(deviceId: string, userId: string, limit?: number): Promise<IUserAction[]>;
    syncDeviceConfiguration(deviceId: string, configuration: Partial<IDevice['configuration']>): Promise<{
        success: boolean;
        message: string;
    }>;
    backupDeviceData(deviceId: string): Promise<{
        device: IDevice | null;
        sensorData: ISensorData[];
        userActions: IUserAction[];
    }>;
    restoreDeviceData(backupData: {
        device: IDevice;
        sensorData: ISensorData[];
        userActions: IUserAction[];
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    private calculatePlantHealth;
    private calculateActionEffectiveness;
}
//# sourceMappingURL=DataSyncService.d.ts.map