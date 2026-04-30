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
      // R6:开花结束、籽实开始灌浆,头部因重量明显前倾(~30°)
      bend = 0.08 + (0.5 * (gdd - fruitStage.gddStart)) /
        Math.max(1, fruitStage.gddEnd - fruitStage.gddStart);
    } else if (senesStage && gdd <= senesStage.gddEnd) {
      // R7-R8:衰老期,头进一步下垂到接近 80°
      bend = 0.58 + (0.85 * (gdd - senesStage.gddStart)) /
        Math.max(1, senesStage.gddEnd - senesStage.gddStart);
    } else if (deathStage && gdd >= deathStage.gddStart) {
      // R9:植株死亡,头几乎垂直朝下
      bend = 1.8;
    }
  }
  bend = Math.min(bend, 2.0);

  // 茎颜色:嫩→成熟→木质化干枯
  const stemColor = pickStemColor(spec, gdd);

  // 叶子总数随营养生长出现
  const leafCount = Math.round(
    m.maxLeafCount * smoothStep01(stemT) * 1.05, // 略多于茎,在末期会逐步脱落
  );
  const leafSlots: LeafSlot[] = [];
  // 真实向日葵叶序:前 4 节为"对生 + decussate(每节相邻 90°)",第 5 节起转为黄金角螺旋。
  // 假设 maxLeafCount 中前 8 片(4 对)走对生,余下走螺旋。
  // 节点数 = PAIRED_NODES + (maxLeafCount - 2*PAIRED_NODES) = maxLeafCount - PAIRED_NODES
  const PAIRED_NODES = 4;
  const PAIRED_LEAVES = PAIRED_NODES * 2; // 8
  const SPIRAL_LEAVES = Math.max(0, m.maxLeafCount - PAIRED_LEAVES);
  const TOTAL_NODES = PAIRED_NODES + SPIRAL_LEAVES; // 4 + 16 = 20
  // 螺旋段起始方位 = 最后一个对生节点角度 + 半个黄金角(避免重叠)
  const SPIRAL_BASE_AZ = (PAIRED_NODES - 1) * (Math.PI / 2) + GOLDEN_RAD * 0.5;

  for (let i = 0; i < m.maxLeafCount; i++) {
    // 抖动
    const jitterY = (hash01(i + 1) - 0.5) * 0.03;
    const jitterAz = (hash01(i + 2) - 0.5) * 0.14;
    const jitterPitch = (hash01(i + 3) - 0.5) * 0.25;
    const sizeJitter = 0.82 + 0.36 * hash01(i + 4);

    // 计算节点索引 + 节点内方位
    let nodeIdx: number;
    let nodeAz: number;
    if (i < PAIRED_LEAVES) {
      // 对生段:每对在同一节点,两侧反对(180°),相邻节点旋转 90°(decussate)
      nodeIdx = Math.floor(i / 2);
      const sideOf = i % 2;
      nodeAz = nodeIdx * (Math.PI / 2) + sideOf * Math.PI;
    } else {
      // 螺旋段:每片单独占一节
      const spiralOffset = i - PAIRED_LEAVES;
      nodeIdx = PAIRED_NODES + spiralOffset;
      nodeAz = SPIRAL_BASE_AZ + spiralOffset * GOLDEN_RAD;
    }

    const yFrac = 0.06 + (nodeIdx + 0.5) * (0.85 / TOTAL_NODES) + jitterY;
    const azimuth = nodeAz + jitterAz;
    // 这片叶子"出生"时的茎进度阈值:节点越高越晚
    const birthT = nodeIdx / TOTAL_NODES;
    const ageT = stemT - birthT;
    // 还没到出生时间
    if (ageT <= -0.05) {
      leafSlots.push({
        yFrac,
        azimuth,
        length: 0,
        pitch: deg2rad(m.leafPitch) + jitterPitch,
        color: hexToRgb(spec.leaf.colorYoung),
        attached: false,
        curl: 0,
      });
      continue;
    }
    // 单叶生长:0.25 进度内长到最大
    const grow = clamp01((ageT + 0.05) / 0.25);
    // 位置梯度:下部叶最大、上部叶最小(真实向日葵的形态分布)
    // birthT 0(最早出生,在底部)→ 1(最晚,在顶部)
    const positionSizeFactor = 1.35 - 0.7 * birthT;
    let length = m.leafMaxLength * grow * sizeJitter * positionSizeFactor;
    // 单叶颜色:幼→成熟,然后随植株衰老→黄→棕
    let color = lerpColor(spec.leaf.colorYoung, spec.leaf.colorMature, clamp01(grow * 1.3));
    // 每片叶轻微 hue/lightness 抖动
    color = jitterColor(color, hash01(i + 5));
    let attached = true;
    // 基线卷曲:每片叶子有自己天生的小卷曲(不全部完全平整)
    let curl = (hash01(i + 6) - 0.5) * 0.28;

    if (senesStage && gdd >= senesStage.gddStart) {
      const sT = clamp01(
        (gdd - senesStage.gddStart) / Math.max(1, senesStage.gddEnd - senesStage.gddStart),
      );
      // 越下面的叶子越早衰老:阈值依赖 i
      const senesceLocal = clamp01(sT * 1.6 - birthT * 0.4);
      color = lerpColor(rgbToHex(color), spec.leaf.colorSenescent, senesceLocal);
      curl += senesceLocal * 0.6;
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
      pitch: deg2rad(m.leafPitch) + jitterPitch,
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
  // bloomFront: 花盘的"开放前线"半径(0=外缘,即未开始;1=花心,即全部开完)。
  // 真实向日葵管状花从外圈往中心一圈一圈开,5-8 天扫完。
  let bloomFront = 0;
  if (buddingStage && gdd >= buddingStage.gddStart) {
    if (gdd <= buddingStage.gddEnd) {
      const t = (gdd - buddingStage.gddStart) /
        Math.max(1, buddingStage.gddEnd - buddingStage.gddStart);
      headRadiusScale = 0.25 + 0.45 * t; // 25%→70%
      bloom = 0;
      bloomFront = 0;
    } else if (floweringStage && gdd <= floweringStage.gddEnd) {
      const t = (gdd - floweringStage.gddStart) /
        Math.max(1, floweringStage.gddEnd - floweringStage.gddStart);
      headRadiusScale = 0.7 + 0.3 * smoothStep01(t);
      bloom = smoothStep01(t * 1.4);
      // 开放前线在 flowering 期间从 0 推到 1
      bloomFront = smoothStep01(t * 1.1);
    } else if (fruitStage && gdd <= fruitStage.gddEnd) {
      const t = (gdd - fruitStage.gddStart) /
        Math.max(1, fruitStage.gddEnd - fruitStage.gddStart);
      headRadiusScale = 1;
      bloom = 1 - 0.4 * t; // 花瓣开始凋谢
      wilt = t * 0.5;
      ripeness = t * 0.7;
      bloomFront = 1; // 全开完,只剩种子
    } else if (senesStage && gdd <= senesStage.gddEnd) {
      const t = (gdd - senesStage.gddStart) /
        Math.max(1, senesStage.gddEnd - senesStage.gddStart);
      headRadiusScale = 1 - 0.05 * t;
      bloom = 0.6 - 0.6 * t;
      wilt = 0.5 + 0.5 * t;
      ripeness = 0.7 + 0.3 * t;
      bloomFront = 1;
    } else if (deathStage && gdd >= deathStage.gddStart) {
      headRadiusScale = 0.9;
      bloom = 0;
      wilt = 1;
      ripeness = 1;
      bloomFront = 1;
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
    bloomFront,
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

const _jitterColor = new THREE.Color();
function jitterColor(rgb: [number, number, number], rand: number): [number, number, number] {
  _jitterColor.setRGB(rgb[0], rgb[1], rgb[2]);
  // ±4° hue,±10% lightness
  const dh = (rand - 0.5) * 0.022;
  const dl = (rand - 0.5) * 0.12;
  _jitterColor.offsetHSL(dh, 0, dl);
  return [_jitterColor.r, _jitterColor.g, _jitterColor.b];
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
  const swayGroupRef = useRef<THREE.Group>(null);

  // 头部姿态:挂在茎尖,绕 Y 旋朝向(方位),绕 X 旋俯仰角(让花盘正对天/太阳)
  // 同时把整株做小幅风摆动(把整个 swayGroup 绕底部小角度倾斜)
  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // ==== 整株风摆 ====
    // 用两频叠加做"非完全周期"的自然感,幅度跟茎高成正比但有上限
    if (swayGroupRef.current) {
      const ampX = Math.min(0.04, 0.018 * visual.stemHeight);
      const ampZ = Math.min(0.03, 0.014 * visual.stemHeight);
      const swayX = Math.sin(t * 0.9) * ampX + Math.sin(t * 2.1 + 1.3) * ampX * 0.35;
      const swayZ = Math.cos(t * 1.1 + 0.7) * ampZ + Math.cos(t * 2.4) * ampZ * 0.4;
      // 围绕基部摆,旋转轴:绕 Z 轴让顶端往 ±X 摇,绕 X 轴让顶端往 ±Z 摇
      swayGroupRef.current.rotation.set(swayZ, 0, swayX);
    }

    const g = headGroupRef.current;
    if (!g) return;
    const tipPos = stemTipPosition(visual.stemHeight, visual.stemBend);
    g.position.set(tipPos[0], tipPos[1], tipPos[2]);

    // 计算 disc 朝向的目标方向向量 desired = (sx, sy, sz) (单位)
    // 默认 disc 法向 = +Y。我们用 (xRot, yRot) 把 +Y 转到 desired:
    //   xRot = -(π/2 - 仰角)  使 +Y 抬到 (0, sin alt, cos alt)
    //   yRot = -azimuth       绕 Y 旋使其落到 (sin az * cos alt, sin alt, cos az * cos alt)
    // 茎下垂(stemBend)使 disc 进一步绕 X 朝下;花瓣盛放时(bloom)让 disc 略低头(自然姿态)
    let xRot: number;
    let yRot: number;

    if (visual.heliotropic && visual.visibleHead) {
      const now = useTimeline.getState().now;
      const loc = useEnv.getState().location;
      const sun = computeSolar(new Date(now), loc.lat, loc.lon);
      // 太阳低于地平线时,锁朝东
      if (sun.altitude < 0.05) {
        const fixedAlt = 0.35;
        xRot = -(Math.PI / 2 - fixedAlt);
        yRot = Math.PI / 2; // 朝东(suncalc:az=-π/2 是东,我们的方向向量为 (-cosAlt,..,0))
      } else {
        const sunAz = Math.atan2(sun.direction[0], sun.direction[2]);
        xRot = -(Math.PI / 2 - sun.altitude);
        yRot = -sunAz;
      }
    } else if (visual.visibleHead) {
      // 成熟期固定朝东,略上仰
      const fixedAlt = 0.3;
      xRot = -(Math.PI / 2 - fixedAlt);
      yRot = Math.PI / 2;
    } else {
      xRot = 0;
      yRot = 0;
    }

    // 茎弯曲(下垂)进一步把头朝下压,且早期略偏后再回正
    xRot += visual.stemBend * 0.85;
    // 给花头自身叠加更明显的风摆(花盘大,迎风面大,会更明显地摆)
    const headWindX = Math.sin(t * 1.4 + 0.5) * 0.025;
    const headWindY = Math.cos(t * 1.7) * 0.02;
    g.rotation.set(xRot + headWindX, yRot + headWindY, 0);
  });

  return (
    <group ref={swayGroupRef}>
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
          <FlowerHead
            radius={species.flower.headRadius * visual.headRadiusScale}
            petalCount={species.flower.petalCount}
            bloom={visual.bloom}
            bloomFront={visual.bloomFront}
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
