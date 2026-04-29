import * as THREE from "three";

/**
 * 心形(cordate)叶片参数化几何。
 * 局部坐标:X 沿叶柄→叶尖方向,Z 横向(叶宽),Y 轻微杯状起伏(也是法向)。
 * 这样叶子默认是水平躺平的(法向 +Y),便于上层只需绕 Y(方位)、绕 Z(俯仰)、绕 X(卷曲)旋转。
 *
 * 思路:
 * - 沿叶轴 t∈[0,1] 取若干切片,每片宽度由心形半宽函数 w(t) 决定
 * - 锯齿:在 w(t) 上叠加高频小扰动
 * - 主脉:中线略凸(y+),叶缘略下垂(y-),形成微弱杯状
 * - 顶点色:从基部到尖部、从主脉到叶缘各做插值,后续可在 shader 用
 */
export function buildCordateLeaf(opts: {
  length: number;
  serration?: number; // 0-1
  axisSegments?: number;
  widthSegments?: number;
}): THREE.BufferGeometry {
  const { length, serration = 0.6, axisSegments = 16, widthSegments = 8 } = opts;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = []; // r=tip(0近基→1近尖),g=margin(0中脉→1叶缘),b未用
  const indices: number[] = [];

  // 心形半宽 w(t) ∈ [0,1]:基部凹陷、中段最宽、尖端收窄
  // 用经验函数:w(t) = 4 * t * (1-t)^0.6 * (1 - cos(πt)) / 1.0
  const halfWidth = (t: number) => {
    if (t <= 0 || t >= 1) return 0;
    const base = 4 * Math.pow(t, 0.85) * Math.pow(1 - t, 0.55);
    // 基部凹陷(t→0 时多减一点)
    const cleft = t < 0.08 ? -0.6 * (0.08 - t) / 0.08 : 0;
    // 锯齿:高频但小幅
    const ser = serration * 0.06 * Math.sin(t * Math.PI * 14);
    return Math.max(0, base + cleft + ser);
  };

  const cupZ = (t: number, lateral: number) => {
    // 中脉 lateral=0 时略凸,叶缘 |lateral|=1 时略下垂
    const along = Math.sin(Math.PI * t);
    return (1 - Math.abs(lateral)) * 0.04 * along - Math.abs(lateral) * 0.02 * along;
  };

  const widthScale = length * 0.55; // 叶片宽长比 ~0.55

  for (let i = 0; i <= axisSegments; i++) {
    const t = i / axisSegments;
    const x = t * length;
    const hw = halfWidth(t) * widthScale;
    for (let j = 0; j <= widthSegments; j++) {
      // lateral 从 -1(左缘)到 +1(右缘)
      const lateral = (j / widthSegments) * 2 - 1;
      const widthOffset = lateral * hw;     // 叶宽方向,放进世界 Z
      const cup = cupZ(t, lateral) * widthScale; // 杯状起伏,放进世界 Y(法向)
      positions.push(x, cup, widthOffset);
      // 法向先粗略给 +Y,后续 computeVertexNormals
      normals.push(0, 1, 0);
      uvs.push(t, (lateral + 1) / 2);
      // 顶点色通道:r=t(沿叶轴位置),g=|lateral|(到叶缘的距离)
      colors.push(t, Math.abs(lateral), 1);
    }
  }

  const cols = widthSegments + 1;
  for (let i = 0; i < axisSegments; i++) {
    for (let j = 0; j < widthSegments; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** 椭圆披针形花瓣,沿 X 轴朝外,基部窄、中段最宽、末端尖 */
export function buildPetal(opts: {
  length: number;
  width: number;
  segments?: number;
}): THREE.BufferGeometry {
  const { length, width, segments = 8 } = opts;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = []; // r=t (0基→1尖)
  const indices: number[] = [];

  const halfWidth = (t: number) => {
    if (t <= 0 || t >= 1) return 0;
    return Math.pow(Math.sin(Math.PI * t), 1.1) * 0.5;
  };

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * length;
    const hw = halfWidth(t) * width;
    // 中线略略上抬(y+),叶/瓣缘下沉(y-eps),形成微弱杯状,法向朝 +Y
    const midRise = 0.18 * Math.sin(Math.PI * t) * width;
    for (let s = -1; s <= 1; s += 2) {
      const widthOffset = s * hw;
      // 中线: |s|=0,沿 y 抬;边缘: |s|=1,y=0
      const yLift = Math.abs(s) === 0 ? midRise : 0;
      positions.push(x, yLift, widthOffset);
      normals.push(0, 1, 0);
      uvs.push(t, (s + 1) / 2);
      colors.push(t, 0, 0);
    }
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
