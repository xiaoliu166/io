/**
 * 主题上下文
 * 提供应用主题管理
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Theme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  error: string;
  success: string;
  warning: string;
}

const lightTheme: Theme = {
  primary: '#4CAF50',
  secondary: '#8BC34A',
  background: '#FFFFFF',
  text: '#000000',
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FFC107',
};

const darkTheme: Theme = {
  primary: '#66BB6A',
  secondary: '#9CCC65',
  background: '#121212',
  text: '#FFFFFF',
  error: '#EF5350',
  success: '#66BB6A',
  warning: '#FFCA28',
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
