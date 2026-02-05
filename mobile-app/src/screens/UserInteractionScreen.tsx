/**
 * 用户交互记录界面
 * 显示用户照料行为历史和植物状态变化追踪
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { useSelectedDevice } from '@/contexts/DeviceContext';
import { 
  UserInteractionService, 
  UserAction, 
  PlantStatusChange, 
  InteractionSummary,
  CarePattern 
} from '@/services/UserInteractionService';
import { Header } from '@/components/Header';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';

export const UserInteractionScreen: React.FC = () => {
  const selectedDevice = useSelectedDevice();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userActions, setUserActions] = useState<UserAction[]>([]);
  const [statusChanges, setStatusChanges] = useState<PlantStatusChange[]>([]);
  const [interactionSummary, setInteractionSummary] = useState<InteractionSummary | null>(null);
  const [carePatterns, setCarePatterns] = useState<CarePattern[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<'actions' | 'changes' | 'patterns'>('actions');
  const [showAddActionModal, setShowAddActionModal] = useState(false);
  const [newActionType, setNewActionType] = useState<'watered' | 'moved_to_light' | 'fertilized' | 'manual_check'>('watered');
  const [newActionNotes, setNewActionNotes] = useState('');

  const userInteractionService = new UserInteractionService();

  // 加载数据
  const loadData = useCallback(async () => {
    if (!selectedDevice) {
      setLoading(false);
      return;
    }

    try {
      const [
        actionsResult,
        changesResult,
        summaryResult,
        patternsResult,
        recommendationsResult,
      ] = await Promise.all([
        userInteractionService.getUserActionHistory(selectedDevice.id, 30),
        userInteractionService.getStatusChangeHistory(selectedDevice.id, 30),
        userInteractionService.generateInteractionSummary(selectedDevice.id, 7),
        userInteractionService.analyzeCarePatterns(selectedDevice.id, 30),
        userInteractionService.getActionRecommendations(selectedDevice.id),
      ]);

      setUserActions(actionsResult);
      setStatusChanges(changesResult);
      setInteractionSummary(summaryResult);
      setCarePatterns(patternsResult);
      setRecommendations(recommendationsResult);
    } catch (error) {
      console.error('Failed to load interaction data:', error);
      Alert.alert('错误', '加载数据失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 添加新操作
  const handleAddAction = async () => {
    if (!selectedDevice) return;

    try {
      await userInteractionService.recordUserAction({
        deviceId: selectedDevice.id,
        actionType: newActionType,
        notes: newActionNotes.trim() || undefined,
        sensorDataBefore: selectedDevice.status ? {
          soilHumidity: selectedDevice.status.soilMoisture,
          airHumidity: 50, // 默认值，实际应该从设备获取
          temperature: selectedDevice.status.temperature,
          lightIntensity: selectedDevice.status.lightLevel,
          timestamp: Date.now(),
        } : undefined,
      });

      setShowAddActionModal(false);
      setNewActionNotes('');
      await loadData();
      
      Alert.alert('成功', '操作记录已添加');
    } catch (error) {
      Alert.alert('错误', '添加操作记录失败');
    }
  };

  // 获取操作类型显示名称
  const getActionDisplayName = (actionType: string): string => {
    const displayNames: Record<string, string> = {
      watered: '浇水',
      moved_to_light: '移至光照处',
      fertilized: '施肥',
      touched: '触摸互动',
      manual_check: '手动检查',
    };
    return displayNames[actionType] || actionType;
  };

  // 获取状态显示名称
  const getStateDisplayName = (state: string): string => {
    const displayNames: Record<string, string> = {
      healthy: '健康',
      needs_water: '需要浇水',
      needs_light: '需要光照',
      critical: '紧急状态',
    };
    return displayNames[state] || state;
  };

  // 获取操作效果颜色
  const getEffectivenessColor = (effectiveness?: string): string => {
    switch (effectiveness) {
      case 'positive':
        return '#4CAF50';
      case 'negative':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  // 渲染标签栏
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'actions', label: '操作记录' },
        { key: 'changes', label: '状态变化' },
        { key: 'patterns', label: '照料模式' },
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabButton,
            selectedTab === tab.key && styles.tabButtonActive,
          ]}
          onPress={() => setSelectedTab(tab.key as any)}
        >
          <Text
            style={[
              styles.tabButtonText,
              selectedTab === tab.key && styles.tabButtonTextActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // 渲染交互摘要
  const renderInteractionSummary = () => {
    if (!interactionSummary) return null;

    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.sectionTitle}>7天交互摘要</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{interactionSummary.totalActions}</Text>
            <Text style={styles.summaryLabel}>总操作数</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{interactionSummary.statusChanges}</Text>
            <Text style={styles.summaryLabel}>状态变化</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{interactionSummary.careFrequency.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>照料频率/天</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{interactionSummary.effectivenessScore}</Text>
            <Text style={styles.summaryLabel}>效果评分</Text>
          </View>
        </View>

        {/* 建议 */}
        {recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.subsectionTitle}>护理建议</Text>
            {recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationBullet}>•</Text>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // 渲染操作记录
  const renderActionsList = () => (
    <View style={styles.listContainer}>
      {userActions.map((action, index) => (
        <View key={action.id} style={styles.actionItem}>
          <View style={styles.actionHeader}>
            <Text style={styles.actionType}>
              {getActionDisplayName(action.actionType)}
            </Text>
            <Text style={styles.actionTime}>
              {format(action.timestamp, 'MM-dd HH:mm', { locale: zhCN })}
            </Text>
          </View>
          
          {action.notes && (
            <Text style={styles.actionNotes}>{action.notes}</Text>
          )}
          
          <View style={styles.actionFooter}>
            {action.effectiveness && (
              <View
                style={[
                  styles.effectivenessIndicator,
                  { backgroundColor: getEffectivenessColor(action.effectiveness) },
                ]}
              />
            )}
            
            {action.duration && (
              <Text style={styles.actionDuration}>
                持续 {Math.round(action.duration / 1000 / 60)} 分钟
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  // 渲染状态变化
  const renderStatusChangesList = () => (
    <View style={styles.listContainer}>
      {statusChanges.map((change, index) => (
        <View key={change.id} style={styles.statusChangeItem}>
          <View style={styles.statusChangeHeader}>
            <Text style={styles.statusChangeText}>
              {getStateDisplayName(change.previousState)} → {getStateDisplayName(change.newState)}
            </Text>
            <Text style={styles.statusChangeTime}>
              {format(change.timestamp, 'MM-dd HH:mm', { locale: zhCN })}
            </Text>
          </View>
          
          <Text style={styles.statusChangeTrigger}>
            触发原因: {change.trigger === 'sensor_change' ? '传感器变化' : 
                     change.trigger === 'user_action' ? '用户操作' : '系统更新'}
          </Text>
        </View>
      ))}
    </View>
  );

  // 渲染照料模式
  const renderCarePatterns = () => (
    <View style={styles.listContainer}>
      {carePatterns.map((pattern, index) => (
        <View key={index} style={styles.patternItem}>
          <Text style={styles.patternType}>
            {getActionDisplayName(pattern.actionType)}
          </Text>
          
          <View style={styles.patternDetails}>
            <View style={styles.patternDetailRow}>
              <Text style={styles.patternDetailLabel}>频率:</Text>
              <Text style={styles.patternDetailValue}>
                {pattern.frequency.toFixed(1)} 次/周
              </Text>
            </View>
            
            <View style={styles.patternDetailRow}>
              <Text style={styles.patternDetailLabel}>平均间隔:</Text>
              <Text style={styles.patternDetailValue}>
                {Math.round(pattern.averageInterval)} 小时
              </Text>
            </View>
            
            <View style={styles.patternDetailRow}>
              <Text style={styles.patternDetailLabel}>偏好时间:</Text>
              <Text style={styles.patternDetailValue}>{pattern.preferredTime}</Text>
            </View>
            
            <View style={styles.patternDetailRow}>
              <Text style={styles.patternDetailLabel}>效果评分:</Text>
              <Text style={styles.patternDetailValue}>{pattern.effectiveness}%</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  // 渲染添加操作模态框
  const renderAddActionModal = () => (
    <Modal
      visible={showAddActionModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddActionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>添加操作记录</Text>
          
          <Text style={styles.modalLabel}>操作类型</Text>
          <View style={styles.actionTypeSelector}>
            {[
              { key: 'watered', label: '浇水' },
              { key: 'moved_to_light', label: '移至光照处' },
              { key: 'fertilized', label: '施肥' },
              { key: 'manual_check', label: '手动检查' },
            ].map(type => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.actionTypeButton,
                  newActionType === type.key && styles.actionTypeButtonActive,
                ]}
                onPress={() => setNewActionType(type.key as any)}
              >
                <Text
                  style={[
                    styles.actionTypeButtonText,
                    newActionType === type.key && styles.actionTypeButtonTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.modalLabel}>备注（可选）</Text>
          <TextInput
            style={styles.notesInput}
            value={newActionNotes}
            onChangeText={setNewActionNotes}
            placeholder="添加操作备注..."
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.modalButtons}>
            <Button
              title="取消"
              onPress={() => setShowAddActionModal(false)}
              variant="secondary"
              style={styles.modalButton}
            />
            <Button
              title="添加"
              onPress={handleAddAction}
              style={styles.modalButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!selectedDevice) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="交互记录" showBack={true} />
        <EmptyState
          title="未选择设备"
          message="请先在设备管理中选择一个设备"
          actionText="去选择设备"
          onAction={() => {/* 导航到设备管理 */}}
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="交互记录" showBack={true} />
        <LoadingSpinner message="正在加载交互数据..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="交互记录" 
        showBack={true}
        rightComponent={
          <TouchableOpacity onPress={() => setShowAddActionModal(true)}>
            <Text style={styles.addButton}>添加</Text>
          </TouchableOpacity>
        }
      />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 设备信息 */}
        <View style={styles.deviceInfoContainer}>
          <Text style={styles.deviceName}>{selectedDevice.name}</Text>
          <Text style={styles.deviceStatus}>
            {selectedDevice.isConnected ? '已连接' : '未连接'}
          </Text>
        </View>

        {/* 交互摘要 */}
        {renderInteractionSummary()}

        {/* 标签栏 */}
        {renderTabBar()}

        {/* 内容区域 */}
        {selectedTab === 'actions' && renderActionsList()}
        {selectedTab === 'changes' && renderStatusChangesList()}
        {selectedTab === 'patterns' && renderCarePatterns()}
      </ScrollView>

      {/* 添加操作模态框 */}
      {renderAddActionModal()}
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  addButton: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceInfoContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceStatus: {
    fontSize: 14,
    color: '#666',
  },
  summaryContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  recommendationsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recommendationBullet: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 8,
    marginTop: 2,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#4CAF50',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666',
  },
  tabButtonTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  listContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
  },
  actionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionTime: {
    fontSize: 12,
    color: '#666',
  },
  actionNotes: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  effectivenessIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  actionDuration: {
    fontSize: 12,
    color: '#666',
  },
  statusChangeItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusChangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusChangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusChangeTime: {
    fontSize: 12,
    color: '#666',
  },
  statusChangeTrigger: {
    fontSize: 14,
    color: '#666',
  },
  patternItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  patternType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  patternDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  patternDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  patternDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  patternDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  actionTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  actionTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
  },
  actionTypeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  actionTypeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  actionTypeButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});