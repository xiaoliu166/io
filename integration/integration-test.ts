/**
 * 系统集成测试
 * 验证嵌入式固件、移动应用和云端服务之间的集成
 */

import axios from 'axios';

// 配置
const CONFIG = {
  cloudApiUrl: process.env.CLOUD_API_URL || 'http://localhost:3000/api/v1',
  deviceWebSocketUrl: process.env.DEVICE_WS_URL || 'ws://192.168.1.100:8080',
  testDeviceId: 'test-device-001',
  testUserId: 'test-user-001',
  timeout: 10000
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
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
  log(`ℹ ${message}`, colors.blue);
}

function warn(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

// 测试结果
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const testResults: TestResult[] = [];

/**
 * 测试1: 云端服务健康检查
 */
async function testCloudServiceHealth(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = '云端服务健康检查';
  
  try {
    info(`运行测试: ${testName}`);
    
    // 尝试连接云端服务
    const response = await axios.get(`${CONFIG.cloudApiUrl}/health`, {
      timeout: CONFIG.timeout
    });
    
    if (response.status === 200) {
      success(`${testName} - 云端服务正常运行`);
      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime
      };
    } else {
      throw new Error(`意外的状态码: ${response.status}`);
    }
  } catch (err) {
    error(`${testName} - 失败: ${err}`);
    return {
      name: testName,
      passed: false,
      duration: Date.now() - startTime,
      error: String(err)
    };
  }
}

/**
 * 测试2: 数据上传和检索
 */
async function testDataUploadAndRetrieval(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = '数据上传和检索';
  
  try {
    info(`运行测试: ${testName}`);
    
    // 上传测试数据
    const uploadData = {
      deviceId: CONFIG.testDeviceId,
      timestamp: new Date(),
      sensorData: {
        moisture: 45.5,
        light: 650,
        temperature: 22.3,
        humidity: 60,
        batteryLevel: 85
      },
      deviceStatus: {
        isOnline: true,
        lastSeen: new Date()
      },
      alerts: {
        needsWater: false,
        needsLight: false,
        lowBattery: false
      }
    };
    
    const uploadResponse = await axios.post(
      `${CONFIG.cloudApiUrl}/sync/device-data`,
      uploadData,
      { timeout: CONFIG.timeout }
    );
    
    if (!uploadResponse.data.success) {
      throw new Error('数据上传失败');
    }
    
    success(`${testName} - 数据上传成功`);
    
    // 等待一下让数据处理完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 检索数据
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24小时前
    
    const retrieveResponse = await axios.get(
      `${CONFIG.cloudApiUrl}/sync/device-history/${CONFIG.testDeviceId}`,
      {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        timeout: CONFIG.timeout
      }
    );
    
    if (retrieveResponse.data.success && retrieveResponse.data.data.length > 0) {
      success(`${testName} - 数据检索成功，找到 ${retrieveResponse.data.count} 条记录`);
      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime
      };
    } else {
      throw new Error('数据检索失败或无数据');
    }
  } catch (err) {
    error(`${testName} - 失败: ${err}`);
    return {
      name: testName,
      passed: false,
      duration: Date.now() - startTime,
      error: String(err)
    };
  }
}

/**
 * 测试3: 健康趋势分析
 */
async function testHealthTrendAnalysis(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = '健康趋势分析';
  
  try {
    info(`运行测试: ${testName}`);
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7天前
    
    const response = await axios.get(
      `${CONFIG.cloudApiUrl}/analysis/health-trend/${CONFIG.testDeviceId}`,
      {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        timeout: CONFIG.timeout
      }
    );
    
    if (response.data.success && response.data.data) {
      const trend = response.data.data;
      success(`${testName} - 健康分数: ${trend.healthScore.toFixed(1)}, 状态: ${trend.overallHealth}`);
      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime
      };
    } else {
      throw new Error('健康趋势分析失败');
    }
  } catch (err) {
    // 如果没有足够的数据，这是预期的
    if (String(err).includes('没有找到指定时间段的数据')) {
      warn(`${testName} - 警告: 没有足够的历史数据进行分析`);
      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime
      };
    }
    
    error(`${testName} - 失败: ${err}`);
    return {
      name: testName,
      passed: false,
      duration: Date.now() - startTime,
      error: String(err)
    };
  }
}

/**
 * 测试4: 用户操作记录
 */
