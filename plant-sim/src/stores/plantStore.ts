import { create } from "zustand";
import { SUNFLOWER } from "@/species/sunflower";
import type { SpeciesSpec } from "@/species/types";

interface PlantState {
  species: SpeciesSpec;
  /** 种植时刻(毫秒时间戳) */
  plantedAt: number;
  /** 自种植以来累积的 GDD(°C·d) */
  cumulativeGdd: number;
  /** 上一次推进 GDD 时的仿真时刻,用于增量计算 */
  lastTickAt: number;

  setSpecies: (spec: SpeciesSpec) => void;
  /** 重新种植:把 GDD 清零,plantedAt 设为指定时刻 */
  replant: (plantedAt: number) => void;
  /** 推进 GDD(由 hook 调用) */
  addGdd: (gdd: number, tickAt: number) => void;
  /** 直接设置 GDD(用于跳到某阶段) */
  setGdd: (gdd: number, tickAt: number) => void;
}

const initialPlantedAt = (() => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.getTime();
})();

export const usePlant = create<PlantState>((set) => ({
  species: SUNFLOWER,
  plantedAt: initialPlantedAt,
  cumulativeGdd: 0,
  lastTickAt: initialPlantedAt,

  setSpecies: (species) => set({ species, cumulativeGdd: 0 }),
  replant: (plantedAt) =>
    set({ plantedAt, cumulativeGdd: 0, lastTickAt: plantedAt }),
  addGdd: (gdd, tickAt) =>
    set((s) => ({
      cumulativeGdd: s.cumulativeGdd + gdd,
      lastTickAt: tickAt,
    })),
  setGdd: (cumulativeGdd, tickAt) => set({ cumulativeGdd, lastTickAt: tickAt }),
}));
