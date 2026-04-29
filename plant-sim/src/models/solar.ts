import SunCalc from "suncalc";

export interface SolarState {
  // 太阳高度角（弧度），正值在地平线以上
  altitude: number;
  // 太阳方位角（弧度），suncalc 定义：南向为 0，西为正，东为负
  azimuth: number;
  // 是否在地平线以上
  isDay: boolean;
  // 单位方向向量（场景坐标，Y 朝上）：从原点指向太阳
  direction: [number, number, number];
  // 法向辐照度估算因子（仅基于几何，0~1）
  // 真实辐射还需大气透过率/云量修正，留给 radiation 模块
  cosZenith: number;
}

/**
 * 给定 UTC 时间和经纬度，返回太阳几何状态。
 * 场景坐标系约定：
 *   +Y 朝上（天顶）
 *   +Z 朝南，-Z 朝北
 *   +X 朝西，-X 朝东
 * 这样便于直观对照 suncalc 的方位角定义。
 */
export function computeSolar(
  date: Date,
  lat: number,
  lon: number,
): SolarState {
  const pos = SunCalc.getPosition(date, lat, lon);
  const altitude = pos.altitude;
  const azimuth = pos.azimuth;
  const isDay = altitude > 0;

  // 方向向量（指向太阳）
  const cosAlt = Math.cos(altitude);
  const sinAlt = Math.sin(altitude);
  // 南向为 0，西向为正：
  //   x = cosAlt * sin(az)   → 西
  //   z = cosAlt * cos(az)   → 南
  const x = cosAlt * Math.sin(azimuth);
  const z = cosAlt * Math.cos(azimuth);
  const y = sinAlt;

  return {
    altitude,
    azimuth,
    isDay,
    direction: [x, y, z],
    cosZenith: Math.max(0, sinAlt),
  };
}

/** 角度转换 */
export const toDeg = (rad: number) => (rad * 180) / Math.PI;
