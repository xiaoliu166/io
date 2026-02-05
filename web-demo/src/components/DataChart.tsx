import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import './DataChart.css';

interface SensorData {
  timestamp: Date;
  moisture: number;
  light: number;
  temperature: number;
  humidity: number;
}

interface DataChartProps {
  data: SensorData[];
}

const DataChart: React.FC<DataChartProps> = ({ data }) => {
  const chartData = data.map(d => ({
    time: d.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    湿度: d.moisture.toFixed(1),
    光照: (d.light / 10).toFixed(1), // 缩放以便显示
    温度: d.temperature.toFixed(1),
    空气湿度: d.humidity.toFixed(1),
  }));

  return (
    <div className="data-chart card">
      <h3>📊 环境数据趋势</h3>
      <p className="chart-description">过去2小时的环境监测数据（每5分钟采集一次）</p>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="time"
            stroke="#666"
            style={{ fontSize: '0.85rem' }}
          />
          <YAxis stroke="#666" style={{ fontSize: '0.85rem' }} />
          <Tooltip
            contentStyle={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '10px',
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="湿度"
            stroke="#2196F3"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="土壤湿度 (%)"
          />
          <Line
            type="monotone"
            dataKey="光照"
            stroke="#FF9800"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="光照强度 (×10 lux)"
          />
          <Line
            type="monotone"
            dataKey="温度"
            stroke="#f44336"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="温度 (°C)"
          />
          <Line
            type="monotone"
            dataKey="空气湿度"
            stroke="#4CAF50"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="空气湿度 (%)"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="chart-legend-info">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#2196F3' }} />
          <span>土壤湿度 - 目标: &gt;30%</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#FF9800' }} />
          <span>光照强度 - 目标: &gt;500 lux</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#f44336' }} />
          <span>温度 - 适宜: 20-28°C</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#4CAF50' }} />
          <span>空气湿度 - 适宜: 50-70%</span>
        </div>
      </div>
    </div>
  );
};

export default DataChart;
