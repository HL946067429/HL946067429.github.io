import { create } from "zustand";

export interface Location {
  name: string;
  lat: number;
  lon: number;
  // 海拔米，影响大气透过率（后续 radiation 模型用）
  elevation: number;
  // IANA 时区名（仅展示用，所有计算用 UTC）
  timezone: string;
}

interface EnvState {
  location: Location;
  setLocation: (loc: Location) => void;
}

export const PRESET_LOCATIONS: Location[] = [
  { name: "北京", lat: 39.9042, lon: 116.4074, elevation: 43, timezone: "Asia/Shanghai" },
  { name: "上海", lat: 31.2304, lon: 121.4737, elevation: 4, timezone: "Asia/Shanghai" },
  { name: "广州", lat: 23.1291, lon: 113.2644, elevation: 21, timezone: "Asia/Shanghai" },
  { name: "昆明", lat: 25.0389, lon: 102.7183, elevation: 1891, timezone: "Asia/Shanghai" },
  { name: "海南三亚", lat: 18.2528, lon: 109.5119, elevation: 7, timezone: "Asia/Shanghai" },
];

export const useEnv = create<EnvState>((set) => ({
  location: PRESET_LOCATIONS[0],
  setLocation: (location) => set({ location }),
}));
