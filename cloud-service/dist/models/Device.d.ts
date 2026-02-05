import mongoose, { Document } from 'mongoose';
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
export declare const Device: mongoose.Model<IDevice, {}, {}, {}, mongoose.Document<unknown, {}, IDevice, {}, {}> & IDevice & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Device.d.ts.map