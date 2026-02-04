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
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'plant-care-robot-cloud'
  });
});

// API路由
app.get('/api/v1/status', (req, res) => {
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

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
app.listen(PORT, () => {
  console.log(`🌱 植物养护机器人云端服务启动成功`);
  console.log(`🚀 服务运行在端口: ${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`🔗 API状态: http://localhost:${PORT}/api/v1/status`);
});

export default app;