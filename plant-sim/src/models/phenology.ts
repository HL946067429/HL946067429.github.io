import type { LifecycleStage, SpeciesSpec, StageId } from "@/species/types";

/**
 * Growing Degree Days (GDD) 物候模型。
 * 经典公式:
 *   GDD_day = clamp(0, (Tmax + Tmin)/2 - Tbase, MaxIncrement)
 *   并对超过 maxTemp 的部分截断。
 * 这里实现 modified McMaster-Wilhelm:
 *   Teff = clamp(Tbase, (Tmax+Tmin)/2, maxTemp)
 *   GDD_day = Teff - Tbase
 */
export function computeDailyGdd(
  tMin: number,
  tMax: number,
  baseTemp: number,
  maxTemp: number,
): number {
  const tMean = (tMin + tMax) / 2;
  const tEff = Math.min(maxTemp, Math.max(baseTemp, tMean));
  return Math.max(0, tEff - baseTemp);
}

/** 当前累积 GDD 落在哪个阶段 */
export function findStage(
  spec: SpeciesSpec,
  cumulativeGdd: number,
): LifecycleStage {
  for (const s of spec.lifecycle.stages) {
    if (cumulativeGdd >= s.gddStart && cumulativeGdd < s.gddEnd) return s;
  }
  return spec.lifecycle.stages[spec.lifecycle.stages.length - 1];
}

/** 此阶段内的归一化进度 0-1 */
export function stageProgress(
  stage: LifecycleStage,
  cumulativeGdd: number,
): number {
  const span = stage.gddEnd - stage.gddStart;
  if (span <= 0) return 1;
  return Math.max(
    0,
    Math.min(1, (cumulativeGdd - stage.gddStart) / span),
  );
}

/** 把整个生命周期视作一段连续的"年龄进度",用于跨阶段插值动画 */
export function lifeProgress(
  spec: SpeciesSpec,
  cumulativeGdd: number,
): number {
  const last = spec.lifecycle.stages[spec.lifecycle.stages.length - 1];
  return Math.max(0, Math.min(1, cumulativeGdd / last.gddStart));
}

/** 当前 GDD 是否达到/超过指定阶段 */
export function hasReachedStage(
  spec: SpeciesSpec,
  cumulativeGdd: number,
  stageId: StageId,
): boolean {
  const target = spec.lifecycle.stages.find((s) => s.id === stageId);
  if (!target) return false;
  return cumulativeGdd >= target.gddStart;
}
