/**
 * 通知设置界面
 * 允许用户配置推送通知的各种选项
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationService, NotificationConfig } from '../services/NotificationService';

interface NotificationSettingsScreenProps {
  navigation: any;
}

export const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({
  navigation,
}) => {
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationService] = useState(() => new NotificationService());

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const currentConfig = notificationService.getConfig();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Failed to load notification config:', error);
      Alert.alert('错误', '加载通知设置失败');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<NotificationConfig>) => {
    try {
      if (!config) return;

      const newConfig = { ...config, ...updates };
      await notificationService.updateConfig(updates);
      setConfig(newConfig);
    } catch (error) {
      console.error('Failed to update notification config:', error);
      Alert.alert('错误', '更新通知设置失败');
    }
  };

  const handleQuietHoursPress = () => {
    Alert.alert(
      '静音时段',
      '设置静音时段功能',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '设置', 
          onPress: () => {
            // 这里可以打开时间选择器
            console.log('Open time picker for quiet hours');
          }
        },
      ]
    );
  };

  const testNotification = async () => {
    try {
      const success = await notificationService.sendLocalNotification({
        id: `test_${Date.now()}`,
        title: '🌱 测试通知',
        message: '这是一条测试通知，用于验证通知功能是否正常工作',
        type: 'plant_care',
        priority: 'normal',
      });

      if (success) {
        Alert.alert('成功', '测试通知已发送');
      } else {
        Alert.alert('失败', '测试通知发送失败');
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      Alert.alert('错误', '发送测试通知时出错');
    }
  };

  if (loading || !config) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 标题 */}
        <View style={styles.header}>
          <Text style={styles.title}>通知设置</Text>
          <Text style={styles.subtitle}>管理推送通知和提醒设置</Text>
        </View>

        {/* 总开关 */}
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>启用通知</Text>
              <Text style={styles.settingDescription}>
                接收植物照料提醒和系统通知
              </Text>
            </View>
            <Switch
              value={config.enabled}
              onValueChange={(value) => updateConfig({ enabled: value })}
              trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
              thumbColor={config.enabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* 通知类型 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知类型</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>🌱 植物照料提醒</Text>
              <Text style={styles.settingDescription}>
                浇水、光照等照料提醒
              </Text>
            </View>
            <Switch
              value={config.categories.plantCare}
              onValueChange={(value) => 
                updateConfig({ 
                  categories: { ...config.categories, plantCare: value } 
                })
              }
              disabled={!config.enabled}
              trackColor={{ false: '#E5E5E5', true: '#4CAF50' }}
              thumbColor={config.categories.plantCare ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>⚠️ 系统警告</Text>
              <Text style={styles.settingDescription}>
                设备故障、传感器异常等警告
              </Text>
            </View>
            <Switch
              value={config.categories.systemAlerts}
              onValueChange={(value) => 
                updateConfig({ 
                  categories: { ...config.categories, systemAlerts: value } 
                })
              }
              disabled={!config.enabled}
              trackColor={{ false: '#E5E5E5', true: '#FF9800' }}
              thumbColor={config.categories.systemAlerts ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>🔋 低电量提醒</Text>
              <Text style={styles.settingDescription}>
                设备电量不足提醒
              </Text>
            </View>
            <Switch
              value={config.categories.lowBattery}
              onValueChange={(value) => 
                updateConfig({ 
                  categories: { ...config.categories, lowBattery: value } 
                })
              }
              disabled={!config.enabled}
              trackColor={{ false: '#E5E5E5', true: '#FF5722' }}
              thumbColor={config.categories.lowBattery ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>📵 设备离线</Text>
              <Text style={styles.settingDescription}>
                设备连接断开提醒
              </Text>
            </View>
            <Switch
              value={config.categories.deviceOffline}
              onValueChange={(value) => 
                updateConfig({ 
                  categories: { ...config.categories, deviceOffline: value } 
                })
              }
              disabled={!config.enabled}
              trackColor={{ false: '#E5E5E5', true: '#9E9E9E' }}
              thumbColor={config.categories.deviceOffline ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* 通知方式 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知方式</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>🔊 声音</Text>
              <Text style={styles.settingDescription}>
                通知时播放提示音
              </Text>
            </View>
            <Switch
              value={config.soundEnabled}
              onValueChange={(value) => updateConfig({ soundEnabled: value })}
              disabled={!config.enabled}
              trackColor={{ false: '#E5E5E5', true: '#2196F3' }}
              thumbColor={config.soundEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>📳 振动</Text>
              <Text style={styles.settingDescription}>
                通知时设备振动
              </Text>
            </View>
            <Switch
              value={config.vibrationEnabled}
              onValueChange={(value) => updateConfig({ vibrationEnabled: value })}
              disabled={!config.enabled}
              trackColor={{ false: '#E5E5E5', true: '#2196F3' }}
              thumbColor={config.vibrationEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* 静音时段 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>静音时段</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, !config.enabled && styles.disabledItem]}
            onPress={handleQuietHoursPress}
            disabled={!config.enabled}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, !config.enabled && styles.disabledText]}>
                🌙 静音时段
              </Text>
              <Text style={[styles.settingDescription, !config.enabled && styles.disabledText]}>
                {config.quietHours.start} - {config.quietHours.end}
              </Text>
            </View>
            <Text style={[styles.arrow, !config.enabled && styles.disabledText]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 测试和管理 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>测试和管理</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, !config.enabled && styles.disabledItem]}
            onPress={testNotification}
            disabled={!config.enabled}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, !config.enabled && styles.disabledText]}>
                🧪 发送测试通知
              </Text>
              <Text style={[styles.settingDescription, !config.enabled && styles.disabledText]}>
                测试通知功能是否正常
              </Text>
            </View>
            <Text style={[styles.arrow, !config.enabled && styles.disabledText]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => navigation.navigate('NotificationHistory')}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>📋 通知历史</Text>
              <Text style={styles.settingDescription}>
                查看最近的通知记录
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* FCM Token 信息（开发模式） */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>开发信息</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>FCM Token</Text>
                <Text style={styles.tokenText} numberOfLines={3}>
                  {notificationService.getFCMToken() || '未获取'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  arrow: {
    fontSize: 20,
    color: '#CCCCCC',
    fontWeight: '300',
  },
  disabledItem: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#CCCCCC',
  },
  tokenText: {
    fontSize: 12,
    color: '#999999',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
  },
});