import React from 'react';
import './StatusIndicator.css';

interface StatusIndicatorProps {
  status: {
    isHealthy: boolean;
    needsWater: boolean;
    needsLight: boolean;
    batteryLevel: number;
  };
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getLEDColor = () => {
    if (status.isHealthy) return '#4CAF50'; // 绿色
    if (status.needsWater) return '#FFEB3B'; // 黄色
    if (status.needsLight) return '#f44336'; // 红色
    return '#9E9E9E'; // 灰色
  };

  const getStatusMessage = () => {
    if (status.isHealthy) return '植物状态良好 🌱';
    if (status.needsWater && status.needsLight) return '需要浇水和光照 ⚠️';
    if (status.needsWater) return '需要浇水 💧';
    if (status.needsLight) return '需要更多光照 ☀️';
    return '监测中...';
  };

  return (
    <div className="status-indicator card">
      <h3>实时状态</h3>
      
      <div className="led-display">
        <div className="led-container">
          <div
            className="led-light"
            style={{
              background: getLEDColor(),
              boxShadow: `0 0 20px ${getLEDColor()}, 0 0 40px ${getLEDColor()}`,
            }}
          >
            <div className="led-pulse" style={{ background: getLEDColor() }} />
          </div>
          <span className="led-label">状态指示灯</span>
        </div>
      </div>

      <div className="status-message">
        <p>{getStatusMessage()}</p>
      </div>

      <div className="status-details">
        <div className={`status-item ${status.needsWater ? 'alert' : 'ok'}`}>
          <span className="status-icon">💧</span>
          <span className="status-text">
            {status.needsWater ? '需要浇水' : '水分充足'}
          </span>
        </div>

        <div className={`status-item ${status.needsLight ? 'alert' : 'ok'}`}>
          <span className="status-icon">☀️</span>
          <span className="status-text">
            {status.needsLight ? '光照不足' : '光照充足'}
          </span>
        </div>

        <div className={`status-item ${status.batteryLevel < 20 ? 'alert' : 'ok'}`}>
          <span className="status-icon">🔋</span>
          <span className="status-text">
            {status.batteryLevel < 20 ? '电量低' : '电量正常'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatusIndicator;
