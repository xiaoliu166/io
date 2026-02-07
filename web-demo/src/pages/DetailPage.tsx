import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import DeviceCard from '../components/DeviceCard';
import DataChart from '../components/DataChart';
import StatusIndicator from '../components/StatusIndicator';
import '../pages/Pages.css';

/** 植物详情页（原首页：单株监控 + 快捷操作 + 数据趋势） */
export default function DetailPage() {
  const navigate = useNavigate();
  const {
    plants,
    currentPlantId,
    setCurrentPlantId,
    sensorDataByPlantId,
    statusByPlantId,
    isSimulatingByPlantId,
    toggleSimulate,
    waterPlant,
    moveToLight,
  } = useApp();

  const plant = plants.find(p => p.id === currentPlantId) ?? plants[0];
  const plantId = plant?.id;
  const sensorData = plantId ? (sensorDataByPlantId[plantId] ?? []) : [];
  const status = plantId ? (statusByPlantId[plantId]) : null;
  const isSimulating = plantId ? !!isSimulatingByPlantId[plantId] : false;
  const latestData = sensorData[sensorData.length - 1];

  useEffect(() => {
    if (plants.length > 0 && !currentPlantId) setCurrentPlantId(plants[0].id);
  }, [plants, currentPlantId, setCurrentPlantId]);

  if (!plant || !status) {
    return (
      <div className="page">
        <p className="empty-tip">暂无植物，请先在首页添加并选择一株植物</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          去首页
        </button>
      </div>
    );
  }

  return (
    <div className="page detail-page">
      <header className="page-header">
        <div className="header-row">
          <h1>🌱 {plant.name}</h1>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>
            切换植物
          </button>
        </div>
        <p className="page-subtitle">实时状态 · 快捷操作</p>
      </header>

      <main className="page-main">
        <div className="status-section">
          <StatusIndicator status={status} />
          <div className="control-panel">
            <button
              className={`btn ${isSimulating ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => toggleSimulate(plantId)}
            >
              {isSimulating ? '⏹ 停止模拟' : '▶ 开始模拟'}
            </button>
            <button
              className="btn btn-success"
              onClick={() => waterPlant(plantId)}
              disabled={!status.needsWater}
            >
              💧 一键浇水
            </button>
            <button
              className="btn btn-warning"
              onClick={() => moveToLight(plantId)}
              disabled={!status.needsLight}
            >
              ☀️ 调光照
            </button>
          </div>
        </div>

        <div className="device-section">
          <DeviceCard
            deviceName={plant.name}
            status={status}
            latestData={latestData}
          />
        </div>

        <div className="recommendations-section card">
          <h3>💡 个性化建议</h3>
          <div className="recommendations">
            {status.needsWater && (
              <div className="recommendation warning">
                <span className="icon">💧</span>
                <div>
                  <strong>需要浇水</strong>
                  <p>土壤湿度低于30%，建议立即浇水</p>
                </div>
              </div>
            )}
            {status.needsLight && (
              <div className="recommendation warning">
                <span className="icon">☀️</span>
                <div>
                  <strong>光照不足</strong>
                  <p>光照强度低于500lux，建议移到窗边</p>
                </div>
              </div>
            )}
            {status.isHealthy && (
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

        <details className="chart-collapse card">
          <summary>📊 数据趋势（可折叠）</summary>
          <DataChart data={sensorData} />
        </details>
      </main>
    </div>
  );
}
