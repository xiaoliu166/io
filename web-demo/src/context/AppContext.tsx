import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Plant, SensorData, PlantStatus, CareRecord, UserProfile } from '../types';

function generateSensorData(override?: Partial<SensorData>): SensorData {
  const base: SensorData = {
    timestamp: new Date(),
    moisture: 30 + Math.random() * 40,
    light: 400 + Math.random() * 400,
    temperature: 20 + Math.random() * 8,
    humidity: 50 + Math.random() * 30,
  };
  return { ...base, ...override };
}

function deriveStatus(data: SensorData): PlantStatus {
  const needsWater = data.moisture < 30;
  const needsLight = data.light < 500;
  return {
    isHealthy: !needsWater && !needsLight,
    needsWater,
    needsLight,
    batteryLevel: 85 - Math.random() * 5,
  };
}

type SensorDataByPlantId = Record<string, SensorData[]>;
type StatusByPlantId = Record<string, PlantStatus>;

interface AppContextValue {
  plants: Plant[];
  currentPlantId: string | null;
  setCurrentPlantId: (id: string | null) => void;
  sensorDataByPlantId: SensorDataByPlantId;
  statusByPlantId: StatusByPlantId;
  isSimulatingByPlantId: Record<string, boolean>;
  toggleSimulate: (plantId: string) => void;
  addPlant: (name: string, variety?: string) => void;
  careRecords: CareRecord[];
  addCareRecord: (plantId: string, type: CareRecord['type'], action: string) => void;
  waterPlant: (plantId: string) => void;
  moveToLight: (plantId: string) => void;
  user: UserProfile;
  setUser: (u: Partial<UserProfile>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEMO_PLANTS: Plant[] = [
  { id: '1', name: '小绿萝', variety: '绿萝', addedAt: Date.now() - 86400000 * 7 },
  { id: '2', name: '窗台多肉', variety: '多肉', addedAt: Date.now() - 86400000 * 3 },
];

function initHistoryData(): SensorData[] {
  const arr: SensorData[] = [];
  const now = Date.now();
  for (let i = 20; i >= 0; i--) {
    arr.push({
      timestamp: new Date(now - i * 5 * 60 * 1000),
      moisture: 40 + Math.random() * 20,
      light: 500 + Math.random() * 300,
      temperature: 22 + Math.random() * 4,
      humidity: 55 + Math.random() * 20,
    });
  }
  return arr;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>(() => DEMO_PLANTS);
  const [currentPlantId, setCurrentPlantId] = useState<string | null>(() => DEMO_PLANTS[0]?.id ?? null);
  const [sensorDataByPlantId, setSensorDataByPlantId] = useState<SensorDataByPlantId>(() => {
    const o: SensorDataByPlantId = {};
    DEMO_PLANTS.forEach(p => { o[p.id] = initHistoryData(); });
    return o;
  });
  const [statusByPlantId, setStatusByPlantId] = useState<StatusByPlantId>(() => {
    const o: StatusByPlantId = {};
    DEMO_PLANTS.forEach(p => {
      const data = initHistoryData();
      o[p.id] = deriveStatus(data[data.length - 1]);
    });
    return o;
  });
  const [isSimulatingByPlantId, setIsSimulatingByPlantId] = useState<Record<string, boolean>>({});
  const [careRecords, setCareRecords] = useState<CareRecord[]>([]);
  const [user, setUserState] = useState<UserProfile>({ nickname: '绿植小管家' });

  const toggleSimulate = useCallback((plantId: string) => {
    setIsSimulatingByPlantId(prev => ({ ...prev, [plantId]: !prev[plantId] }));
  }, []);

  const addPlant = useCallback((name: string, variety?: string) => {
    const id = String(Date.now());
    const newPlant: Plant = { id, name, variety, addedAt: Date.now() };
    setPlants(prev => [...prev, newPlant]);
    setSensorDataByPlantId(prev => ({ ...prev, [id]: initHistoryData() }));
    const last = initHistoryData()[20];
    setStatusByPlantId(prev => ({ ...prev, [id]: deriveStatus(last) }));
    setCurrentPlantId(id);
  }, []);

  const addCareRecord = useCallback((plantId: string, type: CareRecord['type'], action: string) => {
    setCareRecords(prev => [...prev, { id: String(Date.now()), plantId, type, action, at: Date.now() }]);
  }, []);

  const waterPlant = useCallback((plantId: string) => {
    const newData = generateSensorData({ moisture: 65 + Math.random() * 10 });
    setSensorDataByPlantId(prev => ({
      ...prev,
      [plantId]: [...(prev[plantId] ?? []).slice(-19), newData],
    }));
    setStatusByPlantId(prev => ({
      ...prev,
      [plantId]: { ...deriveStatus(newData), needsWater: false },
    }));
    addCareRecord(plantId, 'water', '浇水');
  }, [addCareRecord]);

  const moveToLight = useCallback((plantId: string) => {
    const newData = generateSensorData({ light: 700 + Math.random() * 200 });
    setSensorDataByPlantId(prev => ({
      ...prev,
      [plantId]: [...(prev[plantId] ?? []).slice(-19), newData],
    }));
    setStatusByPlantId(prev => ({
      ...prev,
      [plantId]: { ...deriveStatus(newData), needsLight: false },
    }));
    addCareRecord(plantId, 'light', '移到光照处');
  }, [addCareRecord]);

  const setUser = useCallback((u: Partial<UserProfile>) => {
    setUserState(prev => ({ ...prev, ...u }));
  }, []);

  // 模拟定时更新
  React.useEffect(() => {
    const interval = setInterval(() => {
      Object.entries(isSimulatingByPlantId).forEach(([plantId, on]) => {
        if (!on) return;
        const newData = generateSensorData();
        setSensorDataByPlantId(prev => ({
          ...prev,
          [plantId]: [...(prev[plantId] ?? []).slice(-19), newData],
        }));
        setStatusByPlantId(prev => ({ ...prev, [plantId]: deriveStatus(newData) }));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [isSimulatingByPlantId]);

  const value = useMemo<AppContextValue>(() => ({
    plants,
    currentPlantId,
    setCurrentPlantId,
    sensorDataByPlantId,
    statusByPlantId,
    isSimulatingByPlantId,
    toggleSimulate,
    addPlant,
    careRecords,
    addCareRecord,
    waterPlant,
    moveToLight,
    user,
    setUser,
  }), [plants, currentPlantId, sensorDataByPlantId, statusByPlantId, isSimulatingByPlantId,
      toggleSimulate, addPlant, careRecords, addCareRecord, waterPlant, moveToLight, user, setUser]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
