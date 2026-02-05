import React from 'react';
import './DeviceCard.css';

interface DeviceCardProps {
  deviceName: string;
  status: {
    isHealthy: boolean;
    needsWater: boolean;
    needsLight: boolean;
    batteryLevel: number;
  };
  latestData?: {
    moisture: number;
    light: number;
    temperature: number;
    humidity: number;
  };
}

const DeviceCard: React.FC<DeviceCardProps> = ({ deviceName, status, latestData }) => {
  const getStatusColor = () => {
    if (status.isHealthy) return '#4CAF50';
    if (status.needsWater && status.needsLight) return '#f44336';
    return '#FF9800';
  };

  const getStatusText = () => {
    if (status.isHealthy) return '健康';
    if (status.needsWater && status.needsLight) return '需要照料';
    if (status.needsWater) return '需要浇水';
    if (status.needsLight) return '需要光照';
    return '正常';
  };

  const getStatusIcon = () => {
    if (status.isHealthy) return '✨';
    if (status.needsWater && status.needsLight) return '⚠️';
    if (status.needsWater) return '💧';
    if (status.needsLight) return '☀️';
    return '🌱';
  };

  return (
    <div className="device-card card">
      <div className="device-header">
        <div className="device-icon" style={{ background: getStatusColor() }}>
          {getStatusIcon()}
        </div>
        <div className="device-info">
          <h3>{deviceName}</h3>
          <span className="device-status" style={{ color: getStatusColor() }}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {latestData && (
        <div className="sensor-readings">
          <div className="reading">
            <span className="reading-icon">💧</span>
            <div className="reading-info">
              <span className="reading-label">土壤湿度</span>
              <span className="reading-value">{latestData.moisture.toFixed(1)}%</span>
            </div>
          </div>

          <div className="reading">
            <span className="reading-icon">☀️</span>
            <div className="reading-info">
              <span className="reading-label">光照强度</span>
              <span className="reading-value">{latestData.light.toFixed(0)} lux</span>
            </div>
          </div>

          <div className="reading">
            <span className="reading-icon">🌡️</span>
            <div className="reading-info">
              <span className="reading-label">温度</span>
              <span className="reading-value">{latestData.temperature.toFixed(1)}°C</span>
            </div>
          </div>

          <div className="reading">
            <span className="reading-icon">💨</span>
            <div className="reading-info">
              <span className="reading-label">空气湿度</span>
              <span className="reading-value">{latestData.humidity.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="battery-section">
        <span className="battery-label">电池电量</span>
        <div className="battery-bar">
          <div
            className="battery-fill"
            style={{
              width: `${status.batteryLevel}%`,
              background: status.batteryLevel > 20 ? '#4CAF50' : '#f44336',
            }}
          />
        </div>
        <span className="battery-value">{status.batteryLevel.toFixed(0)}%</span>
      </div>
    </div>
  );
};

export default DeviceCard;
