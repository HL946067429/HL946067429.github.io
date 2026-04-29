import type { SpeciesSpec } from "./types";

/**
 * 向日葵 (Helianthus annuus)
 *
 * 参数依据:
 * - 生育期 ~90-120 天,GDD 总需求 ~1700-2000 °C·d (Tbase=6°C)
 * - 株高 1.5-3 m,大型品种 4 m
 * - 叶序为螺旋(黄金角)
 * - 花盘由数百朵管状花组成,Vogel 模型 (golden angle 137.508°)
 * - 营养期具向日性,花盘成熟后固定朝东
 * 参考:Schneiter & Miller 1981; FAO sunflower agronomy
 */
export const SUNFLOWER: SpeciesSpec = {
  id: "sunflower",
  name: "向日葵",
  scientific: "Helianthus annuus",
  photosynthesis: "C3",
  description:
    "一年生草本,高 1.5-3 米。营养期茎尖跟随太阳东西摆动(向日性);花盘成熟后固定朝东。生育期约 90-120 天。",

  lifecycle: {
    baseTemp: 6,
    optTemp: 25,
    maxTemp: 32,
    stages: [
      { id: "seed",        label: "种子",     gddStart:    0, gddEnd:   60 },
      { id: "germination", label: "萌发",     gddStart:   60, gddEnd:  120 },
      { id: "seedling",    label: "幼苗",     gddStart:  120, gddEnd:  350 },
      { id: "vegetative",  label: "营养生长", gddStart:  350, gddEnd:  900 },
      { id: "budding",     label: "现蕾",     gddStart:  900, gddEnd: 1100 },
      { id: "flowering",   label: "开花",     gddStart: 1100, gddEnd: 1450 },
      { id: "fruiting",    label: "灌浆结籽", gddStart: 1450, gddEnd: 1750 },
      { id: "senescence",  label: "衰老",     gddStart: 1750, gddEnd: 2000 },
      { id: "death",       label: "凋亡",     gddStart: 2000, gddEnd: 9999 },
    ],
  },

  morphology: {
    maxHeight: 2.0,
    stemBaseRadius: 0.025,
    stemTopRadius: 0.012,
    maxLeafCount: 24,
    leafMaxLength: 0.28,
    phyllotaxyAngle: 137.508, // 黄金角,螺旋叶序
    leafPitch: 28,
    stemFlex: 0.6,
  },

  flower: {
    headRadius: 0.16,
    petalCount: 38,
    petalColor: "#f5c427",
    petalTipColor: "#ff8a1a",
    discColor: "#5a3315",
    discCenterColor: "#3a200c",
    sepalColor: "#4a7a2a",
    heliotropism: true,
    petalSenescentColor: "#a07418",
  },

  fruit: {
    // 向日葵的"果实"是种子在花盘中,渲染层把 fruiting 阶段的花盘暗化即可
    radius: 0.005,
    colorYoung: "#bfa860",
    colorRipe: "#3a2a18",
    maxCount: 1, // 整个花盘视作一个聚合果
  },

  leaf: {
    colorYoung: "#86c45a",
    colorMature: "#3a7a32",
    colorSenescent: "#caa028",
    colorDead: "#5a3a1a",
    shape: "cordate", // 心形
    serration: 0.6,
  },

  stem: {
    colorYoung: "#7fa84a",
    colorMature: "#5a7a32",
    colorDead: "#5a3a18",
  },
};
