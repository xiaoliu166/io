/**
 * 数据库连接配置
 */

import mongoose from 'mongoose';
import { createClient } from 'redis';

// MongoDB连接
export const connectMongoDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/plant-care-robot';
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB连接成功');
    
    // 监听连接事件
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB连接错误:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB连接断开');
    });
    
  } catch (error) {
    console.error('❌ MongoDB连接失败:', error);
    process.exit(1);
  }
};

// Redis连接
export const connectRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    const client = createClient({
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
    
  } catch (error) {
    console.error('❌ Redis连接失败:', error);
    // Redis不是必需的，可以继续运行
    return null;
  }
};

// 优雅关闭数据库连接
export const closeDatabaseConnections = async (redisClient?: any): Promise<void> => {
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log('✅ Redis连接已关闭');
    }
    
    await mongoose.connection.close();
    console.log('✅ MongoDB连接已关闭');
    
  } catch (error) {
    console.error('❌ 关闭数据库连接时出错:', error);
  }
};