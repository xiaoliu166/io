import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './BottomNav.css';

const tabs = [
  { path: '/', label: '首页', icon: '🪴' },
  { path: '/detail', label: '植物详情', icon: '🌱' },
  { path: '/encyclopedia', label: '植物百科', icon: '📚' },
  { path: '/profile', label: '我的', icon: '👤' },
];

export default function BottomNav() {
  const location = useLocation();
  const isSubPage = /^\/plant\/.+/.test(location.pathname) || /^\/profile\//.test(location.pathname);
  const showNav = !isSubPage;

  if (!showNav) return null;

  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <NavLink
          key={t.path}
          to={t.path}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          end={t.path === '/'}
        >
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
