# AI智能植物养护机器人 - 性能优化指南

## 性能目标

根据需求7.5和8.5，系统需要满足以下性能指标：

- **启动时间**: < 30秒
- **算法执行时间**: < 1秒
- **数据采集间隔**: 5分钟
- **状态更新延迟**: < 2秒
- **云端API响应**: < 500ms
- **移动应用响应**: < 100ms

## 固件性能优化

### 1. 启动时间优化

**目标**: < 30秒

**优化策略**:

```cpp
// 并行初始化
void PlantCareRobot::initialize() {
  // 1. 快速启动核心功能
  initializeLED();        // 立即显示状态
  initializeSensors();    // 开始数据采集
  
  // 2. 后台初始化非关键功能
  xTaskCreate(initializeWiFi, "wifi_init", 4096, NULL, 1, NULL);
  xTaskCreate(initializeCloud, "cloud_init", 4096, NULL, 1, NULL);
  
  // 3. 显示启动进度
  showStartupProgress();
}
```

**测量方法**:

```cpp
unsigned long startTime = millis();
robot.initialize();
unsigned long initTime = millis() - startTime;
Serial.printf("启动时间: %lu ms\n", initTime);
```

### 2. 算法执行时间优化

**目标**: < 1秒

**状态评估算法优化**:

```cpp
// 优化前: 每次都重新计算
PlantStatus evaluateState(SensorData data) {
  // 复杂计算...
  return status;
}

// 优化后: 缓存和增量更新
class StateManager {
private:
  PlantStatus cachedStatus;
  unsigned long lastEvalTime = 0;
  const unsigned long EVAL_INTERVAL = 5000; // 5秒
  
public:
  PlantStatus evaluateState(SensorData data) {
    unsigned long now = millis();
    
    // 如果数据没有显著变化，返回缓存
    if (now - lastEvalTime < EVAL_INTERVAL && 
        !hasSignificantChange(data)) {
      return cachedStatus;
    }
    
    // 只在必要时重新计算
    cachedStatus = calculateStatus(data);
    lastEvalTime = now;
    return cachedStatus;
  }
};
```

### 3. 内存优化

**目标**: < 200KB

**策略**:

```cpp
// 使用静态分配而不是动态分配
static char buffer[256];  // 而不是 char* buffer = new char[256];

// 使用环形缓冲区存储历史数据
class RingBuffer {
private:
  static const int SIZE = 100;
  SensorData data[SIZE];
  int head = 0;
  int tail = 0;
  
public:
  void push(SensorData d) {
    data[head] = d;
    head = (head + 1) % SIZE;
    if (head == tail) {
      tail = (tail + 1) % SIZE;
    }
  }
};
```

### 4. 功耗优化

**目标**: 正常 < 0.5W, 省电 < 0.1W

**策略**:

```cpp
void enterPowerSaveMode() {
  // 降低CPU频率
  setCpuFrequencyMhz(80);  // 从240MHz降到80MHz
  
  // 关闭不必要的外设
  WiFi.disconnect();
  WiFi.mode(WIFI_OFF);
  
  // 降低采样频率
  sensorSamplingInterval = 30000;  // 从5秒增加到30秒
  
  // 降低LED亮度
  ledController.setBrightness(20);  // 从100降到20
  
  // 使用深度睡眠
  esp_sleep_enable_timer_wakeup(30 * 1000000);  // 30秒后唤醒
  esp_light_sleep_start();
}
```

## 移动应用性能优化

### 1. 渲染优化

**使用React.memo避免不必要的重渲染**:

```typescript
// 优化前
const DeviceCard = ({ device }) => {
  return <View>...</View>;
};

// 优化后
const DeviceCard = React.memo(({ device }) => {
  return <View>...</View>;
}, (prevProps, nextProps) => {
  // 只在设备状态真正改变时重渲染
  return prevProps.device.status === nextProps.device.status;
});
```

### 2. 数据加载优化

**使用分页和虚拟列表**:

