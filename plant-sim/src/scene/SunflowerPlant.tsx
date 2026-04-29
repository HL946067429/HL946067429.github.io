import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Stem, { stemTipPosition } from "@/render/Stem";
import Leaves, { LeafSlot } from "@/render/Leaves";
import FlowerHead from "@/render/FlowerHead";
import { usePlant } from "@/stores/plantStore";
import { useTimeline } from "@/stores/timelineStore";
import { useEnv } from "@/stores/envStore";
import { computeSolar } from "@/models/solar";
import { findStage, hasReachedStage } from "@/models/phenology";
import type { SpeciesSpec } from "@/species/types";

const GOLDEN_RAD = 137.508 * (Math.PI / 180);

/**
 * 把 cumulativeGdd 转换成本帧的视觉参数。
 * 这是一个纯函数,便于将来在 worker 里跑同样的计算。
 */
function deriveVisualState(spec: SpeciesSpec, gdd: number) {
  const stages = spec.lifecycle.stages;
  const stage = findStage(spec, gdd);
  const m = spec.morphology;

  // 生长曲线:logistic-ish 由 seedling→vegetative 末
  const stemGrowEnd =
    stages.find((s) => s.id === "vegetative")?.gddEnd ??
    stages.find((s) => s.id === "budding")?.gddStart ??
    900;
  const stemGrowStart =
    stages.find((s) => s.id === "germination")?.gddEnd ?? 120;
  const stemT = clamp01((gdd - stemGrowStart) / (stemGrowEnd - stemGrowStart));
  // 半 Sigmoid 曲线
  const stemHeight = m.maxHeight * smoothStep01(stemT);

  // 弯曲:开始于 fruiting 末,senescence 加深,death 完全
  const fruitStage = stages.find((s) => s.id === "fruiting");
  const senesStage = stages.find((s) => s.id === "senescence");
  const deathStage = stages.find((s) => s.id === "death");
  let bend = 0;
  if (fruitStage && gdd >= fruitStage.gddStart) {
    if (gdd <= fruitStage.gddEnd) {
      bend = 0.05 + (0.25 * (gdd - fruitStage.gddStart)) /
        Math.max(1, fruitStage.gddEnd - fruitStage.gddStart);
    } else if (senesStage && gdd <= senesStage.gddEnd) {
      bend = 0.3 + (0.6 * (gdd - senesStage.gddStart)) /
        Math.max(1, senesStage.gddEnd - senesStage.gddStart);
    } else if (deathStage && gdd >= deathStage.gddStart) {
      bend = 1.1;
    }
  }
  bend = Math.min(bend, 1.35);

  // 茎颜色:嫩→成熟→木质化干枯
  const stemColor = pickStemColor(spec, gdd);

  // 叶子总数随营养生长出现
  const leafCount = Math.round(
    m.maxLeafCount * smoothStep01(stemT) * 1.05, // 略多于茎,在末期会逐步脱落
  );
  const leafSlots: LeafSlot[] = [];
  // 越靠下的叶子越早出现并越早衰老
  for (let i = 0; i < m.maxLeafCount; i++) {
    const yFrac = 0.06 + (i + 0.5) * (0.85 / m.maxLeafCount);
    const azimuth = i * GOLDEN_RAD;
    // 这片叶子"出生"时的茎进度阈值:i 越大越晚
    const birthT = i / m.maxLeafCount;
    const ageT = stemT - birthT;
    // 还没到出生时间
    if (ageT <= -0.05) {
      leafSlots.push({
        yFrac,
        azimuth,
        length: 0,
        pitch: deg2rad(m.leafPitch),
        color: hexToRgb(spec.leaf.colorYoung),
        attached: false,
        curl: 0,
      });
      continue;
    }
    // 单叶生长:0.25 进度内长到最大
    const grow = clamp01((ageT + 0.05) / 0.25);
    let length = m.leafMaxLength * grow;
    // 单叶颜色:幼→成熟,然后随植株衰老→黄→棕
    let color = lerpColor(spec.leaf.colorYoung, spec.leaf.colorMature, clamp01(grow * 1.3));
    let attached = true;
    let curl = 0;

    if (senesStage && gdd >= senesStage.gddStart) {
      const sT = clamp01(
        (gdd - senesStage.gddStart) / Math.max(1, senesStage.gddEnd - senesStage.gddStart),
      );
      // 越下面的叶子越早衰老:阈值依赖 i
      const senesceLocal = clamp01(sT * 1.6 - birthT * 0.4);
      color = lerpColor(rgbToHex(color), spec.leaf.colorSenescent, senesceLocal);
      curl = senesceLocal * 0.6;
      // 接近末段开始脱落
      if (sT > 0.5 && hash01(i) < (sT - 0.5) * 1.5) attached = false;
    }
    if (deathStage && gdd >= deathStage.gddStart) {
      color = hexToRgb(spec.leaf.colorDead);
      curl = 0.8;
      // 90% 已脱落
      if (hash01(i + 7) < 0.85) attached = false;
      length *= 0.85;
    }

    leafSlots.push({
      yFrac,
      azimuth,
      length: i < leafCount ? length : 0,
      pitch: deg2rad(m.leafPitch),
      color,
      attached,
      curl,
    });
  }

  // 花头:budding 开始可见,bloom/wilt/ripeness 由 GDD 计算
  const buddingStage = stages.find((s) => s.id === "budding");
  const floweringStage = stages.find((s) => s.id === "flowering");
  let headRadiusScale = 0;
  let bloom = 0;
  let wilt = 0;
  let ripeness = 0;
  if (buddingStage && gdd >= buddingStage.gddStart) {
    if (gdd <= buddingStage.gddEnd) {
      const t = (gdd - buddingStage.gddStart) /
        Math.max(1, buddingStage.gddEnd - buddingStage.gddStart);
      headRadiusScale = 0.25 + 0.45 * t; // 25%→70%
      bloom = 0;
    } else if (floweringStage && gdd <= floweringStage.gddEnd) {
      const t = (gdd - floweringStage.gddStart) /
        Math.max(1, floweringStage.gddEnd - floweringStage.gddStart);
      headRadiusScale = 0.7 + 0.3 * smoothStep01(t);
      bloom = smoothStep01(t * 1.4);
    } else if (fruitStage && gdd <= fruitStage.gddEnd) {
      const t = (gdd - fruitStage.gddStart) /
        Math.max(1, fruitStage.gddEnd - fruitStage.gddStart);
      headRadiusScale = 1;
      bloom = 1 - 0.4 * t; // 花瓣开始凋谢
      wilt = t * 0.5;
      ripeness = t * 0.7;
    } else if (senesStage && gdd <= senesStage.gddEnd) {
      const t = (gdd - senesStage.gddStart) /
        Math.max(1, senesStage.gddEnd - senesStage.gddStart);
      headRadiusScale = 1 - 0.05 * t;
      bloom = 0.6 - 0.6 * t;
      wilt = 0.5 + 0.5 * t;
      ripeness = 0.7 + 0.3 * t;
    } else if (deathStage && gdd >= deathStage.gddStart) {
      headRadiusScale = 0.9;
      bloom = 0;
      wilt = 1;
      ripeness = 1;
    }
  }

  // 是否还在向日:开花 50% 之前可向日,之后逐渐固定朝东
  const heliotropic =
    spec.flower?.heliotropism === true &&
    hasReachedStage(spec, gdd, "vegetative") &&
    !(floweringStage && gdd > floweringStage.gddStart + (floweringStage.gddEnd - floweringStage.gddStart) * 0.5);

  return {
    stage,
    stemHeight,
    stemBend: bend,
    stemColor,
    leafSlots,
    headRadiusScale,
    bloom,
    wilt,
    ripeness,
    heliotropic,
    visibleHead: !!buddingStage && gdd >= buddingStage.gddStart && gdd > 0,
  };
}

