/**
 * 设备管理界面
 * 显示设备列表、连接状态和管理操作
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDevice, ConnectedDevice } from '@/contexts/DeviceContext';
import { DeviceCard } from '@/components/DeviceCard';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';

export const DeviceManagementScreen: React.FC = () => {
  const { state, actions } = useDevice();
  const [refreshing, setRefreshing] = useState(false);

  // 处理下拉刷新
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await actions.refreshDevices();
    } finally {
      setRefreshing(false);
    }
  };

  // 开始设备发现
  const handleStartDiscovery = async () => {
    try {
      await actions.startDiscovery();
    } catch (error) {
      Alert.alert('错误', '无法开始设备扫描，请检查蓝牙权限');
    }
  };

  // 停止设备发现
  const handleStopDiscovery = () => {
    actions.stopDiscovery();
  };

  // 连接设备
  const handleConnectDevice = async (device: ConnectedDevice) => {
    if (device.isConnected) {
      // 如果已连接，则断开
      Alert.alert(
        '断开连接',
        `确定要断开与 ${device.name} 的连接吗？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '断开',
            style: 'destructive',
            onPress: () => actions.disconnectDevice(device.id),
          },
        ]
      );
    } else {
      // 如果未连接，则连接
      const success = await actions.connectDevice(device.id);
      if (success) {
        Alert.alert('成功', `已连接到 ${device.name}`);
      }
    }
  };

  // 配对设备
  const handlePairDevice = async (device: ConnectedDevice) => {
    Alert.alert(
      '配对设备',
      `确定要配对 ${device.name} 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '配对',
          onPress: async () => {
            const success = await actions.pairDevice(device.id, device.name);
            if (success) {
              Alert.alert('成功', `${device.name} 已配对成功`);
            }
          },
        },
      ]
    );
  };

  // 取消配对设备
  const handleUnpairDevice = (device: ConnectedDevice) => {
    Alert.alert(
      '取消配对',
      `确定要取消配对 ${device.name} 吗？这将删除所有相关数据。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => actions.unpairDevice(device.id),
        },
      ]
    );
  };

  // 选择设备
  const handleSelectDevice = (device: ConnectedDevice) => {
    actions.selectDevice(device.id);
    Alert.alert('设备已选择', `当前选择的设备：${device.name}`);
  };

  // 渲染设备项
  const renderDeviceItem = ({ item }: { item: ConnectedDevice }) => (
    <DeviceCard
      device={item}
      isSelected={item.id === state.selectedDeviceId}
      onConnect={() => handleConnectDevice(item)}
      onPair={() => handlePairDevice(item)}
      onUnpair={() => handleUnpairDevice(item)}
      onSelect={() => handleSelectDevice(item)}
    />
  );

  // 渲染空状态
  const renderEmptyState = () => (
    <EmptyState
      title="未发现设备"
      message="请确保您的植物养护机器人已开机并处于配对模式"
      actionText="开始扫描"
      onAction={handleStartDiscovery}
    />
  );

  // 清除错误
  const handleClearError = () => {
    actions.clearError();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="设备管理"
        showBack={true}
      />
      
      {/* 错误提示 */}
      {state.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
          <TouchableOpacity onPress={handleClearError} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>关闭</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 扫描控制 */}
      <View style={styles.scanControls}>
        {state.isScanning ? (
          <Button
            title="停止扫描"
            onPress={handleStopDiscovery}
            variant="secondary"
            icon="stop"
          />
        ) : (
          <Button
            title="扫描设备"
            onPress={handleStartDiscovery}
            icon="search"
          />
        )}
        
        {state.isScanning && (
          <View style={styles.scanningIndicator}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.scanningText}>正在扫描设备...</Text>
          </View>
        )}
      </View>

      {/* 设备列表 */}
      <FlatList
        data={state.devices}
        renderItem={renderDeviceItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* 连接状态指示器 */}
      {state.isConnecting && (
        <View style={styles.connectingOverlay}>
          <View style={styles.connectingModal}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.connectingText}>正在连接设备...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    flex: 1,
  },
  errorButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f44336',
    borderRadius: 4,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scanControls: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  scanningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  connectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  connectingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});