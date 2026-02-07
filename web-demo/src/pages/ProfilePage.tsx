import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import '../pages/Pages.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, careRecords } = useApp();

  const menuGroups = [
    {
      title: '常用功能',
      items: [
        { label: '我的养护记录', path: '/profile/records', icon: '📋', count: careRecords.length },
        { label: '我的植物库', path: '/', icon: '🪴' },
        { label: '植物品种识别', path: '/profile/tools/identify', icon: '🔍' },
        { label: '浇水计算器', path: '/profile/tools/calculator', icon: '🧮' },
      ],
    },
    {
      title: '系统功能',
      items: [
        { label: '设置', path: '/profile/settings', icon: '⚙️', desc: '通知、账号、设备连接' },
        { label: '帮助与反馈', path: '/profile/help', icon: '❓', desc: '常见问题、意见提交' },
        { label: '关于我们', path: '/profile/about', icon: 'ℹ️' },
      ],
    },
  ];

  return (
    <div className="page profile-page">
      <header className="page-header">
        <h1>👤 我的</h1>
      </header>

      <main className="page-main">
        <div className="profile-card card">
          <div className="profile-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt="" />
            ) : (
              <span className="avatar-placeholder">🌱</span>
            )}
          </div>
          <div className="profile-info">
            <h2>{user.nickname}</h2>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setUser({ nickname: prompt('输入昵称', user.nickname) || user.nickname })}
            >
              编辑资料
            </button>
          </div>
        </div>

        {menuGroups.map(g => (
          <div key={g.title} className="menu-group">
            <h3 className="menu-group-title">{g.title}</h3>
            <ul className="menu-list card">
              {g.items.map(item => (
                <li key={item.path}>
                  <button
                    type="button"
                    className="menu-item"
                    onClick={() => navigate(item.path)}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    <span className="menu-label">{item.label}</span>
                    {item.count != null && item.count > 0 && (
                      <span className="menu-badge">{item.count}</span>
                    )}
                    {item.desc && <span className="menu-desc">{item.desc}</span>}
                    <span className="menu-arrow">→</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </main>
    </div>
  );
}
