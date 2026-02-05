/**
 * 首次使用引导界面
 * 实现用户首次使用时的引导流程
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { DeviceManager } from '../services/DeviceManager';
import { UserInteractionService } from '../services/UserInteractionService';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
  deviceManager: DeviceManager;
  userInteractionService: UserInteractionService;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  image?: string;
  action?: () => Promise<void>;
  actionText?: string;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
  deviceManager,
  userInteractionService,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: '欢迎使用植物小帮手！',
      description: '让我们一起开始照料您的植物吧。这个可爱的小机器人将帮助您监测植物的健康状况。',
    },
    {
      id: 'features',
      title: '功能介绍',
      description: '• 实时监测土壤湿度和光照\n• 可爱的状态指示灯\n• 触摸互动反馈\n• 智能提醒功能',
    },
    {
      id: 'setup',
      title: '设备配对',
      description: '现在让我们连接您的植物小帮手。请确保设备已开机并处于配对模式。',
      action: async () => {
        await startDeviceDiscovery();
      },
      actionText: '开始搜索设备',
    },
    {
      id: 'pairing',
      title: '选择设备',
      description: '请从下方列表中选择您的植物小帮手设备：',
    },
    {
      id: 'complete',
      title: '设置完成！',
      description: '恭喜！您的植物小帮手已经准备就绪。现在您可以开始使用所有功能了。',
      actionText: '开始使用',
      action: async () => {
        await completeOnboarding();
      },
    },
  ];

  const startDeviceDiscovery = async () => {
    setIsLoading(true);
    try {
      // 开始设备发现
      const devices = await deviceManager.discoverDevices(10000); // 10秒搜索
      setDiscoveredDevices(devices);
      
      if (devices.length > 0) {
        setCurrentStep(currentStep + 1);
      } else {
        Alert.alert(
          '未找到设备',
          '请确保您的植物小帮手已开机并处于配对模式，然后重试。',
          [
            { text: '重试', onPress: () => startDeviceDiscovery() },
            { text: '跳过', onPress: () => setCurrentStep(currentStep + 2) },
          ]
        );
      }
    } catch (error) {
      console.error('Device discovery failed:', error);
      Alert.alert('搜索失败', '设备搜索过程中出现错误，请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const connectToDevice = async (deviceId: string) => {
    setIsLoading(true);
    try {
      const success = await deviceManager.connectToDevice(deviceId);
      if (success) {
        // 记录首次配对事件
        await userInteractionService.recordCareAction({
          type: 'device_paired',
          deviceId,
          timestamp: new Date(),
          notes: 'First time device pairing completed',
        });
        
        setCurrentStep(currentStep + 1);
      } else {
        Alert.alert('连接失败', '无法连接到设备，请重试。');
      }
    } catch (error) {
      console.error('Device connection failed:', error);
      Alert.alert('连接错误', '连接设备时出现错误。');
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      // 记录引导完成事件
      await userInteractionService.recordCareAction({
        type: 'onboarding_completed',
        timestamp: new Date(),
        notes: 'User completed onboarding process',
      });
      
      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      onComplete(); // 即使记录失败也继续
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case 'pairing':
        return (
          <View style={styles.deviceList}>
            {discoveredDevices.map((device, index) => (
              <TouchableOpacity
                key={device.id || index}
                style={styles.deviceItem}
                onPress={() => connectToDevice(device.id)}
                disabled={isLoading}
              >
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>
                    {device.name || `植物小帮手 ${index + 1}`}
                  </Text>
                  <Text style={styles.deviceDetails}>
                    信号强度: {device.rssi || 'Unknown'} dBm
                  </Text>
                </View>
                <View style={styles.deviceIcon}>
                  <Text style={styles.deviceEmoji}>🌱</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {discoveredDevices.length === 0 && (
              <View style={styles.noDevices}>
                <Text style={styles.noDevicesText}>未找到设备</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={startDeviceDiscovery}
                  disabled={isLoading}
                >
                  <Text style={styles.retryButtonText}>重新搜索</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      default:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
            
            {step.image && (
              <View style={styles.imageContainer}>
                <Text style={styles.placeholderImage}>🌱🤖</Text>
              </View>
            )}
          </View>
        );
    }
  };

  const renderActionButton = () => {
    const step = steps[currentStep];
    
    if (step.action && step.actionText) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, isLoading && styles.disabledButton]}
          onPress={step.action}
          disabled={isLoading}
        >
          <Text style={styles.actionButtonText}>
            {isLoading ? '处理中...' : step.actionText}
          </Text>
        </TouchableOpacity>
      );
    }

    if (currentStep === steps.length - 1) {
      return null; // 最后一步的按钮由step.action处理
    }

    return (
      <TouchableOpacity
        style={styles.nextButton}
        onPress={nextStep}
      >
        <Text style={styles.nextButtonText}>下一步</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 进度指示器 */}
        <View style={styles.progressContainer}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* 步骤内容 */}
        {renderStepContent()}
      </ScrollView>

      {/* 底部按钮 */}
      <View style={styles.buttonContainer}>
        {currentStep > 0 && currentStep < steps.length - 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={prevStep}
          >
            <Text style={styles.backButtonText}>上一步</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.buttonSpacer} />
        
        {renderActionButton()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 6,
  },
  progressDotActive: {
    backgroundColor: '#4CAF50',
  },
  stepContent: {
    alignItems: 'center',
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  placeholderImage: {
    fontSize: 80,
    textAlign: 'center',
  },
  deviceList: {
    width: '100%',
    marginTop: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  deviceDetails: {
    fontSize: 14,
    color: '#666',
  },
  deviceIcon: {
    marginLeft: 12,
  },
  deviceEmoji: {
    fontSize: 32,
  },
  noDevices: {
    alignItems: 'center',
    padding: 40,
  },
  noDevicesText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  actionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});