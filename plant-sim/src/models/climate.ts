/**
 * 简化季节-纬度温度模型(在 Open-Meteo 真实数据接入前临时使用)。
 *
 * 模型:
 *   T_avg(lat) ≈ 22 - 0.45 * |lat|             // 纬度越高越冷
 *   amplitude(lat) ≈ 8 + 0.35 * |lat|           // 纬度越高季节波动越大
 *   T_daily_mean(doy) = T_avg + amp * cos(2π(doy - 200)/365 + π·sign(lat))  // 北半球 7/19 (doy=200) 最热
 *   T_diurnal_range = 8°C
 *   T(t_hour, doy) = T_daily_mean - cos(2π * (t_hour - 14)/24) * range/2  // 14时最高
 */

export interface DailyTemperature {
  /** 日平均温度 °C */
  mean: number;
  /** 最低温度 °C */
  min: number;
  /** 最高温度 °C */
  max: number;
}

const DIURNAL_RANGE = 8;

/** 一年中的第几天 (1-366) */
export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

/** 该日的均/最低/最高温度估算 */
export function estimateDailyTemperature(
  date: Date,
  lat: number,
): DailyTemperature {
  const doy = dayOfYear(date);
  const absLat = Math.abs(lat);
  const tAvg = 22 - 0.45 * absLat;
  const amp = 8 + 0.35 * absLat;
  // 北半球最热在 doy ≈ 200(7月19日附近),南半球反相
  const phase = lat >= 0 ? 0 : Math.PI;
  const mean = tAvg + amp * Math.cos((2 * Math.PI * (doy - 200)) / 365 + phase);
  return {
    mean,
    min: mean - DIURNAL_RANGE / 2,
    max: mean + DIURNAL_RANGE / 2,
  };
}

/** 实时(小时级)温度 */
export function estimateInstantTemperature(date: Date, lat: number): number {
  const daily = estimateDailyTemperature(date, lat);
  const hour = date.getHours() + date.getMinutes() / 60;
  // 14 时最高,02 时最低
  const phase = ((hour - 14) / 24) * 2 * Math.PI;
  return daily.mean - (Math.cos(phase) * DIURNAL_RANGE) / 2;
}
