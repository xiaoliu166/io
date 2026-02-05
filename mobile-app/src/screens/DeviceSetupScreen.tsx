/**
 * 设备配置界面
 * 处理设备首次配置和配对流程
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { DeviceManager, ConnectedDevice } from '../services/DeviceManager';
import { UserInteractionService } from '../services/UserInteractionService';

interface DeviceSetupScreenProps {
  device: ConnectedDevice;
  deviceManager: DeviceManager;
  userInteractionService: UserInteractionService;
  onComplete: (deviceConfig: DeviceConfiguration) => void;
  onCancel: () => void;
}

interface DeviceConfiguration {
  deviceId: string;
  deviceName: string;
  plantType: string;
  location: string;
  monitoringEnabled: boolean;
  alertsEnabled: boolean;
  autoWatering: boolean;
  moistureThreshold: number;
  lightThreshold: number;
}

export const DeviceSetupScreen: React.FC<DeviceSetupScreenProps> = ({
  device,
  deviceManager,
  userInteractionService,
  onComplete,
  onCancel,
}) => {
  const [config, setConfig] = useState<DeviceConfiguration>({
    deviceId: device.id,
    deviceName: device.name || '我的植物小帮手',
    plantType: '',
    location: '',
    monitoringEnabled: true,
    alertsEnabled: true,
    autoWatering: false,
    moistureThreshold: 30, // 默认30%
    lightThreshold: 500,   // 默认500lux
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const setupSteps = [
    {
      title: '设备信息',
      description: '为您的植物小帮手设置基本信息',
    },
    {
      title: '植物设置',
      description: '告诉我们您要照料的植物类型',
    },
    {
      title: '监测配置',
      description: '配置监测参数和提醒设置',
    },
    {
      title: '完成配置',
      description: '确认设置并完成配置',
    },
  ];

  const plantTypes = [
    { id: 'succulent', name: '多肉植物', moistureThreshold: 20, lightThreshold: 800 },
    { id: 'foliage', name: '观叶植物', moistureThreshold: 40, lightThreshold: 300 },
    { id: 'flowering', name: '开花植物', moistureThreshold: 50, lightThreshold: 600 },
    { id: 'herb', name: '香草植物', moistureThreshold: 45, lightThreshold: 500 },
    { id: 'custom', name: '自定义', moistureThreshold: 30, lightThreshold: 500 },
  ];

  const handlePlantTypeSelect = (plantType: typeof plantTypes[0]) => {
    setConfig(prev => ({
      ...prev,
      plantType: plantType.name,
      moistureThreshold: plantType.moistureThreshold,
      lightThreshold: plantType.lightThreshold,
    }));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0:
        return config.deviceName.trim().length > 0 && config.location.trim().length > 0;
      case 1:
        return config.plantType.length > 0;
      case 2:
        return config.moistureThreshold > 0 && config.lightThreshold > 0;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < setupSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      Alert.alert('请完成当前步骤', '请填写所有必需的信息后再继续。');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeSetup = async () => {
    setIsLoading(true);
    try {
      // 发送配置到设备
      const configMessage = {
        type: 'device_config',
        config: {
          moistureThreshold: config.moistureThreshold,
          lightThreshold: config.lightThreshold,
          monitoringEnabled: config.monitoringEnabled,
          alertsEnabled: config.alertsEnabled,
        },
      };

      const success = await deviceManager.sendMessage(device.id, configMessage);
      
      if (success) {
        // 记录设备配置事件
        await userInteractionService.recordCareAction({
          type: 'device_configured',
          deviceId: device.id,
          timestamp: new Date(),
          notes: `Device configured: ${config.plantType} at ${config.location}`,
          metadata: {
            plantType: config.plantType,
            location: config.location,
            thresholds: {
              moisture: config.moistureThreshold,
              light: config.lightThreshold,
            },
          },
        });

        onComplete(config);
      } else {
        Alert.alert('配置失败', '无法将配置发送到设备，请重试。');
      }
    } catch (error) {
      console.error('Device setup failed:', error);
      Alert.alert('配置错误', '配置设备时出现错误。');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>设备名称</Text>
            <TextInput
              style={styles.input}
              value={config.deviceName}
              onChangeText={(text) => setConfig(prev => ({ ...prev, deviceName: text }))}
              placeholder="为您的植物小帮手起个名字"
              maxLength={30}
            />

            <Text style={styles.label}>放置位置</Text>
            <TextInput
              style={styles.input}
              value={config.location}
              onChangeText={(text) => setConfig(prev => ({ ...prev, location: text }))}
              placeholder="例如：客厅、卧室、阳台"
              maxLength={20}
            />

            <Text style={styles.hint}>
              这些信息将帮助您在多个设备中区分不同的植物小帮手。
            </Text>
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>选择植物类型</Text>
            <Text style={styles.hint}>
              选择植物类型将自动设置适合的监测参数。
            </Text>

            {plantTypes.map((plantType) => (
              <TouchableOpacity
                key={plantType.id}
                style={[
                  styles.plantTypeItem,
                  config.plantType === plantType.name && styles.plantTypeItemSelected,
                ]}
                onPress={() => handlePlantTypeSelect(plantType)}
              >
                <Text style={[
                  styles.plantTypeName,
                  config.plantType === plantType.name && styles.plantTypeNameSelected,
                ]}>
                  {plantType.name}
                </Text>
                <Text style={styles.plantTypeDetails}>
                  湿度阈值: {plantType.moistureThreshold}% | 光照阈值: {plantType.lightThreshold}lux
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>监测设置</Text>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>启用环境监测</Text>
              <Switch
                value={config.monitoringEnabled}
                onValueChange={(value) => setConfig(prev => ({ ...prev, monitoringEnabled: value }))}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>启用智能提醒</Text>
              <Switch
                value={config.alertsEnabled}
                onValueChange={(value) => setConfig(prev => ({ ...prev, alertsEnabled: value }))}
              />
            </View>

            <Text style={styles.label}>湿度阈值 ({config.moistureThreshold}%)</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>干燥</Text>
              <View style={styles.sliderTrack}>
                <TouchableOpacity
                  style={[styles.sliderThumb, { left: `${config.moistureThreshold}%` }]}
                  onPress={() => {
                    // 简化的滑块实现，实际应用中可以使用专门的滑块组件
                  }}
                />
              </View>
              <Text style={styles.sliderLabel}>湿润</Text>
            </View>

            <Text style={styles.label}>光照阈值 ({config.lightThreshold}lux)</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>暗</Text>
              <View style={styles.sliderTrack}>
                <TouchableOpacity
                  style={[styles.sliderThumb, { left: `${Math.min(config.lightThreshold / 10, 100)}%` }]}
                  onPress={() => {
                    // 简化的滑块实现
                  }}
                />
              </View>
              <Text style={styles.sliderLabel}>亮</Text>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.confirmTitle}>配置确认</Text>
            
            <View style={styles.confirmSection}>
              <Text style={styles.confirmLabel}>设备信息</Text>
              <Text style={styles.confirmValue}>名称: {config.deviceName}</Text>
              <Text style={styles.confirmValue}>位置: {config.location}</Text>
            </View>

            <View style={styles.confirmSection}>
              <Text style={styles.confirmLabel}>植物设置</Text>
              <Text style={styles.confirmValue}>类型: {config.plantType}</Text>
            </View>

            <View style={styles.confirmSection}>
              <Text style={styles.confirmLabel}>监测参数</Text>
              <Text style={styles.confirmValue}>湿度阈值: {config.moistureThreshold}%</Text>
              <Text style={styles.confirmValue}>光照阈值: {config.lightThreshold}lux</Text>
              <Text style={styles.confirmValue}>
                监测状态: {config.monitoringEnabled ? '启用' : '禁用'}
              </Text>
              <Text style={styles.confirmValue}>
                智能提醒: {config.alertsEnabled ? '启用' : '禁用'}
              </Text>
            </View>

            <Text style={styles.hint}>
              确认无误后，这些设置将发送到您的植物小帮手。
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>取消</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设备配置</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 进度指示器 */}
      <View style={styles.progressContainer}>
        <Text style={styles.stepTitle}>{setupSteps[currentStep].title}</Text>
        <Text style={styles.stepDescription}>{setupSteps[currentStep].description}</Text>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((currentStep + 1) / setupSteps.length) * 100}%` }
            ]} 
          />
        </View>
      </View>

      {/* 内容区域 */}
      <ScrollView style={styles.content}>
        {renderStepContent()}
      </ScrollView>

      {/* 底部按钮 */}
      <View style={styles.buttonContainer}>
        {currentStep > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={prevStep}>
            <Text style={styles.backButtonText}>上一步</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.buttonSpacer} />
        
        {currentStep < setupSteps.length - 1 ? (
          <TouchableOpacity 
            style={[styles.nextButton, !validateCurrentStep() && styles.disabledButton]} 
            onPress={nextStep}
            disabled={!validateCurrentStep()}
          >
            <Text style={styles.nextButtonText}>下一步</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.completeButton, isLoading && styles.disabledButton]} 
            onPress={completeSetup}
            disabled={isLoading}
          >
            <Text style={styles.completeButtonText}>
              {isLoading ? '配置中...' : '完成配置'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  headerSpacer: {
    width: 60,
  },
  progressContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  plantTypeItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  plantTypeItemSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8e9',
  },
  plantTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  plantTypeNameSelected: {
    color: '#4CAF50',
  },
  plantTypeDetails: {
    fontSize: 14,
    color: '#666',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
    width: 40,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginHorizontal: 12,
    position: 'relative',
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    top: -8,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  confirmLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  confirmValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
  },
  buttonSpacer: {
    flex: 1,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});