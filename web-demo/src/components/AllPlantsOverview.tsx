import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Plant, PlantStatus, SensorData } from '../types';
import './AllPlantsOverview.css';

interface AllPlantsOverviewProps {
  plants: Plant[];
  statusByPlantId: Record<string, PlantStatus>;
  getLatestSensor: (plantId: string) => SensorData | null;
  setCurrentPlantId: (id: string) => void;
}

function getMoodEmoji(status: PlantStatus | null): string {
  if (!status) return '🌱';
  if (status.isHealthy) return '😌';
  if (status.needsWater && status.needsLight) return '😰';
  if (status.needsWater) return '😵';
  if (status.needsLight) return '😢';
  return '😐';
}

function getIndividualMoodEmoji(status: PlantStatus | null): string {
  if (!status) return '🌱';
  if (status.isHealthy) return '😊';
  if (status.needsWater && status.needsLight) return '😰';
  if (status.needsWater) return '😵';
  if (status.needsLight) return '😢';
  return '😐';
}

function getIndividualSay(status: PlantStatus | null, name: string): string {
  if (!status) return `AI 说：暂无数据`;
  if (status.isHealthy) return `AI 说：我状态不错，继续保持～`;
  if (status.needsWater && status.needsLight) return `AI 说：我渴了且有点暗，帮帮我～`;
  if (status.needsWater) return `AI 说：我喝饱水会更开心～`;
  if (status.needsLight) return `AI 说：我喝饱水啦，光照再多点会更精神～`;
  return `AI 说：我有点平淡，需要一点照顾～`;
}

export default function AllPlantsOverview({
  plants,
  statusByPlantId,
  getLatestSensor,
  setCurrentPlantId,
}: AllPlantsOverviewProps) {
  const navigate = useNavigate();

  if (plants.length === 0) {
    return (
      <section className="all-plants-overview" style={{ minHeight: 130 }}>
        <div className="overview-emoji">🪴</div>
        <p className="overview-mood-text">还没有植物，添加一株开始吧</p>
        <p className="overview-data-text">添加后将显示整体情绪与数据解读</p>
      </section>
    );
  }

  const statuses = plants.map(p => statusByPlantId[p.id]).filter(Boolean) as PlantStatus[];
  const allHealthy = statuses.length > 0 && statuses.every(s => s.isHealthy);
  const needAttentionCount = statuses.filter(s => !s.isHealthy).length;
  const needAttentionPlant = plants.find(p => !statusByPlantId[p.id]?.isHealthy);

  const latestList = plants.map(p => getLatestSensor(p.id)).filter(Boolean) as SensorData[];
  const avgMoisture = latestList.length
    ? Math.round(latestList.reduce((a, d) => a + d.moisture, 0) / latestList.length)
    : 0;
  const avgLight = latestList.length
    ? Math.round(latestList.reduce((a, d) => a + d.light, 0) / latestList.length)
    : 0;
  const adaptPercent = allHealthy ? 90 : Math.max(50, 90 - needAttentionCount * 15);

  const overallEmoji = allHealthy ? '😌' : needAttentionCount >= plants.length ? '😐' : '🙂';
  const moodText = allHealthy
    ? `当前所有植物都很惬意～整体环境适配度 ${adaptPercent}%！`
    : needAttentionCount === 0
      ? `当前所有植物都很惬意～整体环境适配度 ${adaptPercent}%！`
      : `有 ${needAttentionCount} 株需要关注，整体环境适配度 ${adaptPercent}%`;

  const lowLightPlant = plants.find(p => {
    const s = statusByPlantId[p.id];
    const d = getLatestSensor(p.id);
    return s?.needsLight && d && d.light < 500;
  });
  const dataText = lowLightPlant
    ? `AI 综合解读：所有植物平均土壤湿度 ${avgMoisture}%、光照 ${avgLight}lux，仅 1 株${lowLightPlant.name}光照略低（已标注）`
    : `AI 综合解读：所有植物平均土壤湿度 ${avgMoisture}%、光照 ${avgLight}lux，环境良好`;

  return (
    <section className="all-plants-overview">
      <div className="overview-emoji" aria-hidden>{overallEmoji}</div>
      <p className="overview-mood-text">{moodText}</p>
      <p className="overview-data-text">{dataText}</p>
      {needAttentionPlant && (
        <button
          type="button"
          className="overview-quick-link"
          onClick={() => {
            setCurrentPlantId(needAttentionPlant.id);
            navigate('/detail');
          }}
        >
          查看待关注植物
        </button>
      )}
    </section>
  );
}

export { getMoodEmoji, getIndividualMoodEmoji, getIndividualSay };
