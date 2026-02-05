/**
 * 通知历史界面
 * 显示最近的通知记录和统计信息
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { 
  NotificationService, 
  NotificationHistory, 
  PushNotificationData 
} from '../services/NotificationService';

interface NotificationHistoryScreenProps {
  navigation: any;
}

interface NotificationStats {
  total: number;
  delivered: number;
  opened: number;
  byType: Record<string, number>;
}

export const NotificationHistoryScreen: React.FC<NotificationHistoryScreenProps> = ({
  navigation,
}) => {
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationService] = useState(() => new NotificationService());

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const historyData = await notificationService.getNotificationHistory(30); // 30天
      setHistory(historyData);
      
      // 计算统计信息
      const statsData = calculateStats(historyData);
      setStats(statsData);
      
    } catch (error) {
      console.error('Failed to load notification history:', error);
      Alert.alert('错误', '加载通知历史失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const calculateStats = (historyData: NotificationHistory[]): NotificationStats => {
    const stats: NotificationStats = {
      total: historyData.length,
      delivered: historyData.filter(item => item.delivered).length,
      opened: historyData.filter(item => item.opened).length,
      byType: {},
    };

    historyData.forEach(item => {
      const type = item.notification.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  };

  const getTypeDisplayName = (type: string): string => {
    const typeNames: Record<string, string> = {
      plant_care: '植物照料',
      system_alert: '系统警告',
      low_battery: '低电量',
      device_offline: '设备离线',
    };
    return typeNames[type] || type;
  };

  const getTypeIcon = (type: string): string => {
    const typeIcons: Record<string, string> = {
      plant_care: '🌱',
      system_alert: '⚠️',
      low_battery: '🔋',
      device_offline: '📵',
    };
    return typeIcons[type] || '📱';
  };

  const getTypeColor = (type: string): string => {
    const typeColors: Record<string, string> = {
      plant_care: '#4CAF50',
      system_alert: '#FF9800',
      low_battery: '#FF5722',
      device_offline: '#9E9E9E',
    };
    return typeColors[type] || '#2196F3';
  };

  const getPriorityColor = (priority: string): string => {
    const priorityColors: Record<string, string> = {
      low: '#9E9E9E',
      normal: '#2196F3',
      high: '#FF9800',
      urgent: '#F44336',
    };
    return priorityColors[priority] || '#2196F3';
  };

  const clearHistory = () => {
    Alert.alert(
      '清除历史',
      '确定要清除所有通知历史记录吗？此操作无法撤销。',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '清除', 
          style: 'destructive',
          onPress: async () => {
            try {
              // 这里应该调用清除历史的API
              setHistory([]);
              setStats(calculateStats([]));
              Alert.alert('成功', '通知历史已清除');
            } catch (error) {
              Alert.alert('错误', '清除历史失败');
            }
          }
        },
      ]
    );
  };

  const renderNotificationItem = ({ item }: { item: NotificationHistory }) => {
    const typeColor = getTypeColor(item.notification.type);
    const priorityColor = getPriorityColor(item.notification.priority);
    
    return (
      <TouchableOpacity style={styles.notificationItem}>
        <View style={styles.notificationHeader}>
          <View style={styles.typeContainer}>
            <Text style={styles.typeIcon}>
              {getTypeIcon(item.notification.type)}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
              <Text style={styles.typeText}>
                {getTypeDisplayName(item.notification.type)}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusContainer}>
            {item.delivered && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>已送达</Text>
              </View>
            )}
            {item.opened && (
              <View style={[styles.statusBadge, styles.openedBadge]}>
                <Text style={[styles.statusText, styles.openedText]}>已查看</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.notificationTitle}>
          {item.notification.title}
        </Text>
        
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.notification.message}
        </Text>

        <View style={styles.notificationFooter}>
          <Text style={styles.timestamp}>
            {format(item.timestamp, 'MM月dd日 HH:mm', { locale: zhCN })}
          </Text>
          
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
            <Text style={styles.priorityText}>
              {item.notification.priority}
            </Text>
          </View>
        </View>

        {item.deviceId && (
          <Text style={styles.deviceId}>
            设备: {item.deviceId.slice(-8)}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderStats = () => {
    if (!stats) return null;

    const deliveryRate = stats.total > 0 ? (stats.delivered / stats.total * 100).toFixed(1) : '0';
    const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(1) : '0';

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>统计信息（最近30天）</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>总通知数</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{deliveryRate}%</Text>
            <Text style={styles.statLabel}>送达率</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{openRate}%</Text>
            <Text style={styles.statLabel}>查看率</Text>
          </View>
        </View>

        <View style={styles.typeStats}>
          <Text style={styles.typeStatsTitle}>按类型统计</Text>
          {Object.entries(stats.byType).map(([type, count]) => (
            <View key={type} style={styles.typeStatItem}>
              <View style={styles.typeStatInfo}>
                <Text style={styles.typeStatIcon}>
                  {getTypeIcon(type)}
                </Text>
                <Text style={styles.typeStatName}>
                  {getTypeDisplayName(type)}
                </Text>
              </View>
              <Text style={styles.typeStatCount}>{count}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📭</Text>
      <Text style={styles.emptyTitle}>暂无通知历史</Text>
      <Text style={styles.emptyMessage}>
        当您收到推送通知时，记录将显示在这里
      </Text>
    </View>
  );

  if (loading) {
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
      <View style={styles.header}>
        <Text style={styles.title}>通知历史</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={clearHistory} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>清除</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificationItem}
        ListHeaderComponent={renderStats}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        contentContainerStyle={history.length === 0 ? styles.emptyList : undefined}
        showsVerticalScrollIndicator={false}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FF5722',
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  typeStats: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  typeStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  typeStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typeStatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeStatIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  typeStatName: {
    fontSize: 14,
    color: '#333333',
  },
  typeStatCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  notificationItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    marginLeft: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#666666',
  },
  openedBadge: {
    backgroundColor: '#4CAF50',
  },
  openedText: {
    color: '#FFFFFF',
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  deviceId: {
    fontSize: 12,
    color: '#999999',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
});