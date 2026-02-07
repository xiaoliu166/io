import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import '../pages/Pages.css';
import '../pages/EncyclopediaPage.layout.css';

const SEARCH_FILTERS = ['AI 解读', '视频教程', '图文指南'];

const AI_CARDS = [
  { id: '1', tag: '为你的绿萝 / 多肉定制', title: '绿萝补光精准指南', summary: 'AI 检测到你家绿萝光照略低，推荐 3 种补光方式，附时长 / 强度参数', match: '98%', bg: 'green' },
  { id: '2', tag: 'AI 预警关联', title: '多肉烂根急救技巧', summary: '近期 100+ 用户咨询同类问题，AI 总结 3 步救根法，避免二次损伤', bg: 'yellow' },
  { id: '3', tag: '季节适配', title: '夏季高温植物保湿攻略', summary: 'AI 结合当地气温（28℃），推荐喷雾 / 通风双模式养护', bg: 'blue' },
];

const CATEGORIES = [
  { id: 'newbie', label: '新手入门' },
  { id: 'variety', label: '品种大全' },
  { id: 'problem', label: '问题排查' },
  { id: 'plan', label: '专属计划' },
];

const KNOWLEDGE_BASE = [
  { id: '1', title: 'AI 实测：绿萝浇水的 3 个误区，90% 新手踩坑', summary: 'AI 分析 1000+ 养护案例，提炼关键：别浇「半截水」', tag: '图文・3 分钟读完', cover: '🪴' },
  { id: '2', title: '多肉度夏指南：控水与遮阴黄金比例', summary: 'AI 根据品种耐热性给出差异化建议', tag: '图文・5 分钟', cover: '🌵' },
  { id: '3', title: '黄叶诊断流程图：从症状到解决方案', summary: 'AI 症状→原因→解决方案三步法', tag: '图文・2 分钟', cover: '🍃' },
  { id: '4', title: '新手必读：3 种零失败入门植物', summary: '绿萝、虎皮兰、多肉养护要点一览', tag: '图文・4 分钟', cover: '🌱' },
  { id: '5', title: '浇水频率公式：AI 计算器用法', summary: '输入盆径与品种，得出建议浇水间隔', tag: '图文・2 分钟', cover: '💧' },
];

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function EncyclopediaPage() {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState(0);
  const [activeCategory, setActiveCategory] = useState('newbie');
  const [toast, setToast] = useState<string | null>(null);
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  const [knowledgeList, setKnowledgeList] = useState(() => shuffle(KNOWLEDGE_BASE).slice(0, 3));

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  const handleBack = () => {
    navigate(-1);
  };

  const handleRefresh = () => {
    setKnowledgeList(shuffle(KNOWLEDGE_BASE).slice(0, 3));
    showToast('已换一批推荐');
  };

  const handleCollect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(collectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollectedIds(next);
    showToast(next.has(id) ? '已加入收藏' : '已取消收藏');
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    showToast('分享功能即将上线');
  };

  const handleKnowledgeClick = (title: string) => {
    showToast(`正在打开：${title.slice(0, 12)}…`);
  };

  const handleCardClick = (title: string) => {
    showToast(`正在加载「${title}」`);
  };

  const handleSearchVoice = () => {
    showToast('语音输入即将上线');
  };

  const handleSearchImage = () => {
    showToast('拍照识别即将上线');
  };

  return (
    <div className="page encyclopedia-page layout-375">
      <header className="ency-header">
        <div className="ency-title-bar">
          <button type="button" className="ency-back" onClick={handleBack} aria-label="返回">
            ←
          </button>
          <h1 className="ency-title">植物百科・AI 养护指南</h1>
        </div>
        <div className="ency-search-wrap">
          <div className="ency-search-box">
            <input
              type="text"
              placeholder="搜索植物品种 / 问题（例：绿萝黄叶 / 多肉浇水）"
              className="ency-search-input"
            />
            <span className="ency-search-icons">
              <button type="button" className="ency-icon-btn" onClick={handleSearchVoice} title="语音">🎤</button>
              <button type="button" className="ency-icon-btn" onClick={handleSearchImage} title="图片">📷</button>
            </span>
          </div>
        </div>
        <div className="ency-filter-bar">
          {SEARCH_FILTERS.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`ency-filter-btn ${searchType === i ? 'active' : ''}`}
              onClick={() => setSearchType(i)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="ency-main">
        <section className="ency-recommend">
          <div className="ency-recommend-scroll">
            {AI_CARDS.map(card => (
              <button
                key={card.id}
                type="button"
                className={`ency-card card-${card.bg}`}
                onClick={() => handleCardClick(card.title)}
              >
                {card.tag && <span className="ency-card-tag">{card.tag}</span>}
                <h3 className="ency-card-title">{card.title}</h3>
                <p className="ency-card-summary">{card.summary}</p>
                {card.match && <span className="ency-card-match">AI 匹配度 {card.match}</span>}
              </button>
            ))}
          </div>
        </section>

        <section className="ency-categories">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              type="button"
              className={`ency-cat-btn ${activeCategory === c.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </section>

        <section className="ency-knowledge">
          <div className="ency-knowledge-head">
            <h2>AI 精选养护知识</h2>
            <button type="button" className="ency-refresh-btn" onClick={handleRefresh}>
              换一批
            </button>
          </div>
          <ul className="ency-knowledge-list">
            {knowledgeList.map(item => (
              <li
                key={item.id}
                className="ency-knowledge-item"
                role="button"
                tabIndex={0}
                onClick={() => handleKnowledgeClick(item.title)}
                onKeyDown={e => e.key === 'Enter' && handleKnowledgeClick(item.title)}
              >
                <div className="ency-k-cover">{item.cover}</div>
                <div className="ency-k-content">
                  <h4 className="ency-k-title">{item.title}</h4>
                  <p className="ency-k-summary">{item.summary}</p>
                  <span className="ency-k-tag">{item.tag}</span>
                </div>
                <div className="ency-k-actions">
                  <button
                    type="button"
                    className={`ency-k-action ${collectedIds.has(item.id) ? 'collected' : ''}`}
                    aria-label="收藏"
                    onClick={e => handleCollect(e, item.id)}
                  >
                    {collectedIds.has(item.id) ? '♥' : '♡'}
                  </button>
                  <button type="button" className="ency-k-action" aria-label="分享" onClick={handleShare}>
                    ↗
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <div className="ency-bottom-bar">
        <button type="button" className="ency-ai-btn" onClick={() => navigate('/profile')}>
          <span className="ency-ai-icon">🤖</span>
          AI 养护助手→ 有问题直接问
        </button>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
