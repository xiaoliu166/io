/**
 * 数据分析API路由
 */

import express from 'express';
import Joi from 'joi';
import { DataAnalysisService } from '../services/DataAnalysisService';

const router = express.Router();
const dataAnalysisService = new DataAnalysisService();

/**
 * GET /api/v1/analysis/health-trend/:deviceId
 * 获取植物健康趋势分析
 */
router.get('/health-trend/:deviceId', async (req, res): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: '设备ID不能为空'
      });
      return;
    }
    
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    const healthTrend = await dataAnalysisService.analyzeHealthTrend(deviceId, start, end);
    
    res.json({
      success: true,
      data: healthTrend
    });
    
  } catch (error) {
    console.error('获取健康趋势API错误:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

/**
 * GET /api/v1/analysis/anomalies/:deviceId
 * 检测异常模式
 */
router.get('/anomalies/:deviceId', async (req, res): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const { lookbackDays } = req.query;
    
    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: '设备ID不能为空'
      });
      return;
    }
    
    const days = lookbackDays ? parseInt(lookbackDays as string) : 7;
    const anomalies = await dataAnalysisService.detectAnomalies(deviceId, days);
    
    res.json({
      success: true,
      data: anomalies,
      count: anomalies.length
    });
    
  } catch (error) {
    console.error('检测异常模式API错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * GET /api/v1/analysis/health-report/:deviceId
 * 生成植物健康报告
 */
router.get('/health-report/:deviceId', async (req, res): Promise<void> => {
  try {
    const { deviceId } = req.params;
    const { reportDays } = req.query;
    
    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: '设备ID不能为空'
      });
      return;
    }
    
    const days = reportDays ? parseInt(reportDays as string) : 30;
    const report = await dataAnalysisService.generateHealthReport(deviceId, days);
    
    res.json({
      success: true,
      data: report
    });
    
  } catch (error) {
    console.error('生成健康报告API错误:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

/**
 * GET /api/v1/analysis/recommendations/:deviceId
 * 获取个性化建议
 */
router.get('/recommendations/:deviceId', async (req, res): Promise<void> => {
  try {
    const { deviceId } = req.params;
    
    if (!deviceId) {
      res.status(400).json({
        success: false,
        message: '设备ID不能为空'
      });
      return;
    }
    
    const recommendations = await dataAnalysisService.getPersonalizedRecommendations(deviceId);
    
    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
    
  } catch (error) {
    console.error('获取个性化建议API错误:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : '服务器内部错误'
    });
  }
});

export default router;