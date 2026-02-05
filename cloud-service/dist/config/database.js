"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabaseConnections = exports.connectRedis = exports.connectMongoDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const redis_1 = require("redis");
const connectMongoDB = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plant-care-robot';
        await mongoose_1.default.connect(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ MongoDB连接成功');
        mongoose_1.default.connection.on('error', (error) => {
            console.error('❌ MongoDB连接错误:', error);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB连接断开');
        });
    }
    catch (error) {
        console.error('❌ MongoDB连接失败:', error);
        process.exit(1);
    }
};
exports.connectMongoDB = connectMongoDB;
const connectRedis = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const client = (0, redis_1.createClient)({
            url: redisUrl,
            socket: {
                connectTimeout: 5000
            }
        });
        client.on('error', (error) => {
            console.error('❌ Redis连接错误:', error);
        });
        client.on('connect', () => {
            console.log('✅ Redis连接成功');
        });
        client.on('disconnect', () => {
            console.warn('⚠️ Redis连接断开');
        });
        await client.connect();
        return client;
    }
    catch (error) {
        console.error('❌ Redis连接失败:', error);
        return null;
    }
};
exports.connectRedis = connectRedis;
const closeDatabaseConnections = async (redisClient) => {
    try {
        if (redisClient) {
            await redisClient.quit();
            console.log('✅ Redis连接已关闭');
        }
        await mongoose_1.default.connection.close();
        console.log('✅ MongoDB连接已关闭');
    }
    catch (error) {
        console.error('❌ 关闭数据库连接时出错:', error);
    }
};
exports.closeDatabaseConnections = closeDatabaseConnections;
//# sourceMappingURL=database.js.map