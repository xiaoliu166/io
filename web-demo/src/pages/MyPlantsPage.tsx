import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import '../pages/Pages.css';

export default function MyPlantsPage() {
  const navigate = useNavigate();
  const { plants, statusByPlantId, setCurrentPlantId, addPlant } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newVariety, setNewVariety] = useState('');

  const handleAdd = () => {
    const name = newName.trim() || '新植物';
    addPlant(name, newVariety.trim() || undefined);
    setNewName('');
    setNewVariety('');
    setShowAdd(false);
    navigate('/');
  };

  const handleSelectPlant = (plantId: string) => {
    setCurrentPlantId(plantId);
    navigate('/');
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

  const getStatusColor = (plantId: string) => {
    const s = statusByPlantId[plantId];
    if (!s) return '#9E9E9E';
    if (s.isHealthy) return '#4CAF50';
    if (s.needsWater && s.needsLight) return '#f44336';
    return '#FF9800';
  };

  return (
    <div className="page plants-page">
      <header className="page-header">
        <h1>🪴 我的植物</h1>
        <p className="page-subtitle">管理所有已添加的绿植</p>
      </header>

      <main className="page-main">
        <div className="plants-actions">
          <button
            type="button"
            className="btn btn-primary add-plant-btn"
            onClick={() => setShowAdd(true)}
          >
            + 添加新植物
          </button>
          <p className="hint">支持扫码添加或下方手动输入品种</p>
        </div>

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

        <ul className="plants-list">
          {plants.map(p => (
            <li key={p.id} className="plant-item card">
              <button
                type="button"
                className="plant-item-btn"
                onClick={() => handleSelectPlant(p.id)}
              >
                <div
                  className="plant-thumb"
                  style={{ background: getStatusColor(p.id), color: '#fff' }}
                >
                  {getStatusIcon(p.id)}
                </div>
                <div className="plant-info">
                  <span className="plant-item-name">{p.name}</span>
                  <span className="plant-item-variety">{p.variety || '未分类'}</span>
                  <span className="plant-item-status" style={{ color: getStatusColor(p.id) }}>
                    {statusByPlantId[p.id]?.isHealthy ? '健康' : '需关注'}
                  </span>
                </div>
                <span className="plant-arrow">→</span>
              </button>
            </li>
          ))}
        </ul>

        {plants.length === 0 && !showAdd && (
          <p className="empty-tip">还没有植物，点击「添加新植物」开始</p>
        )}
      </main>
    </div>
  );
}
