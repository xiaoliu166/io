"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const sync_1 = __importDefault(require("./routes/sync"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        service: 'plant-care-robot-cloud'
    });
});
app.get('/api/v1/status', (_req, res) => {
    res.json({
        message: 'AI智能植物养护机器人云端服务运行中',
        version: '1.0.0',
        features: [
            '数据同步服务',
            '复杂数据分析',
            '推送通知',
            '设备管理'
        ]
    });
});
app.use('/api/v1/sync', sync_1.default);
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});
const startServer = async () => {
    try {
        await (0, database_1.connectMongoDB)();
        const redisClient = await (0, database_1.connectRedis)();
        const server = app.listen(PORT, () => {
            console.log(`🌱 植物养护机器人云端服务启动成功`);
            console.log(`🚀 服务运行在端口: ${PORT}`);
            console.log(`📊 健康检查: http://localhost:${PORT}/health`);
            console.log(`🔗 API状态: http://localhost:${PORT}/api/v1/status`);
            console.log(`📡 数据同步API: http://localhost:${PORT}/api/v1/sync`);
        });
        const gracefulShutdown = async (signal) => {
            console.log(`\n收到 ${signal} 信号，开始优雅关闭...`);
            server.close(async () => {
                console.log('HTTP服务器已关闭');
                await (0, database_1.closeDatabaseConnections)(redisClient);
                process.exit(0);
            });
            setTimeout(() => {
                console.error('强制关闭服务器');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }
    catch (error) {
        console.error('启动服务器失败:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map