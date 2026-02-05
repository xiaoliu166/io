import mongoose, { Document } from 'mongoose';
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
export declare const UserAction: mongoose.Model<IUserAction, {}, {}, {}, mongoose.Document<unknown, {}, IUserAction, {}, {}> & IUserAction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=UserAction.d.ts.map