/**
 * 数据可视化界面
 * 显示传感器数据趋势图和植物健康报告
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { useSelectedDevice } from '@/contexts/DeviceContext';
import { DataVisualizationService, VisualizationConfig } from '@/services/DataVisualizationService';
import { ChartData, HealthReport } from '@shared/types';
import { Header } from '@/components/Header';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

const screenWidth = Dimensions.get('window').width;

export const DataVisualizationScreen: React.FC = () => {
  const selectedDevice = useSelectedDevice();
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<'soilMoisture' | 'lightLevel' | 'temperature'>('soilMoisture');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  
  const dataVisualizationService = new DataVisualizationService();

  // 加载数据
  const loadData = useCallback(async () => {
    if (!selectedDevice) {
      setLoading(false);
      return;
    }

    try {
      const config: VisualizationConfig = {
        timeRange,
        dataType: selectedDataType,
        showCareEvents: true,
        smoothData: true,
      };

      const [chartResult, healthResult] = await Promise.all([
        dataVisualizationService.generateChartData(selectedDevice.id, config),
        dataVisualizationService.generateHealthReport(selectedDevice.id, timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30),
      ]);

      setChartData(chartResult);
      setHealthReport(healthResult);
    } catch (error) {
      console.error('Failed to load visualization data:', error);
      Alert.alert('错误', '加载数据失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, selectedDataType, timeRange]);

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

  // 获取当前数据集
  const getCurrentDataset = () => {
    if (!chartData) return [];
    
    switch (selectedDataType) {
      case 'soilMoisture':
        return chartData.soilMoisture;
      case 'lightLevel':
        return chartData.lightLevel;
      case 'temperature':
        return chartData.temperature;
      default:
        return [];
    }
  };

  // 生成图表数据
  const generateChartDataForRender = () => {
    const dataset = getCurrentDataset();
    
    if (dataset.length === 0) {
      return {
        labels: ['无数据'],
        datasets: [{
          data: [0],
          color: () => '#ccc',
          strokeWidth: 2,
        }],
      };
    }

    // 根据时间范围调整标签
    const labelCount = timeRange === 'day' ? 6 : timeRange === 'week' ? 7 : 10;
    const step = Math.max(1, Math.floor(dataset.length / labelCount));
    
    const labels = dataset
      .filter((_, index) => index % step === 0)
      .map(item => {
        const date = new Date(item.timestamp);
        return timeRange === 'day' 
          ? format(date, 'HH:mm', { locale: zhCN })
          : format(date, 'MM/dd', { locale: zhCN });
      });

    const data = dataset
      .filter((_, index) => index % step === 0)
      .map(item => item.value);

    const config = dataVisualizationService.generateChartConfig(selectedDataType);

    return {
      labels,
      datasets: [{
        data,
        color: () => config.color,
        strokeWidth: 2,
      }],
    };
  };

  // 渲染数据类型选择器
  const renderDataTypeSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>数据类型</Text>
      <View style={styles.selectorButtons}>
        {[
          { key: 'soilMoisture', label: '土壤湿度' },
          { key: 'lightLevel', label: '光照强度' },
          { key: 'temperature', label: '温度' },
        ].map(item => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.selectorButton,
              selectedDataType === item.key && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedDataType(item.key as any)}
          >
            <Text
              style={[
                styles.selectorButtonText,
                selectedDataType === item.key && styles.selectorButtonTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // 渲染时间范围选择器
  const renderTimeRangeSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>时间范围</Text>
      <View style={styles.selectorButtons}>
        {[
          { key: 'day', label: '今天' },
          { key: 'week', label: '7天' },
          { key: 'month', label: '30天' },
        ].map(item => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.selectorButton,
              timeRange === item.key && styles.selectorButtonActive,
            ]}
            onPress={() => setTimeRange(item.key as any)}
          >
            <Text
              style={[
                styles.selectorButtonText,
                timeRange === item.key && styles.selectorButtonTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // 渲染图表
  const renderChart = () => {
    const chartDataForRender = generateChartDataForRender();
    const config = dataVisualizationService.generateChartConfig(selectedDataType);
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{config.label}</Text>
        <LineChart
          data={chartDataForRender}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: selectedDataType === 'temperature' ? 1 : 0,
            color: (opacity = 1) => config.color,
            labelColor: (opacity = 1) => '#666666',
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '3',
              strokeWidth: '1',
              stroke: config.color,
            },
          }}
          bezier
          style={styles.chart}
        />
        
        {/* 阈值线说明 */}
        <View style={styles.thresholdLegend}>
          {config.thresholds.map((threshold, index) => (
            <View key={index} style={styles.thresholdItem}>
              <View
                style={[
                  styles.thresholdIndicator,
                  { backgroundColor: threshold.color },
                ]}
              />
              <Text style={styles.thresholdText}>
                {threshold.label}: {threshold.value}{config.unit}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // 渲染健康报告
  const renderHealthReport = () => {
    if (!healthReport) return null;

    return (
      <View style={styles.healthReportContainer}>
        <Text style={styles.sectionTitle}>植物健康报告</Text>
        
        {/* 健康评分 */}
        <View style={styles.healthScoreContainer}>
          <Text style={styles.healthScoreLabel}>健康评分</Text>
          <View style={styles.healthScoreCircle}>
            <Text style={styles.healthScoreValue}>{healthReport.healthScore}</Text>
            <Text style={styles.healthScoreUnit}>分</Text>
          </View>
        </View>

        {/* 平均条件 */}
        <View style={styles.averageConditionsContainer}>
          <Text style={styles.subsectionTitle}>平均环境条件</Text>
          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>土壤湿度:</Text>
            <Text style={styles.conditionValue}>
              {healthReport.averageConditions.soilMoisture}%
            </Text>
          </View>
          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>光照强度:</Text>
            <Text style={styles.conditionValue}>
              {healthReport.averageConditions.lightLevel} lux
            </Text>
          </View>
          <View style={styles.conditionRow}>
            <Text style={styles.conditionLabel}>温度:</Text>
            <Text style={styles.conditionValue}>
              {healthReport.averageConditions.temperature}°C
            </Text>
          </View>
        </View>

        {/* 建议 */}
        <View style={styles.recommendationsContainer}>
          <Text style={styles.subsectionTitle}>护理建议</Text>
          {healthReport.recommendations.map((recommendation, index) => (
            <View key={index} style={styles.recommendationItem}>
              <Text style={styles.recommendationBullet}>•</Text>
              <Text style={styles.recommendationText}>{recommendation}</Text>
            </View>
          ))}
        </View>

        {/* 照料事件 */}
        {healthReport.careEvents.length > 0 && (
          <View style={styles.careEventsContainer}>
            <Text style={styles.subsectionTitle}>最近照料记录</Text>
            {healthReport.careEvents.slice(0, 5).map((event, index) => (
              <View key={index} style={styles.careEventItem}>
                <Text style={styles.careEventAction}>
                  {event.action === 'watered' ? '浇水' : 
                   event.action === 'moved_to_light' ? '移至光照处' : 
                   event.action === 'fertilized' ? '施肥' : '触摸'}
                </Text>
                <Text style={styles.careEventTime}>
                  {format(event.timestamp, 'MM-dd HH:mm', { locale: zhCN })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (!selectedDevice) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="数据可视化" showBack={true} />
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
        <Header title="数据可视化" showBack={true} />
        <LoadingSpinner message="正在加载数据..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="数据可视化" showBack={true} />
      
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

        {/* 数据类型选择器 */}
        {renderDataTypeSelector()}

        {/* 时间范围选择器 */}
        {renderTimeRangeSelector()}

        {/* 图表 */}
        {renderChart()}

        {/* 健康报告 */}
        {renderHealthReport()}
      </ScrollView>
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
  selectorContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  selectorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  selectorButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  selectorButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectorButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  thresholdLegend: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  thresholdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  thresholdIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  thresholdText: {
    fontSize: 12,
    color: '#666',
  },
  healthReportContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  healthScoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  healthScoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  healthScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  healthScoreUnit: {
    fontSize: 12,
    color: 'white',
  },
  averageConditionsContainer: {
    marginBottom: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conditionLabel: {
    fontSize: 14,
    color: '#666',
  },
  conditionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recommendationsContainer: {
    marginBottom: 24,
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
  careEventsContainer: {
    marginBottom: 16,
  },
  careEventItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  careEventAction: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  careEventTime: {
    fontSize: 12,
    color: '#666',
  },
});