```typescript
import { FlatList } from 'react-native';

const DataVisualization = () => {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(0);
  
  const loadMore = async () => {
    const newData = await fetchData(page, 20);  // 每次加载20条
    setData([...data, ...newData]);
    setPage(page + 1);
  };
  
  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <DataPoint data={item} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
    />
  );
};
```

### 3. 图表性能优化

**使用采样减少数据点**:

```typescript
function downsampleData(data: SensorData[], targetPoints: number): SensorData[] {
  if (data.length <= targetPoints) return data;
  
  const step = Math.floor(data.length / targetPoints);
  return data.filter((_, index) => index % step === 0);
}

// 使用
const chartData = downsampleData(sensorData, 100);  // 最多显示100个点
```

### 4. 网络请求优化

**使用请求缓存和防抖**:

```typescript
import { useCallback } from 'react';
import debounce from 'lodash/debounce';

const useDeviceData = (deviceId: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 缓存
  const cache = useRef(new Map());
  
  // 防抖
  const fetchData = useCallback(
    debounce(async (id: string) => {
      // 检查缓存
      if (cache.current.has(id)) {
        const cached = cache.current.get(id);
        if (Date.now() - cached.timestamp < 60000) {  // 1分钟内使用缓存
          setData(cached.data);
          return;
        }
      }
      
      setLoading(true);
      const result = await api.getDeviceData(id);
      cache.current.set(id, { data: result, timestamp: Date.now() });
      setData(result);
      setLoading(false);
    }, 300),  // 300ms防抖
    []
  );
  
  useEffect(() => {
    fetchData(deviceId);
  }, [deviceId]);
  
  return { data, loading };
};
```

## 云端服务性能优化

### 1. 数据库查询优化

**添加索引**:

```typescript
// Device模型
deviceSchema.index({ deviceId: 1 });
deviceSchema.index({ userId: 1 });

// SensorData模型
sensorDataSchema.index({ deviceId: 1, timestamp: -1 });
sensorDataSchema.index({ timestamp: -1 });

// UserAction模型
userActionSchema.index({ deviceId: 1, userId: 1, timestamp: -1 });
```

**使用聚合管道优化复杂查询**:

```typescript
// 优化前: 多次查询
const device = await Device.findOne({ deviceId });
const sensorData = await SensorData.find({ deviceId }).sort({ timestamp: -1 }).limit(100);
const userActions = await UserAction.find({ deviceId }).sort({ timestamp: -1 }).limit(50);

// 优化后: 使用聚合
const result = await Device.aggregate([
  { $match: { deviceId } },
  {
    $lookup: {
      from: 'sensordata',
      localField: 'deviceId',
      foreignField: 'deviceId',
      as: 'sensorData',
      pipeline: [
        { $sort: { timestamp: -1 } },
        { $limit: 100 }
      ]
    }
  },
  {
    $lookup: {
      from: 'useractions',
      localField: 'deviceId',
      foreignField: 'deviceId',
      as: 'userActions',
      pipeline: [
        { $sort: { timestamp: -1 } },
        { $limit: 50 }
      ]
    }
  }
]);
```

### 2. 缓存策略

**使用Redis缓存热点数据**:

```typescript
import Redis from 'ioredis';

const redis = new Redis();

class CachedDataService {
  async getDeviceData(deviceId: string): Promise<any> {
    // 检查缓存
    const cached = await redis.get(`device:${deviceId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 从数据库获取
    const data = await Device.findOne({ deviceId });
    
    // 缓存5分钟
    await redis.setex(`device:${deviceId}`, 300, JSON.stringify(data));
    
    return data;
  }
  
  async invalidateCache(deviceId: string) {
    await redis.del(`device:${deviceId}`);
  }
}
```

### 3. API响应优化

**使用压缩**:

```typescript
import compression from 'compression';

