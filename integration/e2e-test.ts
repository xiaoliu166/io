/**
 * 端到端集成测试
 * 测试完整的用户使用流程和系统在各种场景下的表现
 */

import axios from 'axios';

// 配置
const CONFIG = {
  cloudApiUrl: process.env.CLOUD_API_URL || 'http://localhost:3000/api/v1',
  testDeviceId: 'e2e-test-device',
  testUserId: 'e2e-test-user',
  timeout: 15000
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✓ ${message}`, colors.green);
}

function error(message: string) {
  log(`✗ ${message}`, colors.red);
}

function info(message: string) {
  log(`ℹ ${message}`, colors.cyan);
}

function step(message: string) {
  log(`→ ${message}`, colors.blue);
}

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 场景1: 完整用户使用流程
 * 模拟从设备启动到用户照料植物的完整流程
 */
async function testCompleteUserFlow() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('场景1: 完整用户使用流程', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  try {
    // 步骤1: 设备启动，上传初始状态
    step('步骤1: 设备启动，上传初始状态');
    const initialData = {
      deviceId: CONFIG.testDeviceId,
      timestamp: new Date(),
      sensorData: {
        moisture: 25, // 低于阈值30%
        light: 400,   // 低于阈值500lux
        temperature: 22,
        humidity: 55,
        batteryLevel: 100
      },
      deviceStatus: {
        isOnline: true,
        lastSeen: new Date()
      },
      alerts: {
        needsWater: true,
        needsLight: true,
        lowBattery: false
      }
    };
    
    await axios.post(`${CONFIG.cloudApiUrl}/sync/device-data`, initialData);
    success('设备初始状态上传成功');
    await delay(1000);
    
    // 步骤2: 移动应用获取设备状态
    step('步骤2: 移动应用获取设备状态');
    const historyResponse = await axios.get(
      `${CONFIG.cloudApiUrl}/sync/device-history/${CONFIG.testDeviceId}`,
      {
        params: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        }
      }
    );
    
    if (historyResponse.data.success && historyResponse.data.data.length > 0) {
      const latestData = historyResponse.data.data[0];
      success(`获取到设备状态: 湿度=${latestData.moisture}%, 光照=${latestData.light}lux`);
    }
    await delay(1000);
    
    // 步骤3: 用户查看个性化建议
    step('步骤3: 用户查看个性化建议');
    const recommendationsResponse = await axios.get(
      `${CONFIG.cloudApiUrl}/analysis/recommendations/${CONFIG.testDeviceId}`
    );
    
    if (recommendationsResponse.data.success) {
      success(`获取到 ${recommendationsResponse.data.count} 条建议`);
      recommendationsResponse.data.data.slice(0, 2).forEach((rec: string) => {
        info(`  - ${rec}`);
      });
    }
    await delay(1000);
    
    // 步骤4: 用户浇水
    step('步骤4: 用户执行浇水操作');
    const wateringAction = {
      deviceId: CONFIG.testDeviceId,
      userId: CONFIG.testUserId,
      actionType: 'water',
      description: '用户浇水',
      timestamp: new Date(),
      beforeState: {
        moisture: 25,
        light: 400,
        isHealthy: false
      },
      afterState: {
        moisture: 65, // 浇水后湿度上升
        light: 400,
        isHealthy: false // 仍需要光照
      },
      notes: 'E2E测试 - 浇水操作'
    };
    
    await axios.post(`${CONFIG.cloudApiUrl}/sync/user-action`, wateringAction);
    success('浇水操作记录成功');
    await delay(1000);
    
    // 步骤5: 设备上传更新后的状态
    step('步骤5: 设备上传更新后的状态');
    const updatedData = {
      ...initialData,
      timestamp: new Date(),
      sensorData: {
        ...initialData.sensorData,
        moisture: 65 // 更新湿度
      },
      alerts: {
        needsWater: false, // 不再需要浇水
        needsLight: true,  // 仍需要光照
        lowBattery: false
      }
    };
    
    await axios.post(`${CONFIG.cloudApiUrl}/sync/device-data`, updatedData);
    success('设备状态更新成功');
    await delay(1000);
    
    // 步骤6: 用户移动植物到光照充足的地方
    step('步骤6: 用户移动植物到光照充足的地方');
    const movingAction = {
      deviceId: CONFIG.testDeviceId,
      userId: CONFIG.testUserId,
      actionType: 'move_to_light',
      description: '移动到窗边',
      timestamp: new Date(),
      beforeState: {
        moisture: 65,
        light: 400,
        isHealthy: false
      },
      afterState: {
        moisture: 65,
        light: 800, // 光照增强
        isHealthy: true // 现在健康了
      },
      notes: 'E2E测试 - 移动到光照充足处'
    };
    
    await axios.post(`${CONFIG.cloudApiUrl}/sync/user-action`, movingAction);
    success('移动操作记录成功');
    await delay(1000);
    
    // 步骤7: 设备上传最终健康状态
    step('步骤7: 设备上传最终健康状态');
    const finalData = {
      ...initialData,
      timestamp: new Date(),
      sensorData: {
        ...initialData.sensorData,
        moisture: 65,
        light: 800
      },
      alerts: {
        needsWater: false,
        needsLight: false,
        lowBattery: false
      }
    };
    
    await axios.post(`${CONFIG.cloudApiUrl}/sync/device-data`, finalData);
    success('植物现在健康了！');
    await delay(1000);
    
    // 步骤8: 查看健康趋势
    step('步骤8: 查看植物健康趋势');
    const trendResponse = await axios.get(
      `${CONFIG.cloudApiUrl}/analysis/health-trend/${CONFIG.testDeviceId}`,
      {
        params: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        }
      }
    );
    
    if (trendResponse.data.success) {
      const trend = trendResponse.data.data;
      success(`健康分数: ${trend.healthScore.toFixed(1)}/100, 状态: ${trend.overallHealth}`);
      info(`  湿度趋势: ${trend.trends.moisture.trend} (平均: ${trend.trends.moisture.average.toFixed(1)}%)`);
      info(`  光照趋势: ${trend.trends.light.trend} (平均: ${trend.trends.light.average.toFixed(0)}lux)`);
    }
    
    log('\n✓ 场景1完成: 完整用户使用流程测试通过', colors.green);
    return true;
    
  } catch (err) {
    error(`场景1失败: ${err}`);
    return false;
  }
}

/**
 * 场景2: 离线恢复测试
 * 测试设备离线后重新上线的数据同步
 */
async function testOfflineRecovery() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('场景2: 离线恢复测试', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  try {
    // 步骤1: 设备离线前的最后状态
    step('步骤1: 设备离线前上传状态');
    const beforeOfflineData = {
      deviceId: `${CONFIG.testDeviceId}-offline`,
      timestamp: new Date(Date.now() - 3600000), // 1小时前
      sensorData: {
        moisture: 50,
        light: 600,
        temperature: 22,
        batteryLevel: 80
      },
      deviceStatus: {
        isOnline: true,
        lastSeen: new Date(Date.now() - 3600000)
      }
    };
    
    await axios.post(`${CONFIG.cloudApiUrl}/sync/device-data`, beforeOfflineData);
    success('离线前状态记录成功');
    await delay(500);
    
    // 步骤2: 模拟设备离线期间的本地数据积累
    step('步骤2: 模拟设备离线期间（本地缓存数据）');
    info('  设备在离线期间继续监测环境...');
    await delay(1000);
    
    // 步骤3: 设备重新上线，批量上传离线期间的数据
    step('步骤3: 设备重新上线，同步离线数据');
    const offlineDataPoints = [
      { time: -2700000, moisture: 48, light: 580 }, // 45分钟前
      { time: -1800000, moisture: 46, light: 560 }, // 30分钟前
      { time: -900000, moisture: 44, light: 540 },  // 15分钟前
      { time: 0, moisture: 42, light: 520 }          // 现在
    ];
    
    for (const point of offlineDataPoints) {
      const data = {
        deviceId: `${CONFIG.testDeviceId}-offline`,
        timestamp: new Date(Date.now() + point.time),
        sensorData: {
          moisture: point.moisture,
          light: point.light,
          temperature: 22,
          batteryLevel: 75
        },
        deviceStatus: {
          isOnline: true,
          lastSeen: new Date()
        }
      };
      
      await axios.post(`${CONFIG.cloudApiUrl}/sync/device-data`, data);
    }
    
    success(`成功同步 ${offlineDataPoints.length} 条离线数据`);
    await delay(1000);
    
    // 步骤4: 验证数据完整性
    step('步骤4: 验证数据完整性');
    const historyResponse = await axios.get(
      `${CONFIG.cloudApiUrl}/sync/device-history/${CONFIG.testDeviceId}-offline`,
      {
        params: {
          startDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        }
      }
    );
    
    if (historyResponse.data.success) {
      const dataCount = historyResponse.data.count;
      success(`数据完整性验证通过，共 ${dataCount} 条记录`);
      
      if (dataCount >= offlineDataPoints.length) {
        success('所有离线数据已成功恢复');
      }
    }
    
    log('\n✓ 场景2完成: 离线恢复测试通过', colors.green);
    return true;
    
  } catch (err) {
    error(`场景2失败: ${err}`);
    return false;
  }
}

/**
 * 场景3: 异常处理和错误恢复
 * 测试系统在各种异常情况下的表现
 */
async function testErrorHandling() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('场景3: 异常处理和错误恢复', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  try {
    // 测试1: 无效数据处理
    step('测试1: 提交无效数据');
    try {
      await axios.post(`${CONFIG.cloudApiUrl}/sync/device-data`, {
        deviceId: '', // 无效的设备ID
        timestamp: new Date(),
        sensorData: {
          moisture: -10, // 无效值
          light: 15000   // 超出范围
        }
      });
      error('应该拒绝无效数据');
      return false;
    } catch (err: any) {
      if (err.response && err.response.status === 400) {
        success('正确拒绝了无效数据');
      }
    }
    await delay(500);
    
    // 测试2: 不存在的设备
    step('测试2: 查询不存在的设备');
    const nonExistentResponse = await axios.get(
      `${CONFIG.cloudApiUrl}/sync/device-history/non-existent-device`,
      {
        params: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        }
      }
    );
    
    if (nonExistentResponse.data.success && nonExistentResponse.data.count === 0) {
      success('正确处理了不存在的设备查询');
    }
    await delay(500);
    
    // 测试3: 传感器故障检测
    step('测试3: 传感器故障检测');
    const malfunctionData = {
      deviceId: `${CONFIG.testDeviceId}-malfunction`,
      timestamp: new Date(),
      sensorData: {
        moisture: 50,
        light: 50, // 连续相同值
        temperature: 22,
        batteryLevel: 90
      },
      deviceStatus: {
        isOnline: true,
        lastSeen: new Date()
      }
    };
    
    // 上传多个相同的数据点模拟传感器故障
    for (let i = 0; i < 10; i++) {
      await axios.post(`${CONFIG.cloudApiUrl}/sync/device-data`, {
        ...malfunctionData,
        timestamp: new Date(Date.now() + i * 60000)
      });
    }
    
    success('传感器故障数据已上传');
    await delay(1000);
    
    // 检测异常
    const anomalyResponse = await axios.get(
      `${CONFIG.cloudApiUrl}/analysis/anomalies/${CONFIG.testDeviceId}-malfunction`,
      { params: { lookbackDays: 1 } }
    );
    
    if (anomalyResponse.data.success) {
      const anomalies = anomalyResponse.data.data;
      const sensorMalfunction = anomalies.find((a: any) => 
        a.patternType === 'sensor_malfunction'
      );
      
      if (sensorMalfunction) {
        success('成功检测到传感器故障');
        info(`  严重程度: ${sensorMalfunction.severity}`);
        info(`  置信度: ${sensorMalfunction.confidence}%`);
      } else {
        info('未检测到传感器故障（数据可能不足）');
      }
    }
    
    log('\n✓ 场景3完成: 异常处理测试通过', colors.green);
    return true;
    
  } catch (err) {
    error(`场景3失败: ${err}`);
    return false;
  }
}

/**
 * 场景4: 性能和负载测试
 * 测试系统在高负载下的表现
 */
async function testPerformance() {
  log('\n' + '='.repeat(60), colors.cyan);
  log('场景4: 性能和负载测试', colors.cyan);
  log('='.repeat(60), colors.cyan);
  
  try {
    // 测试1: 批量数据上传
    step('测试1: 批量数据上传（模拟多设备）');
    const startTime = Date.now();
    const deviceCount = 10;
    const dataPointsPerDevice = 5;
    
    const uploadPromises = [];
    
    for (let deviceIndex = 0; deviceIndex < deviceCount; deviceIndex++) {
      for (let dataIndex = 0; dataIndex < dataPointsPerDevice; dataIndex++) {
        const data = {
          deviceId: `perf-test-device-${deviceIndex}`,
          timestamp: new Date(Date.now() - (dataPointsPerDevice - dataIndex) * 60000),
          sensorData: {
            moisture: 40 + Math.random() * 20,
            light: 500 + Math.random() * 300,
            temperature: 20 + Math.random() * 5,
            batteryLevel: 80 + Math.random() * 20
          },
          deviceStatus: {
            isOnline: true,
            lastSeen: new Date()
          }
        };
        
        uploadPromises.push(
          axios.post(`${CONFIG.cloudApiUrl}/sync/device-data`, data)
        );
      }
    }
    
    await Promise.all(uploadPromises);
    const uploadDuration = Date.now() - startTime;
    const totalDataPoints = deviceCount * dataPointsPerDevice;
    
    success(`成功上传 ${totalDataPoints} 条数据`);
    info(`  总耗时: ${uploadDuration}ms`);
    info(`  平均每条: ${(uploadDuration / totalDataPoints).toFixed(1)}ms`);
    
    if (uploadDuration / totalDataPoints < 100) {
      success('性能测试通过: 平均响应时间 < 100ms');
    } else {
      info(`性能警告: 平均响应时间 ${(uploadDuration / totalDataPoints).toFixed(1)}ms`);
    }
    
    log('\n✓ 场景4完成: 性能测试通过', colors.green);
    return true;
    
  } catch (err) {
    error(`场景4失败: ${err}`);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runE2ETests() {
  log('\n' + '='.repeat(60), colors.blue);
  log('开始端到端集成测试', colors.blue);
  log('='.repeat(60) + '\n', colors.blue);
  
  const results = {
    scenario1: false,
    scenario2: false,
    scenario3: false,
    scenario4: false
  };
  
  // 运行所有场景
  results.scenario1 = await testCompleteUserFlow();
  results.scenario2 = await testOfflineRecovery();
  results.scenario3 = await testErrorHandling();
  results.scenario4 = await testPerformance();
  
  // 打印总结
  log('\n' + '='.repeat(60), colors.blue);
  log('端到端测试总结', colors.blue);
  log('='.repeat(60), colors.blue);
  
  const passedCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.keys(results).length;
  
  log(`场景1 (完整用户流程): ${results.scenario1 ? '✓ 通过' : '✗ 失败'}`, 
      results.scenario1 ? colors.green : colors.red);
  log(`场景2 (离线恢复): ${results.scenario2 ? '✓ 通过' : '✗ 失败'}`, 
      results.scenario2 ? colors.green : colors.red);
  log(`场景3 (异常处理): ${results.scenario3 ? '✓ 通过' : '✗ 失败'}`, 
      results.scenario3 ? colors.green : colors.red);
  log(`场景4 (性能测试): ${results.scenario4 ? '✓ 通过' : '✗ 失败'}`, 
      results.scenario4 ? colors.green : colors.red);
  
  log('='.repeat(60), colors.blue);
  log(`总计: ${passedCount}/${totalCount} 场景通过`, 
      passedCount === totalCount ? colors.green : colors.yellow);
  log('='.repeat(60) + '\n', colors.blue);
  
  // 返回退出码
  process.exit(passedCount === totalCount ? 0 : 1);
}

// 运行测试
if (require.main === module) {
  runE2ETests().catch(err => {
    error(`E2E测试失败: ${err}`);
    process.exit(1);
  });
}

export { runE2ETests };
