/**
 * 设备管理器
 * 负责设备发现、连接、配对和多设备管理
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { DeviceEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import { 
  DeviceConfig, 
  DeviceMessage, 
  DeviceCommand, 
  MessageType,
  SensorData,
  PlantStatus 
} from '@shared/types';

export interface ConnectedDevice {
  id: string;
  name: string;
  rssi: number;
  isConnected: boolean;
  lastSeen: Date;
  config?: DeviceConfig;
  status?: PlantStatus;
  batteryLevel?: number;
}

export interface DeviceDiscoveryResult {
  device: Device;
  rssi: number;
  advertisementData: any;
}

export interface DeviceManagerEvents {
  deviceDiscovered: (device: ConnectedDevice) => void;
  deviceConnected: (deviceId: string) => void;
  deviceDisconnected: (deviceId: string) => void;
  deviceDataReceived: (deviceId: string, data: DeviceMessage) => void;
  deviceError: (deviceId: string, error: Error) => void;
  scanStateChanged: (isScanning: boolean) => void;
}

export class DeviceManager {
  private bleManager: BleManager;
  private connectedDevices: Map<string, ConnectedDevice> = new Map();
  private deviceConnections: Map<string, Device> = new Map();
  private isScanning: boolean = false;
  private scanTimeout?: NodeJS.Timeout;
  private eventListeners: Map<string, Function[]> = new Map();
  
  // BLE服务和特征UUID
  private readonly SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
  private readonly DATA_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789abd';
  private readonly COMMAND_CHARACTERISTIC_UUID = '12345678-1234-1234-1234-123456789abe';
  
  private readonly STORAGE_KEY = 'paired_devices';
  private readonly SCAN_TIMEOUT = 30000; // 30秒

  constructor() {
    this.bleManager = new BleManager();
    this.initializeBLE();
    this.loadPairedDevices();
  }

  /**
   * 初始化BLE管理器
   */
  private async initializeBLE(): Promise<void> {
    try {
      // 检查蓝牙权限
      await this.requestBluetoothPermissions();
      
      // 监听蓝牙状态变化
      this.bleManager.onStateChange((state) => {
        console.log('BLE State:', state);
        if (state === State.PoweredOn) {
          this.reconnectPairedDevices();
        }
      }, true);
      
    } catch (error) {
      console.error('Failed to initialize BLE:', error);
      throw error;
    }
  }

  /**
   * 请求蓝牙权限
   */
  private async requestBluetoothPermissions(): Promise<void> {
    if (Platform.OS === 'android') {
      const apiLevel = await DeviceInfo.getApiLevel();
      
      if (apiLevel >= 31) {
        // Android 12+ 需要新的权限
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        const allGranted = Object.values(granted).every(
          permission => permission === PermissionsAndroid.RESULTS.GRANTED
        );
        
        if (!allGranted) {
          throw new Error('Bluetooth permissions not granted');
        }
      } else {
        // Android 11及以下
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Location permission not granted');
        }
      }
    }
  }

  /**
   * 开始扫描设备
   */
  async startDeviceDiscovery(): Promise<void> {
    if (this.isScanning) {
      return;
    }

    try {
      this.isScanning = true;
      this.emit('scanStateChanged', true);
      
      console.log('Starting device discovery...');
      
      // 设置扫描超时
      this.scanTimeout = setTimeout(() => {
        this.stopDeviceDiscovery();
      }, this.SCAN_TIMEOUT);
      
      // 开始扫描
      this.bleManager.startDeviceScan(
        [this.SERVICE_UUID],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('Scan error:', error);
            this.emit('deviceError', 'scan', error);
            return;
          }
          
          if (device && device.name?.includes('PlantCare')) {
            this.handleDeviceDiscovered(device);
          }
        }
      );
      
    } catch (error) {
      this.isScanning = false;
      this.emit('scanStateChanged', false);
      console.error('Failed to start device discovery:', error);
      throw error;
    }
  }

  /**
   * 停止扫描设备
   */
  stopDeviceDiscovery(): void {
    if (!this.isScanning) {
      return;
    }

    this.bleManager.stopDeviceScan();
    this.isScanning = false;
    this.emit('scanStateChanged', false);
    
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = undefined;
    }
    
    console.log('Device discovery stopped');
  }

  /**
   * 处理发现的设备
   */
  private handleDeviceDiscovered(device: Device): void {
    const connectedDevice: ConnectedDevice = {
      id: device.id,
      name: device.name || 'Unknown Plant Care Robot',
      rssi: device.rssi || -100,
      isConnected: false,
      lastSeen: new Date(),
    };
    
    console.log('Device discovered:', connectedDevice);
    this.emit('deviceDiscovered', connectedDevice);
  }

  /**
   * 连接到设备
   */
  async connectToDevice(deviceId: string): Promise<boolean> {
    try {
      console.log('Connecting to device:', deviceId);
      
      // 停止扫描
      this.stopDeviceDiscovery();
      
      // 连接设备
      const device = await this.bleManager.connectToDevice(deviceId);
      await device.discoverAllServicesAndCharacteristics();
      
      // 保存连接
      this.deviceConnections.set(deviceId, device);
      
      // 更新设备状态
      const connectedDevice = this.connectedDevices.get(deviceId);
      if (connectedDevice) {
        connectedDevice.isConnected = true;
        connectedDevice.lastSeen = new Date();
      }
      
      // 设置数据监听
      await this.setupDataListener(device);
      
      // 获取设备配置
      await this.requestDeviceConfig(deviceId);
      
      console.log('Device connected successfully:', deviceId);
      this.emit('deviceConnected', deviceId);
      
      return true;
      
    } catch (error) {
      console.error('Failed to connect to device:', error);
      this.emit('deviceError', deviceId, error as Error);
      return false;
    }
  }

  /**
   * 断开设备连接
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      const device = this.deviceConnections.get(deviceId);
      if (device) {
        await device.cancelConnection();
        this.deviceConnections.delete(deviceId);
      }
      
      // 更新设备状态
      const connectedDevice = this.connectedDevices.get(deviceId);
      if (connectedDevice) {
        connectedDevice.isConnected = false;
      }
      
      console.log('Device disconnected:', deviceId);
      this.emit('deviceDisconnected', deviceId);
      
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      this.emit('deviceError', deviceId, error as Error);
    }
  }

  /**
   * 配对设备
   */
  async pairDevice(deviceId: string, deviceName?: string): Promise<boolean> {
    try {
      const success = await this.connectToDevice(deviceId);
      if (success) {
        // 保存配对信息
        await this.savePairedDevice(deviceId, deviceName);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to pair device:', error);
      return false;
    }
  }

  /**
   * 取消配对设备
   */
  async unpairDevice(deviceId: string): Promise<void> {
    try {
      // 断开连接
      await this.disconnectDevice(deviceId);
      
      // 从配对列表中移除
      await this.removePairedDevice(deviceId);
      
      // 从内存中移除
      this.connectedDevices.delete(deviceId);
      
      console.log('Device unpaired:', deviceId);
      
    } catch (error) {
      console.error('Failed to unpair device:', error);
      throw error;
    }
  }

  /**
   * 发送命令到设备
   */
  async sendCommand(deviceId: string, command: DeviceCommand): Promise<boolean> {
    try {
      const device = this.deviceConnections.get(deviceId);
      if (!device) {
        throw new Error('Device not connected');
      }
      
      const message: DeviceMessage = {
        type: MessageType.COMMAND,
        deviceId,
        timestamp: Date.now(),
        payload: command
      };
      
      const data = JSON.stringify(message);
      const base64Data = Buffer.from(data).toString('base64');
      
      await device.writeCharacteristicWithResponseForService(
        this.SERVICE_UUID,
        this.COMMAND_CHARACTERISTIC_UUID,
        base64Data
      );
      
      console.log('Command sent to device:', deviceId, command);
      return true;
      
    } catch (error) {
      console.error('Failed to send command:', error);
      this.emit('deviceError', deviceId, error as Error);
      return false;
    }
  }

  /**
   * 设置数据监听器
   */
  private async setupDataListener(device: Device): Promise<void> {
    try {
      device.monitorCharacteristicForService(
        this.SERVICE_UUID,
        this.DATA_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Data monitoring error:', error);
            this.emit('deviceError', device.id, error);
            return;
          }
          
          if (characteristic?.value) {
            try {
              const data = Buffer.from(characteristic.value, 'base64').toString();
              const message: DeviceMessage = JSON.parse(data);
              
              // 更新设备数据
              this.updateDeviceData(device.id, message);
              
              // 发出数据接收事件
              this.emit('deviceDataReceived', device.id, message);
              
            } catch (parseError) {
              console.error('Failed to parse device data:', parseError);
            }
          }
        }
      );
    } catch (error) {
      console.error('Failed to setup data listener:', error);
      throw error;
    }
  }

  /**
   * 更新设备数据
   */
  private updateDeviceData(deviceId: string, message: DeviceMessage): void {
    const device = this.connectedDevices.get(deviceId);
    if (!device) return;
    
    switch (message.type) {
      case MessageType.SENSOR_DATA:
        // 传感器数据更新
        break;
        
      case MessageType.STATUS_UPDATE:
        device.status = message.payload as PlantStatus;
        device.batteryLevel = message.payload.batteryLevel;
        break;
        
      case MessageType.CONFIG_UPDATE:
        device.config = message.payload as DeviceConfig;
        break;
        
      case MessageType.HEARTBEAT:
        device.lastSeen = new Date();
        break;
    }
  }

  /**
   * 请求设备配置
   */
  private async requestDeviceConfig(deviceId: string): Promise<void> {
    const command: DeviceCommand = {
      command: 'get_config' as any,
    };
    
    await this.sendCommand(deviceId, command);
  }
  /**
   * 获取所有连接的设备
   */
  getConnectedDevices(): ConnectedDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  /**
   * 获取特定设备
   */
  getDevice(deviceId: string): ConnectedDevice | undefined {
    return this.connectedDevices.get(deviceId);
  }

  /**
   * 检查设备是否已连接
   */
  isDeviceConnected(deviceId: string): boolean {
    const device = this.connectedDevices.get(deviceId);
    return device?.isConnected || false;
  }

  /**
   * 重新连接所有配对的设备
   */
  async reconnectPairedDevices(): Promise<void> {
    try {
      const pairedDevices = await this.loadPairedDevices();
      
      for (const deviceId of pairedDevices) {
        try {
          await this.connectToDevice(deviceId);
        } catch (error) {
          console.warn('Failed to reconnect to device:', deviceId, error);
        }
      }
    } catch (error) {
      console.error('Failed to reconnect paired devices:', error);
    }
  }

  /**
   * 保存配对设备
   */
  private async savePairedDevice(deviceId: string, deviceName?: string): Promise<void> {
    try {
      const pairedDevices = await this.loadPairedDevices();
      
      if (!pairedDevices.includes(deviceId)) {
        pairedDevices.push(deviceId);
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(pairedDevices));
      }
      
      // 保存设备信息
      const deviceInfo = {
        id: deviceId,
        name: deviceName || 'Plant Care Robot',
        pairedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem(`device_${deviceId}`, JSON.stringify(deviceInfo));
      
    } catch (error) {
      console.error('Failed to save paired device:', error);
      throw error;
    }
  }

  /**
   * 移除配对设备
   */
  private async removePairedDevice(deviceId: string): Promise<void> {
    try {
      const pairedDevices = await this.loadPairedDevices();
      const updatedDevices = pairedDevices.filter(id => id !== deviceId);
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedDevices));
      await AsyncStorage.removeItem(`device_${deviceId}`);
      
    } catch (error) {
      console.error('Failed to remove paired device:', error);
      throw error;
    }
  }

  /**
   * 加载配对设备列表
   */
  private async loadPairedDevices(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load paired devices:', error);
      return [];
    }
  }

  /**
   * 事件监听器管理
   */
  on<K extends keyof DeviceManagerEvents>(
    event: K,
    listener: DeviceManagerEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off<K extends keyof DeviceManagerEvents>(
    event: K,
    listener: DeviceManagerEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit<K extends keyof DeviceManagerEvents>(
    event: K,
    ...args: Parameters<DeviceManagerEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      // 停止扫描
      this.stopDeviceDiscovery();
      
      // 断开所有连接
      const disconnectPromises = Array.from(this.deviceConnections.keys()).map(
        deviceId => this.disconnectDevice(deviceId)
      );
      
      await Promise.all(disconnectPromises);
      
      // 清理事件监听器
      this.eventListeners.clear();
      
      // 销毁BLE管理器
      this.bleManager.destroy();
      
      console.log('DeviceManager cleanup completed');
      
    } catch (error) {
      console.error('Failed to cleanup DeviceManager:', error);
    }
  }

  /**
   * 获取设备信号强度
   */
  async getDeviceRSSI(deviceId: string): Promise<number | null> {
    try {
      const device = this.deviceConnections.get(deviceId);
      if (device) {
        const rssi = await device.readRSSI();
        
        // 更新设备信息
        const connectedDevice = this.connectedDevices.get(deviceId);
        if (connectedDevice) {
          connectedDevice.rssi = rssi;
        }
        
        return rssi;
      }
      return null;
    } catch (error) {
      console.error('Failed to read RSSI:', error);
      return null;
    }
  }

  /**
   * 更新设备配置
   */
  async updateDeviceConfig(deviceId: string, config: Partial<DeviceConfig>): Promise<boolean> {
    const command: DeviceCommand = {
      command: 'set_config' as any,
      parameters: config
    };
    
    return await this.sendCommand(deviceId, command);
  }

  /**
   * 获取设备状态
   */
  getDeviceStatus(deviceId: string): PlantStatus | undefined {
    return this.connectedDevices.get(deviceId)?.status;
  }

  /**
   * 获取设备配置
   */
  getDeviceConfig(deviceId: string): DeviceConfig | undefined {
    return this.connectedDevices.get(deviceId)?.config;
  }
}