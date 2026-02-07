import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import AllPlantsOverview, { getIndividualMoodEmoji, getIndividualSay } from '../components/AllPlantsOverview';
import '../pages/Pages.css';
import '../pages/HomePage.layout.css';

export default function HomePage() {
  const navigate = useNavigate();
  const {
    plants,
    currentPlantId,
    setCurrentPlantId,
    sensorDataByPlantId,
    statusByPlantId,
    addPlant,
  } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newVariety, setNewVariety] = useState('');

  useEffect(() => {
    if (plants.length > 0 && !currentPlantId) setCurrentPlantId(plants[0].id);
  }, [plants, currentPlantId, setCurrentPlantId]);

  const getLatestSensor = (plantId: string) => {
    const arr = sensorDataByPlantId[plantId];
    if (!arr || arr.length === 0) return null;
    return arr[arr.length - 1];
  };

  const handleAdd = () => {
    const name = newName.trim() || '新植物';
    addPlant(name, newVariety.trim() || undefined);
    setNewName('');
    setNewVariety('');
    setShowAdd(false);
  };

  const getStatusColor = (plantId: string) => {
    const s = statusByPlantId[plantId];
    if (!s) return '#9E9E9E';
    if (s.isHealthy) return '#4CAF50';
    if (s.needsWater && s.needsLight) return '#f44336';
    return '#FF9800';
  };

  const getStatusIcon = (plantId: string) => {
    const s = statusByPlantId[plantId];
    if (!s) return '🌱';
    if (s.isHealthy) return '✨';
    if (s.needsWater && s.needsLight) return '⚠️';
    if (s.needsWater) return '💧';
    if (s.needsLight) return '☀️';
    return '🌱';
  };

  return (
    <div className="page home-page layout-375">
      <header className="page-header compact">
        <h1>🪴 我的植物</h1>
      </header>

      <AllPlantsOverview
        plants={plants}
        statusByPlantId={statusByPlantId}
        getLatestSensor={getLatestSensor}
        setCurrentPlantId={setCurrentPlantId}
      />

      <main className="page-main home-main">
        {showAdd && (
          <div className="card add-plant-form">
            <h3>添加新植物</h3>
            <div className="form-group">
              <label>名称</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="如：办公室绿萝"
              />
            </div>
            <div className="form-group">
              <label>品种（选填）</label>
              <input
                type="text"
                value={newVariety}
                onChange={e => setNewVariety(e.target.value)}
                placeholder="如：绿萝、多肉"
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>
                取消
              </button>
              <button type="button" className="btn btn-primary" onClick={handleAdd}>
                添加
              </button>
            </div>
          </div>
        )}

        <ul className="plants-list-v2">
          {plants.map(p => {
            const status = statusByPlantId[p.id];
            const latest = getLatestSensor(p.id);
            const moodEmoji = getIndividualMoodEmoji(status);
            const say = getIndividualSay(status, p.name);
            return (
              <li key={p.id} className="plant-row-v2">
                <button
                  type="button"
                  className="plant-row-v2-inner"
                  onClick={() => {
                    setCurrentPlantId(p.id);
                    navigate('/detail');
                  }}
                >
                  <div className="plant-row-v2-left">
                    <div
                      className="plant-thumb-v2"
                      style={{ background: getStatusColor(p.id), color: '#fff' }}
                    >
                      {getStatusIcon(p.id)}
                    </div>
                    <span className="plant-mood-v2" aria-hidden>{moodEmoji}</span>
                  </div>
                  <div className="plant-row-v2-middle">
                    <span className="plant-name-v2">{p.name}{p.variety ? `（${p.variety}）` : ''}</span>
                    <span className="plant-say-v2">{say}</span>
                  </div>
                  <div className="plant-row-v2-right">
                    {latest ? (
                      <span className="plant-data-v2">
                        湿度 {Math.round(latest.moisture)}% | 光照 {Math.round(latest.light)}lux
                      </span>
                    ) : (
                      <span className="plant-data-v2">--</span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {plants.length === 0 && !showAdd && (
          <p className="empty-tip">还没有植物，点击下方按钮添加</p>
        )}

        <div className="home-add-plant-wrap">
          <button
            type="button"
            className="btn btn-primary home-add-plant-btn"
            onClick={() => setShowAdd(true)}
          >
            + 添加新植物
          </button>
        </div>

        <div className="home-entry-area">
          <button
            type="button"
            className="btn btn-entry"
            onClick={() => navigate('/encyclopedia')}
          >
            植物百科 / 养护知识
          </button>
          <button
            type="button"
            className="btn btn-entry"
            onClick={() => navigate('/profile')}
          >
            AI 养护助手
          </button>
        </div>
      </main>
    </div>
  );
}
