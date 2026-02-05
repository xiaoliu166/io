import mongoose, { Document } from 'mongoose';
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
export declare const SensorData: mongoose.Model<ISensorData, {}, {}, {}, mongoose.Document<unknown, {}, ISensorData, {}, {}> & ISensorData & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SensorData.d.ts.map