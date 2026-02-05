/**
 * 设备上下文
 * 提供全局设备管理状态和操作
 */

import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { DeviceManager, ConnectedDevice } from '../services/DeviceManager';
import { NotificationService } from '../services/NotificationService';
import { NotificationManager } from '../services/NotificationManager';
import { UserInteractionService } from '../services/UserInteractionService';
import { DeviceMessage, DeviceCommand } from '../../../shared/types';

// 设备状态接口
export interface DeviceState {
  devices: ConnectedDevice[];
  selectedDeviceId: string | null;
  isScanning: boolean;
  isConnecting: boolean;
  error: string | null;
  lastDataUpdate: Date | null;
}

// 设备操作接口
export interface DeviceActions {
  startDiscovery: () => Promise<void>;
  stopDiscovery: () => void;
  connectDevice: (deviceId: string) => Promise<boolean>;
  disconnectDevice: (deviceId: string) => Promise<void>;
  pairDevice: (deviceId: string, deviceName?: string) => Promise<boolean>;
  unpairDevice: (deviceId: string) => Promise<void>;
  selectDevice: (deviceId: string | null) => void;
  sendCommand: (deviceId: string, command: DeviceCommand) => Promise<boolean>;
  refreshDevices: () => Promise<void>;
  clearError: () => void;
}

// 设备上下文类型
export interface DeviceContextType {
  state: DeviceState;
  actions: DeviceActions;
  deviceManager: DeviceManager;
  notificationService: NotificationService;
  notificationManager: NotificationManager;
}

