import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import BottomNav from './components/BottomNav';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import PlantDetailPage from './pages/PlantDetailPage';
import ProfilePage from './pages/ProfilePage';
import EncyclopediaPage from './pages/EncyclopediaPage';
import CareRecordsPage from './pages/CareRecordsPage';
import PlaceholderPage from './pages/PlaceholderPage';
import './App.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app">
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/detail" element={<DetailPage />} />
              <Route path="/plant/:plantId" element={<PlantDetailPage />} />
              <Route path="/plants" element={<HomePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/records" element={<CareRecordsPage />} />
              <Route path="/profile/settings" element={<PlaceholderPage title="⚙️ 设置" backTo="/profile" />} />
              <Route path="/profile/help" element={<PlaceholderPage title="❓ 帮助与反馈" backTo="/profile" />} />
              <Route path="/profile/about" element={<PlaceholderPage title="ℹ️ 关于我们" backTo="/profile" />} />
              <Route path="/profile/tools/identify" element={<PlaceholderPage title="🔍 植物品种识别" backTo="/profile" />} />
              <Route path="/profile/tools/calculator" element={<PlaceholderPage title="🧮 浇水计算器" backTo="/profile" />} />
              <Route path="/encyclopedia" element={<EncyclopediaPage />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
