# AI智能植物养护机器人 v1.0

一个桌面/小盆栽场景的"萌系植物小帮手"，提供基础监测、简单反馈和萌系交互功能。

## 项目结构

```
ai-plant-care-robot/
├── firmware/           # ESP32-S3 嵌入式固件
├── mobile-app/         # React Native 移动应用
├── cloud-service/      # 云端服务
├── shared/            # 共享类型定义和接口
├── tests/             # 集成测试
└── docs/              # 项目文档
```

## 核心特性

- 🌱 **环境监测**: 温湿度+光照强度实时监测
- 🎨 **萌系交互**: LED状态显示+触摸反馈+可爱音效
- 🔋 **低功耗**: 待机<0.1W，续航≥72小时
- 📱 **移动应用**: 数据可视化+成长记录+推送通知
- ☁️ **端云协同**: 80%本地处理，20%云端分析

## 快速开始

### 嵌入式固件开发
```bash
cd firmware
# 使用 PlatformIO 或 Arduino IDE 开发
```

### 移动应用开发
```bash
cd mobile-app
npm install
npm run start
```

### 测试
```bash
npm test
```

## 技术栈

- **硬件**: ESP32-S3, 温湿度传感器, 光感传感器, RGB LED, 扬声器
- **固件**: C++/Arduino, FreeRTOS
- **移动端**: React Native, TypeScript
- **云端**: Node.js, Express
- **测试**: Jest, fast-check (属性测试)

## 许可证

MIT License