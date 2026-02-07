import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import DeviceCard from '../components/DeviceCard';
import DataChart from '../components/DataChart';
import StatusIndicator from '../components/StatusIndicator';
import '../pages/Pages.css';

export default function PlantDetailPage() {
  const { plantId } = useParams<{ plantId: string }>();
  const navigate = useNavigate();
  const {
    plants,
    sensorDataByPlantId,
    statusByPlantId,
    isSimulatingByPlantId,
    toggleSimulate,
    waterPlant,
    moveToLight,
  } = useApp();

  const plant = plants.find(p => p.id === plantId);
  const sensorData = plantId ? (sensorDataByPlantId[plantId] ?? []) : [];
  const status = plantId ? statusByPlantId[plantId] : null;
  const isSimulating = plantId ? !!isSimulatingByPlantId[plantId] : false;
  const latestData = sensorData[sensorData.length - 1];

  if (!plant || !status) {
    return (
      <div className="page">
        <p className="empty-tip">未找到该植物</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div className="page detail-page">
      <header className="page-header with-back">
        <button type="button" className="back-btn" onClick={() => navigate('/')} aria-label="返回">
          ← 返回
        </button>
        <h1>🌱 {plant.name}</h1>
        {plant.variety && <p className="page-subtitle">{plant.variety}</p>}
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
              💧 浇水
            </button>
            <button
              className="btn btn-warning"
              onClick={() => moveToLight(plantId)}
              disabled={!status.needsLight}
            >
              ☀️ 移到光照处
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

        <div className="chart-section">
          <DataChart data={sensorData} />
        </div>

        <div className="recommendations-section card">
          <h3>💡 建议</h3>
          {status.needsWater && (
            <div className="recommendation warning">
              <span className="icon">💧</span>
              <div>
                <strong>需要浇水</strong>
                <p>土壤湿度偏低，建议浇水</p>
              </div>
            </div>
          )}
          {status.needsLight && (
            <div className="recommendation warning">
              <span className="icon">☀️</span>
              <div>
                <strong>光照不足</strong>
                <p>建议移到窗边或补光</p>
              </div>
            </div>
          )}
          {status.isHealthy && (
            <div className="recommendation success">
              <span className="icon">✨</span>
              <div>
                <strong>状态良好</strong>
                <p>继续保持当前养护习惯</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
