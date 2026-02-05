/**
 * 设备卡片组件
 * 显示单个设备的信息和操作按钮
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { ConnectedDevice } from '@/contexts/DeviceContext';
import { PlantState } from '@shared/types';

export interface DeviceCardProps {
  device: ConnectedDevice;
  isSelected: boolean;
  onConnect: () => void;
  onPair: () => void;
  onUnpair: () => void;
  onSelect: () => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isSelected,
  onConnect,
  onPair,
  onUnpair,
  onSelect,
}) => {
  // 获取连接状态颜色
  const getConnectionStatusColor = () => {
    if (device.isConnected) {
      return '#4CAF50'; // 绿色
    }
    return '#9E9E9E'; // 灰色
  };

  // 获取连接状态文本
  const getConnectionStatusText = () => {
    if (device.isConnected) {
      return '已连接';
    }
    return '未连接';
  };

  // 获取植物状态颜色
  const getPlantStateColor = (state?: PlantState) => {
    switch (state) {
      case PlantState.HEALTHY:
        return '#4CAF50';
      case PlantState.NEEDS_WATER:
        return '#FF9800';
      case PlantState.NEEDS_LIGHT:
        return '#F44336';
      case PlantState.CRITICAL:
        return '#9C27B0';
      default:
        return '#9E9E9E';
    }
  };

  // 获取植物状态文本
  const getPlantStateText = (state?: PlantState) => {
    switch (state) {
      case PlantState.HEALTHY:
        return '健康';
      case PlantState.NEEDS_WATER:
        return '需要浇水';
      case PlantState.NEEDS_LIGHT:
        return '需要光照';
      case PlantState.CRITICAL:
        return '紧急状态';
      default:
        return '未知';
    }
  };

  // 获取信号强度图标
  const getSignalStrengthIcon = (rssi: number) => {
    if (rssi > -50) return '📶';
    if (rssi > -70) return '📶';
    if (rssi > -80) return '📶';
    return '📶';
  };

  // 格式化最后见到时间
  const formatLastSeen = (date: Date) => {
    return format(date, 'MM-dd HH:mm', { locale: zhCN });
  };

  // 处理长按操作
  const handleLongPress = () => {
    Alert.alert(
      '设备操作',
      `选择对 ${device.name} 的操作`,
      [
        { text: '取消', style: 'cancel' },
        { text: '选择设备', onPress: onSelect },
        { text: '取消配对', style: 'destructive', onPress: onUnpair },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selectedContainer,
      ]}
      onPress={onConnect}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* 设备基本信息 */}
      <View style={styles.header}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.deviceId}>ID: {device.id.slice(-8)}</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getConnectionStatusColor() },
            ]}
          />
          <Text style={styles.statusText}>
            {getConnectionStatusText()}
          </Text>
        </View>
      </View>

      {/* 设备详细信息 */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>信号强度:</Text>
          <View style={styles.signalContainer}>
            <Text style={styles.signalIcon}>
              {getSignalStrengthIcon(device.rssi)}
            </Text>
            <Text style={styles.detailValue}>{device.rssi} dBm</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>最后连接:</Text>
          <Text style={styles.detailValue}>
            {formatLastSeen(device.lastSeen)}
          </Text>
        </View>

        {/* 植物状态 */}
        {device.status && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>植物状态:</Text>
            <View style={styles.plantStatusContainer}>
              <View
                style={[
                  styles.plantStatusIndicator,
                  { backgroundColor: getPlantStateColor(device.status.state) },
                ]}
              />
              <Text style={styles.detailValue}>
                {getPlantStateText(device.status.state)}
              </Text>
            </View>
          </View>
        )}

        {/* 电池电量 */}
        {device.batteryLevel !== undefined && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>电池电量:</Text>
            <Text style={styles.detailValue}>{device.batteryLevel}%</Text>
          </View>
        )}
      </View>

      {/* 操作按钮 */}
      <View style={styles.actions}>
        {device.isConnected ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.disconnectButton]}
            onPress={onConnect}
          >
            <Text style={styles.disconnectButtonText}>断开连接</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.connectButton]}
            onPress={onConnect}
          >
            <Text style={styles.connectButtonText}>连接</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.pairButton]}
          onPress={onPair}
        >
          <Text style={styles.pairButtonText}>配对</Text>
        </TouchableOpacity>
      </View>

      {/* 选中指示器 */}
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  details: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalIcon: {
    marginRight: 4,
    fontSize: 12,
  },
  plantStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plantStatusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  connectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  disconnectButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  pairButton: {
    backgroundColor: '#2196F3',
  },
  pairButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});