app.use(compression({
  level: 6,  // 压缩级别
  threshold: 1024,  // 只压缩大于1KB的响应
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

**使用分页**:

```typescript
router.get('/device-history/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;
  
  const data = await SensorData.find({ deviceId })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);
  
  const total = await SensorData.countDocuments({ deviceId });
  
  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});
```

### 4. 异步处理

**使用消息队列处理耗时任务**:

```typescript
import Bull from 'bull';

const analysisQueue = new Bull('analysis', {
  redis: { host: 'localhost', port: 6379 }
});

// 添加任务到队列
router.post('/analyze', async (req, res) => {
  const { deviceId } = req.body;
  
  // 立即返回
  res.json({ success: true, message: '分析任务已提交' });
  
  // 异步处理
  await analysisQueue.add({ deviceId });
});

// 处理任务
analysisQueue.process(async (job) => {
  const { deviceId } = job.data;
  const result = await performComplexAnalysis(deviceId);
  // 保存结果或发送通知
});
```

## 性能监控

### 1. 固件性能监控

```cpp
class PerformanceMonitor {
private:
  unsigned long lastReportTime = 0;
  unsigned long loopCount = 0;
  unsigned long totalLoopTime = 0;
  
public:
  void recordLoop(unsigned long duration) {
    loopCount++;
    totalLoopTime += duration;
    
    // 每分钟报告一次
    if (millis() - lastReportTime > 60000) {
      float avgLoopTime = (float)totalLoopTime / loopCount;
      Serial.printf("平均循环时间: %.2f ms\n", avgLoopTime);
      Serial.printf("循环频率: %.2f Hz\n", 1000.0 / avgLoopTime);
      Serial.printf("空闲内存: %d bytes\n", ESP.getFreeHeap());
      
      loopCount = 0;
      totalLoopTime = 0;
      lastReportTime = millis();
    }
  }
};
```

### 2. API性能监控

```typescript
import { performance } from 'perf_hooks';

// 中间件
app.use((req, res, next) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    console.log(`${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
    
    // 记录慢查询
    if (duration > 500) {
      console.warn(`慢查询警告: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
    }
  });
  
  next();
});
```

### 3. 移动应用性能监控

```typescript
import { InteractionManager } from 'react-native';

const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;
  
  console.log(`${name}: ${duration.toFixed(2)}ms`);
  
  if (duration > 100) {
    console.warn(`性能警告: ${name} 耗时 ${duration.toFixed(2)}ms`);
  }
};

// 使用
measurePerformance('渲染设备列表', () => {
  renderDeviceList();
});
```

## 性能测试

### 1. 负载测试

使用Apache Bench进行API负载测试：

```bash
# 测试数据上传API
ab -n 1000 -c 10 -p data.json -T application/json \
   http://localhost:3000/api/v1/sync/device-data

# 测试数据查询API
ab -n 1000 -c 10 \
   http://localhost:3000/api/v1/sync/device-history/test-device
```

### 2. 压力测试

```bash
# 使用wrk进行压力测试
wrk -t12 -c400 -d30s http://localhost:3000/api/v1/health
```

### 3. 性能分析

```bash
# Node.js性能分析
node --prof server.js
node --prof-process isolate-*.log > processed.txt

# 使用clinic.js
clinic doctor -- node server.js
```

## 性能优化检查清单

### 固件
- [ ] 启动时间 < 30秒
- [ ] 算法执行时间 < 1秒
- [ ] 内存使用 < 200KB
- [ ] 正常功耗 < 0.5W
- [ ] 省电功耗 < 0.1W
- [ ] 数据采集间隔 = 5分钟

### 移动应用
- [ ] 应用启动时间 < 3秒
- [ ] 页面切换 < 100ms
- [ ] 列表滚动流畅 (60fps)
- [ ] 内存使用 < 100MB
- [ ] 网络请求有缓存
- [ ] 图表渲染优化

### 云端服务
- [ ] API响应时间 < 500ms
- [ ] 数据库查询有索引
- [ ] 使用连接池
- [ ] 启用压缩
- [ ] 实现缓存策略
- [ ] 异步处理耗时任务

## 持续优化

1. **定期性能测试**: 每次发布前运行完整的性能测试套件
2. **监控生产环境**: 使用APM工具监控实际性能
3. **用户反馈**: 收集用户关于性能的反馈
4. **性能预算**: 为每个功能设定性能预算
5. **代码审查**: 在代码审查中关注性能问题