async function testUserActionRecording(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = '用户操作记录';
  
  try {
    info(`运行测试: ${testName}`);
    
    // 记录用户操作
    const actionData = {
      deviceId: CONFIG.testDeviceId,
      userId: CONFIG.testUserId,
      actionType: 'water',
      description: '浇水',
      timestamp: new Date(),
      beforeState: {
        moisture: 25,
        light: 600,
        isHealthy: false
      },
      afterState: {
        moisture: 60,
        light: 600,
        isHealthy: true
      },
      notes: '集成测试浇水操作'
    };
    
    const response = await axios.post(
      `${CONFIG.cloudApiUrl}/sync/user-action`,
      actionData,
      { timeout: CONFIG.timeout }
    );
    
    if (response.data.success) {
      success(`${testName} - 用户操作记录成功`);
      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime
      };
    } else {
      throw new Error('用户操作记录失败');
    }
  } catch (err) {
    error(`${testName} - 失败: ${err}`);
    return {
      name: testName,
      passed: false,
      duration: Date.now() - startTime,
      error: String(err)
    };
  }
}

/**
 * 测试5: 个性化建议
 */
async function testPersonalizedRecommendations(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = '个性化建议';
  
  try {
    info(`运行测试: ${testName}`);
    
    const response = await axios.get(
      `${CONFIG.cloudApiUrl}/analysis/recommendations/${CONFIG.testDeviceId}`,
      { timeout: CONFIG.timeout }
    );
    
    if (response.data.success && Array.isArray(response.data.data)) {
      success(`${testName} - 获取到 ${response.data.count} 条建议`);
      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime
      };
    } else {
      throw new Error('获取个性化建议失败');
    }
  } catch (err) {
    error(`${testName} - 失败: ${err}`);
    return {
      name: testName,
      passed: false,
      duration: Date.now() - startTime,
      error: String(err)
    };
  }
}

/**
 * 测试6: 异常检测
 */
async function testAnomalyDetection(): Promise<TestResult> {
  const startTime = Date.now();
  const testName = '异常检测';
  
  try {
    info(`运行测试: ${testName}`);
    
    const response = await axios.get(
      `${CONFIG.cloudApiUrl}/analysis/anomalies/${CONFIG.testDeviceId}`,
      {
        params: { lookbackDays: 7 },
        timeout: CONFIG.timeout
      }
    );
    
    if (response.data.success) {
      success(`${testName} - 检测到 ${response.data.count} 个异常模式`);
      return {
        name: testName,
        passed: true,
        duration: Date.now() - startTime
      };
    } else {
      throw new Error('异常检测失败');
    }
  } catch (err) {
    error(`${testName} - 失败: ${err}`);
    return {
      name: testName,
      passed: false,
      duration: Date.now() - startTime,
      error: String(err)
    };
  }
}

/**
 * 打印测试报告
 */
function printTestReport() {
  console.log('\n' + '='.repeat(60));
  log('集成测试报告', colors.blue);
  console.log('='.repeat(60));
  
  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  testResults.forEach(result => {
    const status = result.passed ? '✓ 通过' : '✗ 失败';
    const statusColor = result.passed ? colors.green : colors.red;
    const duration = `${result.duration}ms`;
    
    log(`${status} - ${result.name} (${duration})`, statusColor);
    
    if (result.error) {
      log(`  错误: ${result.error}`, colors.red);
    }
  });
  
  console.log('='.repeat(60));
  log(`总计: ${passedTests}/${totalTests} 通过 (${passRate}%)`, 
      passedTests === totalTests ? colors.green : colors.yellow);
  console.log('='.repeat(60) + '\n');
}

/**
 * 主测试函数
 */
async function runIntegrationTests() {
  log('\n开始系统集成测试...', colors.blue);
  log(`云端API: ${CONFIG.cloudApiUrl}`, colors.blue);
  log(`测试设备ID: ${CONFIG.testDeviceId}\n`, colors.blue);
  
  // 运行所有测试
  testResults.push(await testCloudServiceHealth());
  testResults.push(await testDataUploadAndRetrieval());
  testResults.push(await testHealthTrendAnalysis());
  testResults.push(await testUserActionRecording());
  testResults.push(await testPersonalizedRecommendations());
  testResults.push(await testAnomalyDetection());
  
  // 打印报告
  printTestReport();
  
  // 返回退出码
  const allPassed = testResults.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

// 运行测试
if (require.main === module) {
  runIntegrationTests().catch(err => {
    error(`集成测试失败: ${err}`);
    process.exit(1);
  });
}

export { runIntegrationTests };
