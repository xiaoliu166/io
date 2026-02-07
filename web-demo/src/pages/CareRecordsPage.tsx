import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import '../pages/Pages.css';

export default function CareRecordsPage() {
  const navigate = useNavigate();
  const { careRecords, plants } = useApp();
  const getPlantName = (id: string) => plants.find(p => p.id === id)?.name ?? '未知';

  return (
    <div className="page">
      <header className="page-header with-back">
        <button type="button" className="back-btn" onClick={() => navigate('/profile')}>← 返回</button>
        <h1>📋 我的养护记录</h1>
      </header>
      <main className="page-main">
        <ul className="menu-list card">
          {careRecords.length === 0 ? (
            <li className="empty-tip" style={{ padding: '2rem', textAlign: 'center' }}>
              暂无养护记录，在首页进行浇水或调光后会显示在这里
            </li>
          ) : (
            [...careRecords].reverse().map(r => (
              <li key={r.id}>
                <div className="menu-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
                  <span><strong>{getPlantName(r.plantId)}</strong> · {r.action}</span>
                  <span className="menu-desc">{new Date(r.at).toLocaleString('zh-CN')}</span>
                </div>
              </li>
            ))
          )}
        </ul>
      </main>
    </div>
  );
}