// Action类型
type DeviceAction =
  | { type: 'SET_DEVICES'; payload: ConnectedDevice[] }
  | { type: 'ADD_DEVICE'; payload: ConnectedDevice }
  | { type: 'UPDATE_DEVICE'; payload: { deviceId: string; updates: Partial<ConnectedDevice> } }
  | { type: 'REMOVE_DEVICE'; payload: string }
  | { type: 'SET_SCANNING'; payload: boolean }
  | { type: 'SET_CONNECTING'; payload: boolean }
  | { type: 'SET_SELECTED_DEVICE'; payload: string | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LAST_DATA_UPDATE'; payload: Date }
  | { type: 'CLEAR_ERROR' };

// 初始状态
const initialState: DeviceState = {
  devices: [],
  selectedDeviceId: null,
  isScanning: false,
  isConnecting: false,
  error: null,
  lastDataUpdate: null,
};

// Reducer
function deviceReducer(state: DeviceState, action: DeviceAction): DeviceState {
  switch (action.type) {
    case 'SET_DEVICES':
      return { ...state, devices: action.payload };
      
    case 'ADD_DEVICE':
      const existingIndex = state.devices.findIndex(d => d.id === action.payload.id);
      if (existingIndex >= 0) {
        const updatedDevices = [...state.devices];
        updatedDevices[existingIndex] = action.payload;
        return { ...state, devices: updatedDevices };
      }
      return { ...state, devices: [...state.devices, action.payload] };
      
    case 'UPDATE_DEVICE':
      return {
        ...state,
        devices: state.devices.map(device =>
          device.id === action.payload.deviceId
            ? { ...device, ...action.payload.updates }
            : device
        ),
      };
      
    case 'REMOVE_DEVICE':
      return {
        ...state,
        devices: state.devices.filter(device => device.id !== action.payload),
        selectedDeviceId: state.selectedDeviceId === action.payload ? null : state.selectedDeviceId,
      };
      
    case 'SET_SCANNING':
      return { ...state, isScanning: action.payload };
      
    case 'SET_CONNECTING':
      return { ...state, isConnecting: action.payload };
      
    case 'SET_SELECTED_DEVICE':
      return { ...state, selectedDeviceId: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload };
      
    case 'SET_LAST_DATA_UPDATE':
      return { ...state, lastDataUpdate: action.payload };
      
    case 'CLEAR_ERROR':
      return { ...state, error: null };
      
    default:
      return state;
  }
}

// 创建上下文
const DeviceContext = createContext<DeviceContextType | null>(null);

// Provider组件
export interface DeviceProviderProps {
  children: ReactNode;
}

export const DeviceProvider: React.FC<DeviceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(deviceReducer, initialState);
  
  // 创建服务实例
  const deviceManager = React.useMemo(() => new DeviceManager(), []);
  const notificationService = React.useMemo(() => new NotificationService(), []);
  const userInteractionService = React.useMemo(() => new UserInteractionService(), []);
  const notificationManager = React.useMemo(() => 
    new NotificationManager(deviceManager, notificationService, userInteractionService), 
    [deviceManager, notificationService, userInteractionService]
  );

  // 设置设备管理器事件监听
  useEffect(() => {
    const handleDeviceDiscovered = (device: ConnectedDevice) => {
      dispatch({ type: 'ADD_DEVICE', payload: device });
    };

    const handleDeviceConnected = (deviceId: string) => {
      dispatch({ 
        type: 'UPDATE_DEVICE', 
        payload: { deviceId, updates: { isConnected: true } } 
      });
      dispatch({ type: 'SET_CONNECTING', payload: false });
    };

    const handleDeviceDisconnected = (deviceId: string) => {
      dispatch({ 
        type: 'UPDATE_DEVICE', 
        payload: { deviceId, updates: { isConnected: false } } 
      });
    };

    const handleDeviceDataReceived = (deviceId: string, data: DeviceMessage) => {
      dispatch({ type: 'SET_LAST_DATA_UPDATE', payload: new Date() });
      
      // 根据消息类型更新设备状态
      if (data.type === 'status_update') {
        dispatch({
          type: 'UPDATE_DEVICE',
          payload: { deviceId, updates: { status: data.payload } }
        });
      }
    };

    const handleDeviceError = (deviceId: string, error: Error) => {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      dispatch({ type: 'SET_CONNECTING', payload: false });
    };

    const handleScanStateChanged = (isScanning: boolean) => {
      dispatch({ type: 'SET_SCANNING', payload: isScanning });
    };

    // 注册事件监听器
    deviceManager.on('deviceDiscovered', handleDeviceDiscovered);
    deviceManager.on('deviceConnected', handleDeviceConnected);
    deviceManager.on('deviceDisconnected', handleDeviceDisconnected);
    deviceManager.on('deviceDataReceived', handleDeviceDataReceived);
    deviceManager.on('deviceError', handleDeviceError);
    deviceManager.on('scanStateChanged', handleScanStateChanged);

    // 清理函数
    return () => {
      deviceManager.off('deviceDiscovered', handleDeviceDiscovered);
      deviceManager.off('deviceConnected', handleDeviceConnected);
      deviceManager.off('deviceDisconnected', handleDeviceDisconnected);
      deviceManager.off('deviceDataReceived', handleDeviceDataReceived);
      deviceManager.off('deviceError', handleDeviceError);
      deviceManager.off('scanStateChanged', handleScanStateChanged);
    };
  }, [deviceManager]);

  // 初始化时加载已配对的设备
  useEffect(() => {
    const initializeDevices = async () => {
      try {
        await deviceManager.reconnectPairedDevices();
        const devices = deviceManager.getConnectedDevices();
        dispatch({ type: 'SET_DEVICES', payload: devices });
      } catch (error) {
        console.error('Failed to initialize devices:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize devices' });
      }
    };

    initializeDevices();
  }, [deviceManager]);

  // 创建操作对象
  const actions: DeviceActions = {
    startDiscovery: async () => {
      try {
        dispatch({ type: 'CLEAR_ERROR' });
        await deviceManager.startDeviceDiscovery();
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      }
    },

    stopDiscovery: () => {
      deviceManager.stopDeviceDiscovery();
    },

    connectDevice: async (deviceId: string) => {
      try {
        dispatch({ type: 'SET_CONNECTING', payload: true });
        dispatch({ type: 'CLEAR_ERROR' });
        
        const success = await deviceManager.connectToDevice(deviceId);
        
        if (!success) {
          dispatch({ type: 'SET_CONNECTING', payload: false });
        }
        
        return success;
      } catch (error) {
        dispatch({ type: 'SET_CONNECTING', payload: false });
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
        return false;
      }
    },

    disconnectDevice: async (deviceId: string) => {
      try {
        await deviceManager.disconnectDevice(deviceId);
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      }
    },

    pairDevice: async (deviceId: string, deviceName?: string) => {
      try {
        dispatch({ type: 'SET_CONNECTING', payload: true });
        dispatch({ type: 'CLEAR_ERROR' });
        
        const success = await deviceManager.pairDevice(deviceId, deviceName);
        
        dispatch({ type: 'SET_CONNECTING', payload: false });
        
        if (success) {
          dispatch({ type: 'SET_SELECTED_DEVICE', payload: deviceId });
        }
        
        return success;
      } catch (error) {
        dispatch({ type: 'SET_CONNECTING', payload: false });
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
        return false;
      }
    },

    unpairDevice: async (deviceId: string) => {
      try {
        await deviceManager.unpairDevice(deviceId);
        dispatch({ type: 'REMOVE_DEVICE', payload: deviceId });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      }
    },

    selectDevice: (deviceId: string | null) => {
      dispatch({ type: 'SET_SELECTED_DEVICE', payload: deviceId });
    },

    sendCommand: async (deviceId: string, command: DeviceCommand) => {
      try {
        return await deviceManager.sendCommand(deviceId, command);
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
        return false;
      }
    },

    refreshDevices: async () => {
      try {
        const devices = deviceManager.getConnectedDevices();
        dispatch({ type: 'SET_DEVICES', payload: devices });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      }
    },

    clearError: () => {
      dispatch({ type: 'CLEAR_ERROR' });
    },
  };

  const contextValue: DeviceContextType = {
    state,
    actions,
    deviceManager,
    notificationService,
    notificationManager,
  };

  return (
    <DeviceContext.Provider value={contextValue}>
      {children}
    </DeviceContext.Provider>
  );
};

// Hook for using device context
export const useDevice = (): DeviceContextType => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};

// Hook for getting selected device
export const useSelectedDevice = (): ConnectedDevice | null => {
  const { state } = useDevice();
  return state.devices.find(device => device.id === state.selectedDeviceId) || null;
};

// Hook for getting connected devices
export const useConnectedDevices = (): ConnectedDevice[] => {
  const { state } = useDevice();
  return state.devices.filter(device => device.isConnected);
};