"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorData = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const SensorDataSchema = new mongoose_1.Schema({
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
SensorDataSchema.index({ deviceId: 1, timestamp: -1 });
SensorDataSchema.index({ deviceId: 1, createdAt: -1 });
SensorDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
exports.SensorData = mongoose_1.default.model('SensorData', SensorDataSchema);
//# sourceMappingURL=SensorData.js.map