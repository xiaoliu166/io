# AI智能植物养护机器人 - 集成测试

## 概述

本目录包含系统集成测试，用于验证嵌入式固件、移动应用和云端服务之间的集成。

## 前置条件

### 1. 云端服务运行

确保云端服务正在运行：

```bash
cd cloud-service
npm install
npm start
```

云端服务应该在 `http://localhost:3000` 运行。

### 2. MongoDB运行

确保MongoDB数据库正在运行：

```bash
# macOS (使用Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# 或使用Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 3. 测试设备（可选）

如果要测试与实际硬件的集成，确保ESP32设备已连接并运行固件。

## 安装依赖

```bash
cd integration
npm install
```

## 运行集成测试

### 基本测试

```bash
npm test
```

### 详细输出

```bash
npm run test:verbose
```

### 自定义配置

可以通过环境变量自定义测试配置：

```bash
# 自定义云端API地址
CLOUD_API_URL=http://your-server:3000/api/v1 npm test

# 自定义设备WebSocket地址
DEVICE_WS_URL=ws://192.168.1.100:8080 npm test
```

## 测试场景

集成测试包含以下场景：

### 1. 云端服务健康检查
验证云端服务是否正常运行并可访问。

### 2. 数据上传和检索
- 上传传感器数据到云端
- 从云端检索历史数据
- 验证数据完整性

### 3. 健康趋势分析
- 请求植物健康趋势分析
- 验证分析结果的正确性

### 4. 用户操作记录
- 记录用户照料操作
- 验证操作效果评估

### 5. 个性化建议
- 获取基于设备数据的个性化建议
- 验证建议的相关性

### 6. 异常检测
- 检测传感器数据中的异常模式
- 验证异常检测的准确性

## 测试输出

测试完成后会显示详细的测试报告：

```
============================================================
集成测试报告
============================================================
✓ 通过 - 云端服务健康检查 (123ms)
✓ 通过 - 数据上传和检索 (456ms)
✓ 通过 - 健康趋势分析 (234ms)
✓ 通过 - 用户操作记录 (189ms)
✓ 通过 - 个性化建议 (145ms)
✓ 通过 - 异常检测 (267ms)
============================================================
总计: 6/6 通过 (100.0%)
============================================================
```

## 故障排查

### 连接错误

如果遇到连接错误：

1. 确认云端服务正在运行
2. 检查防火墙设置
3. 验证URL配置是否正确

### 数据库错误

如果遇到数据库错误：

1. 确认MongoDB正在运行
2. 检查数据库连接字符串
3. 验证数据库权限

### 超时错误

如果测试超时：

1. 增加超时时间（修改 `CONFIG.timeout`）
2. 检查网络连接
3. 确认服务器性能

## 持续集成

可以将集成测试添加到CI/CD流程中：

```yaml
# .github/workflows/integration-test.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:latest
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd cloud-service && npm install
          cd ../integration && npm install
      
      - name: Start cloud service
        run: cd cloud-service && npm start &
        
      - name: Wait for service
        run: sleep 10
      
      - name: Run integration tests
        run: cd integration && npm test
```

## 扩展测试

要添加新的集成测试：

1. 在 `integration-test.ts` 中创建新的测试函数
2. 遵循现有的测试模式
3. 将测试添加到 `runIntegrationTests()` 函数中
4. 更新本README文档

## 性能基准

集成测试也可以用于性能基准测试：

- **云端API响应时间**: < 500ms
- **数据上传延迟**: < 1s
- **分析计算时间**: < 2s

## 支持

如有问题，请查看：
- [系统集成文档](./system-integration.md)
- [项目README](../README.md)
- [问题追踪](https://github.com/your-org/ai-plant-care-robot/issues)
