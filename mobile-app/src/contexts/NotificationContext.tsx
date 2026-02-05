/**
 * 通知上下文
 * 提供应用级通知管理
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NotificationManager } from '../services/NotificationManager';

interface NotificationContextType {
  notificationManager: NotificationManager;
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notificationManager] = useState(() => new NotificationManager());
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = async () => {
    const count = await notificationManager.getUnreadCount();
    setUnreadCount(count);
  };

  useEffect(() => {
    // 初始化通知管理器
    notificationManager.initialize();
    refreshUnreadCount();

    // 设置定期刷新
    const interval = setInterval(refreshUnreadCount, 30000); // 每30秒刷新

    return () => {
      clearInterval(interval);
    };
  }, [notificationManager]);

  return (
    <NotificationContext.Provider value={{ notificationManager, unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
