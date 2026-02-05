/**
 * 应用导航器
 * 定义应用的导航结构
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// 导入屏幕
import DeviceManagementScreen from '../screens/DeviceManagementScreen';
import DataVisualizationScreen from '../screens/DataVisualizationScreen';
import UserInteractionScreen from '../screens/UserInteractionScreen';
import NotificationHistoryScreen from '../screens/NotificationHistoryScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import DeviceSetupScreen from '../screens/DeviceSetupScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/**
 * 主标签导航器
 */
const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Devices"
        component={DeviceManagementScreen}
        options={{
          tabBarLabel: '设备',
          tabBarIcon: ({ color, size }) => (
            <Icon name="flower" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Data"
        component={DataVisualizationScreen}
        options={{
          tabBarLabel: '数据',
          tabBarIcon: ({ color, size }) => (
            <Icon name="chart-line" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Interaction"
        component={UserInteractionScreen}
        options={{
          tabBarLabel: '交互',
          tabBarIcon: ({ color, size }) => (
            <Icon name="hand-heart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationHistoryScreen}
        options={{
          tabBarLabel: '通知',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bell" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * 应用导航器
 */
export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="DeviceSetup" component={DeviceSetupScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </Stack.Navigator>
  );
};
