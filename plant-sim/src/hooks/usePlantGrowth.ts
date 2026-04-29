import { useEffect } from "react";
import { useTimeline } from "@/stores/timelineStore";
import { useEnv } from "@/stores/envStore";
import { usePlant } from "@/stores/plantStore";
import { estimateDailyTemperature } from "@/models/climate";
import { computeDailyGdd } from "@/models/phenology";

/**
 * 仿真时间推进时,按"经过的天数"和当时的温度累积 GDD。
 *
 * 简化策略:
 * - 当 timeline.now 跨过任意半天 ≥ 12h,就追加该半天的 GDD 增量
 * - 用 climate.estimateDailyTemperature 给 Tmax/Tmin
 * - 真实气象数据接入后(Open-Meteo),把 estimateDailyTemperature 换成 API 数据即可
 */
const TICK_INTERVAL_MS = 12 * 3600 * 1000;

export function usePlantGrowth() {
  useEffect(() => {
    const unsub = useTimeline.subscribe((state, prev) => {
      if (state.now === prev.now) return;
      const ps = usePlant.getState();

      // 跳到种植时刻之前 → 不长
      if (state.now < ps.plantedAt) {
        if (ps.cumulativeGdd > 0) ps.setGdd(0, state.now);
        return;
      }

      // 倒退:重新从种植时刻累积
      if (state.now < ps.lastTickAt) {
        ps.setGdd(0, ps.plantedAt);
      }

      const start = Math.max(usePlant.getState().lastTickAt, ps.plantedAt);
      const end = state.now;
      let cursor = start;
      const lat = useEnv.getState().location.lat;
      const spec = ps.species;
      let added = 0;
      while (cursor < end) {
        const next = Math.min(end, cursor + TICK_INTERVAL_MS);
        const dtDays = (next - cursor) / 86_400_000;
        const t = estimateDailyTemperature(new Date(cursor), lat);
        const gddDay = computeDailyGdd(
          t.min,
          t.max,
          spec.lifecycle.baseTemp,
          spec.lifecycle.maxTemp,
        );
        added += gddDay * dtDays;
        cursor = next;
      }
      if (added > 0) usePlant.getState().addGdd(added, end);
      else usePlant.setState({ lastTickAt: end });
    });
    return unsub;
  }, []);
}
