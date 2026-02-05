/**
 * AI智能植物养护机器人云端服务
 * 主入口文件
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { connectMongoDB, connectRedis, closeDatabaseConnections } from './config/database';
import syncRoutes from './routes/sync';
import analysisRoutes from './routes/analysis';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 健康检查端点
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'plant-care-robot-cloud'
  });
});

// API路由
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

// 数据同步路由
app.use('/api/v1/sync', syncRoutes);

// 数据分析路由
app.use('/api/v1/analysis', analysisRoutes);

// 错误处理
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectMongoDB();
    const redisClient = await connectRedis();
    
    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      console.log(`🌱 植物养护机器人云端服务启动成功`);
      console.log(`🚀 服务运行在端口: ${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/health`);
      console.log(`🔗 API状态: http://localhost:${PORT}/api/v1/status`);
      console.log(`📡 数据同步API: http://localhost:${PORT}/api/v1/sync`);
    });
    
    // 优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n收到 ${signal} 信号，开始优雅关闭...`);
      
      server.close(async () => {
        console.log('HTTP服务器已关闭');
        await closeDatabaseConnections(redisClient);
        process.exit(0);
      });
      
      // 强制关闭超时
      setTimeout(() => {
        console.error('强制关闭服务器');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
};

startServer();

export default app;