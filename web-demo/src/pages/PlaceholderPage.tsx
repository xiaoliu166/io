import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../pages/Pages.css';

interface Props {
  title: string;
  backTo: string;
}

export default function PlaceholderPage({ title, backTo }: Props) {
  const navigate = useNavigate();
  return (
    <div className="page">
      <header className="page-header with-back">
        <button type="button" className="back-btn" onClick={() => navigate(backTo)}>← 返回</button>
        <h1>{title}</h1>
      </header>
      <main className="page-main">
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
          该功能开发中，敬请期待。
        </div>
      </main>
    </div>
  );
}
