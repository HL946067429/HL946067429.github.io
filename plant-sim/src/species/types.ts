/**
 * 物种规格:描述一个植物物种从形态到生命周期的所有参数。
 * 渲染层根据 SpeciesSpec + 当前生长状态绘制植物。
 */

export type StageId =
  | "seed"
  | "germination"
  | "seedling"
  | "vegetative"
  | "budding"
  | "flowering"
  | "fruiting"
  | "senescence"
  | "death";

export interface LifecycleStage {
  id: StageId;
  /** 中文标签 */
  label: string;
  /** 进入此阶段需累积的 GDD(℃·d) */
  gddStart: number;
  /** 离开此阶段的 GDD */
  gddEnd: number;
}

export interface SpeciesSpec {
  /** 物种 ID(英文小写) */
  id: string;
  /** 中文俗名 */
  name: string;
  /** 学名 */
  scientific: string;
  /** 光合途径 */
  photosynthesis: "C3" | "C4" | "CAM";
  /** 简介 */
  description?: string;

  lifecycle: {
    stages: LifecycleStage[];
    /** GDD 基础温度 °C */
    baseTemp: number;
    /** 最适温度 °C(用于显示) */
    optTemp: number;
    /** 上限温度 °C(超过则 GDD 不再增加) */
    maxTemp: number;
  };

  morphology: {
    /** 成熟期最大株高(米) */
    maxHeight: number;
    /** 茎基直径(米) */
    stemBaseRadius: number;
    /** 茎顶直径(米) */
    stemTopRadius: number;
    /** 叶子最大数量(成熟期) */
    maxLeafCount: number;
    /** 单叶最大长度(米) */
    leafMaxLength: number;
    /** 叶序角度(度,黄金角 137.5 = 螺旋叶序) */
    phyllotaxyAngle: number;
    /** 叶柄向上倾角(度,0=水平,90=向上) */
    leafPitch: number;
    /** 茎在风中的弯曲幅度(0-1) */
    stemFlex: number;
  };

  flower?: {
    /** 花盘半径(米,成熟时) */
    headRadius: number;
    /** 花瓣(舌状花)数量 */
    petalCount: number;
    /** 花瓣颜色 */
    petalColor: string;
    /** 花瓣末端颜色(渐变) */
    petalTipColor?: string;
    /** 花盘(管状花)颜色 */
    discColor: string;
    /** 花盘(管状花)中心颜色,做轻微渐变 */
    discCenterColor?: string;
    /** 花盘背面萼片颜色 */
    sepalColor: string;
    /** 是否向日(花盘跟随太阳方位) */
    heliotropism?: boolean;
    /** 凋谢时花瓣颜色 */
    petalSenescentColor: string;
  };

  fruit?: {
    /** 单个果实半径(米) */
    radius: number;
    /** 未熟颜色 */
    colorYoung: string;
    /** 成熟颜色 */
    colorRipe: string;
    /** 单株最大果实数 */
    maxCount: number;
  };

  leaf: {
    /** 嫩叶颜色 */
    colorYoung: string;
    /** 成熟叶颜色 */
    colorMature: string;
    /** 衰老变黄颜色 */
    colorSenescent: string;
    /** 凋亡棕枯颜色 */
    colorDead: string;
    /** 叶形:"cordate"心形 / "lanceolate"披针 / "oval"卵形 */
    shape: "cordate" | "lanceolate" | "oval";
    /** 叶缘锯齿强度(0=平滑,1=明显) */
    serration: number;
  };

  stem: {
    /** 嫩茎颜色 */
    colorYoung: string;
    /** 成熟茎颜色 */
    colorMature: string;
    /** 木质化/枯死颜色 */
    colorDead: string;
  };
}