function pickStemColor(spec: SpeciesSpec, gdd: number): string {
  const stages = spec.lifecycle.stages;
  const senes = stages.find((s) => s.id === "senescence");
  const death = stages.find((s) => s.id === "death");
  if (death && gdd >= death.gddStart) return spec.stem.colorDead;
  if (senes && gdd >= senes.gddStart) {
    const t = clamp01((gdd - senes.gddStart) / Math.max(1, senes.gddEnd - senes.gddStart));
    return rgbToHex(lerpColor(spec.stem.colorMature, spec.stem.colorDead, t));
  }
  // 营养期:嫩→成熟
  const stemEnd = stages.find((s) => s.id === "vegetative")?.gddEnd ?? 900;
  const t = clamp01(gdd / stemEnd);
  return rgbToHex(lerpColor(spec.stem.colorYoung, spec.stem.colorMature, t));
}

// === 工具函数 ===
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
function smoothStep01(x: number) {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}
function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}
function hash01(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
function hexToRgb(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}
function rgbToHex(rgb: [number, number, number]): string {
  const c = new THREE.Color(rgb[0], rgb[1], rgb[2]);
  return "#" + c.getHexString();
}
function lerpColor(a: string | [number, number, number], b: string | [number, number, number], t: number): [number, number, number] {
  const ca = Array.isArray(a) ? new THREE.Color(a[0], a[1], a[2]) : new THREE.Color(a);
  const cb = Array.isArray(b) ? new THREE.Color(b[0], b[1], b[2]) : new THREE.Color(b);
  ca.lerp(cb, clamp01(t));
  return [ca.r, ca.g, ca.b];
}

// =====================================================

export default function SunflowerPlant() {
  const species = usePlant((s) => s.species);
  const cumulativeGdd = usePlant((s) => s.cumulativeGdd);

  const visual = useMemo(
    () => deriveVisualState(species, cumulativeGdd),
    [species, cumulativeGdd],
  );

  const headGroupRef = useRef<THREE.Group>(null);

  // 向日性 + 头部朝向
  useFrame(() => {
    const g = headGroupRef.current;
    if (!g) return;
    const tipPos = stemTipPosition(visual.stemHeight, visual.stemBend);
    g.position.set(tipPos[0], tipPos[1], tipPos[2]);

    // 默认花盘朝向 +Y(向上)
    // 我们把 group 的局部坐标系做成"花盘平面在 XZ 上",绕 X 旋转抬头/低头
    // 为了简单,从茎切线方向构造一个向上向量,然后把茎弯进去叠加一点低头
    if (visual.heliotropic && visual.visibleHead) {
      const now = useTimeline.getState().now;
      const loc = useEnv.getState().location;
      const sun = computeSolar(new Date(now), loc.lat, loc.lon);
      // 花盘正朝太阳方向(在水平面上跟踪太阳方位,垂直方向取个固定上仰)
      const az = Math.atan2(sun.direction[0], sun.direction[2]);
      // 早晨偏东、傍晚偏西;夜间锁回正南
      const targetAz = sun.altitude > -0.1 ? az : 0;
      g.rotation.set(0, targetAz, 0);
    } else if (visual.visibleHead) {
      // 不向日:固定朝东(向日葵成熟期典型行为)
      g.rotation.set(0, -Math.PI / 2, 0);
    } else {
      g.rotation.set(0, 0, 0);
    }
  });

  // 头部局部姿态:从茎切线方向 + 低头量,把"花盘平面"摆出来
  // 当 stemBend = 0 时,花盘水平面在 XZ(法向 +Y);bend 越大,把法向旋向 +X
  const headTiltGroupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = headTiltGroupRef.current;
    if (!g) return;
    // 基础抬头:让花盘从水平改为略略竖直(对着太阳更自然)
    const baseTilt = -0.45 + visual.bloom * 0.25;
    // 弯曲低头:低头量随 stemBend
    const droop = visual.stemBend;
    g.rotation.set(baseTilt + droop, 0, 0);
  });

  return (
    <group>
      <Stem
        height={visual.stemHeight}
        baseRadius={species.morphology.stemBaseRadius}
        topRadius={species.morphology.stemTopRadius}
        bendAngle={visual.stemBend}
        color={visual.stemColor}
      />

      <Leaves
        stemHeight={visual.stemHeight}
        stemBend={visual.stemBend}
        leaves={visual.leafSlots}
        unitLength={species.morphology.leafMaxLength}
      />

      {visual.visibleHead && species.flower && (
        <group ref={headGroupRef}>
          <group ref={headTiltGroupRef}>
            <FlowerHead
              radius={species.flower.headRadius * visual.headRadiusScale}
              petalCount={species.flower.petalCount}
              bloom={visual.bloom}
              wilt={visual.wilt}
              ripeness={visual.ripeness}
              petalColor={species.flower.petalColor}
              petalTipColor={species.flower.petalTipColor}
              discColor={species.flower.discColor}
              discCenterColor={species.flower.discCenterColor}
              petalSenescentColor={species.flower.petalSenescentColor}
              sepalColor={species.flower.sepalColor}
            />
          </group>
        </group>
      )}
    </group>
  );
}

// 暴露给 UI 显示当前阶段
export function useCurrentStage() {
  const species = usePlant((s) => s.species);
  const gdd = usePlant((s) => s.cumulativeGdd);
  return useMemo(() => findStage(species, gdd), [species, gdd]);
}
