# AI智能植物养护机器人 - 系统集成文档

## 概述

本文档描述了AI智能植物养护机器人三个主要组件的集成方案：
1. **嵌入式固件** (ESP32-S3)
2. **移动应用** (React Native)
3. **云端服务** (Node.js + MongoDB)

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     用户交互层                                │
│                   (移动应用 UI)                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   移动应用服务层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ DeviceManager│  │Notification  │  │Visualization │      │
│  │              │  │Service       │  │Service       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
         │                                        │
         │ Wi-Fi/BLE                             │ HTTPS
         ↓                                        ↓
┌──────────────────────┐              ┌──────────────────────┐
│   嵌入式固件层        │              │    云端服务层         │
│  ┌────────────────┐  │              │  ┌────────────────┐  │
│  │ SensorManager  │  │              │  │ DataSyncService│  │
│  │ StateManager   │  │              │  │ AnalysisService│  │
│  │ AlertManager   │  │              │  │ REST API       │  │
│  │ WiFiManager    │  │              │  └────────────────┘  │
│  └────────────────┘  │              │         │            │
└──────────────────────┘              │         ↓            │
         │                             │  ┌────────────────┐  │
         ↓                             │  │   MongoDB      │  │
┌──────────────────────┐              │  └────────────────┘  │
│   硬件传感器层        │              └──────────────────────┘
│  - 温湿度传感器       │
│  - 光感传感器         │
│  - 触摸传感器         │
│  - RGB LED           │
│  - 扬声器            │
└──────────────────────┘
```

## 数据流管道

### 1. 传感器数据流

```
传感器读取 → 数据验证 → 状态评估 → 本地存储
                                    ↓
                            LED/音效反馈
                                    ↓
                            Wi-Fi上传 → 云端存储 → 数据分析
                                                      ↓
                            移动应用 ← 推送通知 ← 异常检测
```

### 2. 用户操作流

```
移动应用操作 → 设备命令 → 固件执行 → 状态更新
                                        ↓
                                  反馈显示
                                        ↓
                                  云端记录
```

## 通信协议

### 固件 ↔ 移动应用

**协议**: WebSocket over Wi-Fi
**端口**: 8080
**数据格式**: JSON

#### 消息类型

1. **状态更新** (固件 → 移动应用)
```json
{
  "type": "status_update",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "moisture": 45.5,
    "light": 650,
    "temperature": 22.3,
    "batteryLevel": 85,
    "isHealthy": true,
    "needsWater": false,
    "needsLight": false
  }
}
```

2. **命令请求** (移动应用 → 固件)
```json
{
  "type": "command",
  "command": "get_status" | "set_config" | "trigger_alert",
  "params": {}
}
```

3. **配置更新** (移动应用 → 固件)
```json
{
  "type": "config_update",
  "config": {
    "moistureThreshold": 30,
    "lightThreshold": 500,
    "alertInterval": 30
  }
}
```

### 移动应用 ↔ 云端服务

**协议**: HTTPS REST API
**基础URL**: `https://api.plantcare.example.com/v1`

#### API端点

1. **上传设备数据**
```
POST /sync/device-data
Content-Type: application/json

{
  "deviceId": "device-001",
  "timestamp": "2024-01-01T12:00:00Z",
  "sensorData": {
    "moisture": 45.5,
    "light": 650,
    "temperature": 22.3
  },
  "deviceStatus": {
    "isOnline": true,
    "lastSeen": "2024-01-01T12:00:00Z"
  }
}
```

2. **获取健康趋势**
```
GET /analysis/health-trend/:deviceId?startDate=2024-01-01&endDate=2024-01-07
```

3. **获取个性化建议**
```
GET /analysis/recommendations/:deviceId
```

## 集成配置

### 环境变量

#### 固件配置 (firmware/src/config.h)
```cpp
// Wi-Fi配置
#define WIFI_SSID "your-wifi-ssid"
#define WIFI_PASSWORD "your-wifi-password"

// 服务器配置
#define WEBSOCKET_PORT 8080
#define CLOUD_API_URL "https://api.plantcare.example.com/v1"

// 传感器阈值
#define DEFAULT_MOISTURE_THRESHOLD 30
#define DEFAULT_LIGHT_THRESHOLD 500
```

#### 移动应用配置 (.env)
```
API_BASE_URL=https://api.plantcare.example.com/v1
WEBSOCKET_TIMEOUT=5000
DEVICE_DISCOVERY_TIMEOUT=10000
```

#### 云端服务配置 (.env)
```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/plantcare
JWT_SECRET=your-secret-key
```

## 部署流程

### 1. 固件部署

```bash
cd firmware
pio run --target upload
pio device monitor
```

### 2. 云端服务部署

```bash
cd cloud-service
npm install
npm run build
npm start
```

### 3. 移动应用部署

```bash
cd mobile-app
npm install

# iOS
npm run ios

# Android
npm run android
```

## 测试策略

### 集成测试场景

1. **完整数据流测试**
   - 传感器读取 → 固件处理 → 移动应用显示 → 云端存储

2. **离线恢复测试**
   - 断网情况下固件继续工作
   - 网络恢复后数据同步

3. **多设备管理测试**
   - 移动应用同时管理多个设备
   - 设备状态独立更新

4. **异常处理测试**
   - 传感器故障处理
   - 网络中断恢复
   - 电量不足处理

## 性能指标

### 目标性能

- **启动时间**: < 30秒
- **数据采集间隔**: 5分钟
- **状态更新延迟**: < 2秒
- **云端API响应**: < 500ms
- **移动应用响应**: < 100ms

### 资源使用

- **固件内存**: < 200KB
- **固件功耗**: < 0.5W (正常), < 0.1W (省电)
- **移动应用内存**: < 100MB
- **云端服务CPU**: < 50%

## 故障排查

### 常见问题

1. **设备无法连接Wi-Fi**
   - 检查SSID和密码配置
   - 确认Wi-Fi信号强度
   - 重启设备

2. **移动应用无法发现设备**
   - 确认设备和手机在同一网络
   - 检查防火墙设置
   - 重启移动应用

3. **云端数据不同步**
   - 检查网络连接
   - 验证API密钥
   - 查看服务器日志

## 安全考虑

### 数据安全

- 所有API通信使用HTTPS
- 设备认证使用JWT令牌
- 敏感数据加密存储

### 隐私保护

- 用户数据仅用于功能实现
- 不收集个人身份信息
- 支持数据导出和删除

## 维护和更新

### OTA更新

固件支持空中更新(OTA)：
```cpp
// 检查更新
if (updateAvailable()) {
  downloadAndInstallUpdate();
  reboot();
}
```

### 版本兼容性

- 固件版本: v1.0.0
- 移动应用版本: v1.0.0
- 云端API版本: v1
- 最低兼容版本: v1.0.0

## 监控和日志

### 日志级别

- **ERROR**: 系统错误，需要立即处理
- **WARN**: 警告信息，可能影响功能
- **INFO**: 一般信息，正常运行日志
- **DEBUG**: 调试信息，开发使用

### 监控指标

- 设备在线率
- API响应时间
- 错误率
- 用户活跃度
