import React from 'react';
import type { PlantStatus } from '../types';
import './PlantMood.css';

interface PlantMoodProps {
  status: PlantStatus | null;
  plantName?: string;
}

type MoodKey = 'healthy' | 'thirsty' | 'gloomy' | 'tired';

const MOODS: { key: MoodKey; label: string; labelEn: string; emoji: string; condition: string }[] = [
  { key: 'healthy', label: '开心', labelEn: 'Healthy', emoji: '😊', condition: '湿润 (Soil ≥30%) & 阳光充足 (Light ≥500lux)' },
  { key: 'thirsty', label: '口渴', labelEn: 'Thirsty', emoji: '😵', condition: '缺水预警 (Soil <30%)' },
  { key: 'gloomy', label: '阴郁', labelEn: 'Gloomy', emoji: '😢', condition: '光照不足 (Light <500lux)' },
  { key: 'tired', label: '疲惫', labelEn: 'Tired', emoji: '😩', condition: '低电量 (<20%)' },
];

function getCurrentMood(status: PlantStatus | null): MoodKey | null {
  if (!status) return null;
  if (status.batteryLevel < 20) return 'tired';
  if (status.needsWater && status.needsLight) return 'thirsty'; // 优先显示口渴
  if (status.needsWater) return 'thirsty';
  if (status.needsLight) return 'gloomy';
  if (status.isHealthy) return 'healthy';
  return 'healthy';
}

export default function PlantMood({ status, plantName }: PlantMoodProps) {
  const current = getCurrentMood(status);

  return (
    <section className="plant-mood card">
      <h2 className="plant-mood-title">读懂它的情绪：环境数据的直观转译</h2>
      {plantName && <p className="plant-mood-subtitle">当前：{plantName}</p>}
      {!status ? (
        <p className="plant-mood-empty">选择一株植物，查看它的情绪</p>
      ) : (
        <div className="plant-mood-grid">
          {MOODS.map(m => {
            const isActive = current === m.key;
            return (
              <div
                key={m.key}
                className={`plant-mood-panel ${isActive ? 'active' : ''}`}
                data-mood={m.key}
              >
                <div className="plant-mood-emoji">{m.emoji}</div>
                <div className="plant-mood-label">
                  {m.label} <span className="plant-mood-label-en">({m.labelEn})</span>
                </div>
                <div className="plant-mood-condition">{m.condition}</div>
                {isActive && <div className="plant-mood-current-tag">当前状态</div>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
