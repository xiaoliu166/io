import React, { useState, useEffect } from 'react';
import './App.css';
import DeviceCard from './components/DeviceCard';
import DataChart from './components/DataChart';
import StatusIndicator from './components/StatusIndicator';

interface SensorData {
  timestamp: Date;
  moisture: number;
  light: number;
  temperature: number;
  humidity: number;
}

interface PlantStatus {
  isHealthy: boolean;
  needsWater: boolean;
  needsLight: boolean;
  batteryLevel: number;
}

function App() {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [currentStatus, setCurrentStatus] = useState<PlantStatus>({
    isHealthy: true,
    needsWater: false,
    needsLight: false,
    batteryLevel: 85,
  });
  const [isSimulating, setIsSimulating] = useState(false);

  // 模拟传感器数据
  const generateSensorData = (): SensorData => {
    const baseTime = Date.now();
    return {
      timestamp: new Date(baseTime),
      moisture: 30 + Math.random() * 40,
      light: 400 + Math.random() * 400,
      temperature: 20 + Math.random() * 8,
      humidity: 50 + Math.random() * 30,
    };
  };

  // 初始化历史数据
  useEffect(() => {
    const initialData: SensorData[] = [];
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      initialData.push({
        timestamp: new Date(now - i * 5 * 60 * 1000),
        moisture: 40 + Math.random() * 20,
        light: 500 + Math.random() * 300,
        temperature: 22 + Math.random() * 4,
        humidity: 55 + Math.random() * 20,
      });
    }
    setSensorData(initialData);
  }, []);

  // 模拟实时数据更新
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const newData = generateSensorData();
      setSensorData(prev => [...prev.slice(-19), newData]);

      // 更新状态
      setCurrentStatus({
        isHealthy: newData.moisture > 30 && newData.light > 500,
        needsWater: newData.moisture < 30,
        needsLight: newData.light < 500,
        batteryLevel: 85 - Math.random() * 5,
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const handleWaterPlant = () => {
    const newData = generateSensorData();
    newData.moisture = 65 + Math.random() * 10;
    setSensorData(prev => [...prev.slice(-19), newData]);
    setCurrentStatus(prev => ({
      ...prev,
      needsWater: false,
      isHealthy: newData.light > 500,
    }));
  };

  const handleMoveToLight = () => {
    const newData = generateSensorData();
    newData.light = 700 + Math.random() * 200;
    setSensorData(prev => [...prev.slice(-19), newData]);
    setCurrentStatus(prev => ({
      ...prev,
      needsLight: false,
      isHealthy: prev.needsWater ? false : true,
    }));
  };

  const latestData = sensorData[sensorData.length - 1];

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🌱 AI智能植物养护机器人</h1>
          <p>实时监测 · 智能提醒 · 萌系交互</p>
        </div>
      </header>

      <main className="app-main">
        <div className="dashboard">
          {/* 状态卡片 */}
          <div className="status-section">
            <StatusIndicator status={currentStatus} />
            
            <div className="control-panel">
              <button
                className={`btn ${isSimulating ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => setIsSimulating(!isSimulating)}
              >
                {isSimulating ? '⏸ 暂停模拟' : '▶ 开始模拟'}
              </button>
              
              <button
                className="btn btn-success"
                onClick={handleWaterPlant}
                disabled={!currentStatus.needsWater}
              >
                💧 浇水
              </button>
              
              <button
                className="btn btn-warning"
                onClick={handleMoveToLight}
                disabled={!currentStatus.needsLight}
              >
                ☀️ 移到光照处
              </button>
            </div>
          </div>

          {/* 设备卡片 */}
          <div className="device-section">
            <DeviceCard
              deviceName="我的小绿植"
              status={currentStatus}
              latestData={latestData}
            />
          </div>

          {/* 数据图表 */}
          <div className="chart-section">
            <DataChart data={sensorData} />
          </div>

          {/* 建议卡片 */}
          <div className="recommendations-section">
            <div className="card">
              <h3>💡 个性化建议</h3>
              <div className="recommendations">
                {currentStatus.needsWater && (
                  <div className="recommendation warning">
                    <span className="icon">💧</span>
                    <div>
                      <strong>需要浇水</strong>
                      <p>土壤湿度低于30%，建议立即浇水</p>
                    </div>
                  </div>
                )}
                {currentStatus.needsLight && (
                  <div className="recommendation warning">
                    <span className="icon">☀️</span>
                    <div>
                      <strong>光照不足</strong>
                      <p>光照强度低于500lux，建议移到窗边</p>
                    </div>
                  </div>
                )}
                {currentStatus.isHealthy && (
                  <div className="recommendation success">
                    <span className="icon">✨</span>
                    <div>
                      <strong>植物健康</strong>
                      <p>当前环境条件良好，继续保持！</p>
                    </div>
                  </div>
                )}
                <div className="recommendation info">
                  <span className="icon">📊</span>
                  <div>
                    <strong>数据采集正常</strong>
                    <p>每5分钟自动采集环境数据</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>AI智能植物养护机器人 v1.0 | Web演示版</p>
        <p>💚 让植物养护变得简单有趣</p>
      </footer>
    </div>
  );
}

export default App;
