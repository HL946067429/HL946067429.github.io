import * as THREE from "three";

/**
 * 程序化纹理生成器 (Canvas 2D)。
 *
 * 核心理念:**纹理只编码"结构细节"(叶脉/条纹/边缘暗化),颜色由 instanceColor 提供**。
 * 这样同一张纹理可以贴在嫩叶/成熟叶/枯黄叶/枯死叶上,只换 instanceColor 的色调即可。
 *
 * MeshStandardMaterial 的最终颜色 = material.color × map × instanceColor。
 * 我们让 material.color = 白(默认),map = 灰度(白基底 + 暗脉),instanceColor 提供生命阶段色调。
 */
const _cache = new Map<string, THREE.Texture>();

function getCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function makeColorTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function makeDataTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 4;
  return t;
}

function speckle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  density = 6000,
  alphaMax = 0.05,
) {
  for (let i = 0; i < density; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = Math.random() * alphaMax;
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

/* ============================================================
 * 叶片细节贴图(灰度)
 * 输出:白基底 + 主脉/侧脉/边缘暗化。沿 U=length(0→tip)、V=width。
 * ============================================================ */
export function getLeafDetailTexture(): THREE.Texture {
  const key = "leaf-detail-v3-palmate";
  const cached = _cache.get(key);
  if (cached) return cached;

  const W = 512;
  const H = 256;
  const c = getCanvas(W, H);
  const ctx = c.getContext("2d")!;

  // 基底:亮 95% 白,沿 length 略变(基部稍暗 → 尖端略亮)
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#cfcfcf");
  grad.addColorStop(0.4, "#efefef");
  grad.addColorStop(1, "#dadada");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // === 掌状(palmate)脉序 ===
  // 向日葵叶子典型的脉相:3-5 条主脉从叶柄基部(U=0)呈放射状散开
  // 我们在叶基(x=0, y=H/2)处发出 5 条主脉,向叶尖+叶缘方向扇形展开
  const baseX = 4;
  const baseY = H / 2;
  const tipX = W - 4;

  // 5 条主脉的目标点(到达叶轮廓附近)
  const veinTargets = [
    { x: tipX, y: H * 0.5, w: 4.5, alpha: 0.65 }, // 中脉(最强)
    { x: tipX * 0.9, y: H * 0.18, w: 3.2, alpha: 0.55 }, // 上侧主脉
    { x: tipX * 0.9, y: H * 0.82, w: 3.2, alpha: 0.55 }, // 下侧主脉
    { x: tipX * 0.65, y: H * 0.05, w: 2.4, alpha: 0.45 }, // 上侧副主脉
    { x: tipX * 0.65, y: H * 0.95, w: 2.4, alpha: 0.45 }, // 下侧副主脉
  ];

  for (const v of veinTargets) {
    ctx.strokeStyle = `rgba(40,55,18,${v.alpha})`;
    ctx.lineWidth = v.w;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    // 主脉略带弧度,中段往叶缘方向偏一点
    const midX = (baseX + v.x) / 2;
    const midY = (baseY + v.y) / 2 + (v.y - baseY) * 0.15;
    ctx.quadraticCurveTo(midX, midY, v.x, v.y);
    ctx.stroke();
  }

  // 二级脉:从主脉散出短斜分支
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = "rgba(60,75,30,0.32)";
  for (const v of veinTargets) {
    const segs = 6;
    for (let s = 1; s < segs; s++) {
      const t = s / segs;
      // 沿主脉曲线取点(线性近似,够用)
      const px = baseX + (v.x - baseX) * t;
      const py = baseY + (v.y - baseY) * t;
      // 法线方向(向叶缘一侧)
      const dx = v.x - baseX;
      const dy = v.y - baseY;
      const len = Math.hypot(dx, dy);
      const nx = -dy / len;
      const ny = dx / len;
      // 朝向叶缘的二级脉(往主脉外侧延伸,长度递减)
      const branchLen = 8 + 14 * (1 - t);
      // 决定哪一侧是"外侧"(远离中线的一侧)
      const outwardSign = v.y < baseY ? -1 : v.y > baseY ? 1 : 0;
      if (outwardSign !== 0) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(
          px + nx * branchLen * outwardSign * 0.6,
          py + ny * branchLen * outwardSign * 0.6,
        );
        ctx.stroke();
      }
    }
  }

  // 三级网状脉(随机短线 + 偏向放射方向)
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = "rgba(60,75,30,0.18)";
  for (let i = 0; i < 320; i++) {
    const x = baseX + Math.random() * (W - baseX);
    const y = Math.random() * H;
    const len = 3 + Math.random() * 9;
    // 偏向"基部→当前点"的放射方向
    const radDx = x - baseX;
    const radDy = y - baseY;
    const radLen = Math.hypot(radDx, radDy);
    const radAng = Math.atan2(radDy, radDx);
    const ang = radAng + (Math.random() - 0.5) * Math.PI * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
    // 用 radLen 防 lint
    void radLen;
  }

  // 边缘暗化
  const margin = ctx.createLinearGradient(0, 0, 0, H);
  margin.addColorStop(0, "rgba(0,0,0,0.18)");
  margin.addColorStop(0.08, "rgba(0,0,0,0)");
  margin.addColorStop(0.92, "rgba(0,0,0,0)");
  margin.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = margin;
  ctx.fillRect(0, 0, W, H);

  speckle(ctx, W, H, 4000, 0.05);

  const tex = makeColorTexture(c);
  _cache.set(key, tex);
  return tex;
}

/** 叶面粗糙度贴图:叶脉处略光滑(角质层薄)、叶肉略糙;数据贴图 */
export function getLeafRoughnessTexture(): THREE.Texture {
  const key = "leaf-rough-v2";
  const cached = _cache.get(key);
  if (cached) return cached;

  const W = 256;
  const H = 128;
  const c = getCanvas(W, H);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#aaaaaa"; // 默认 0.67 粗糙
  ctx.fillRect(0, 0, W, H);

  // 主脉略光滑(暗 → 低粗糙)
  ctx.strokeStyle = "rgba(60,60,60,0.7)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();

  speckle(ctx, W, H, 2000, 0.08);
  const tex = makeDataTexture(c);
  _cache.set(key, tex);
  return tex;
}

/* ============================================================
 * 花瓣细节(灰度,同样思路)
 * ============================================================ */
export function getPetalDetailTexture(): THREE.Texture {
  const key = "petal-detail-v2";
  const cached = _cache.get(key);
  if (cached) return cached;

  const W = 256;
  const H = 96;
  const c = getCanvas(W, H);
  const ctx = c.getContext("2d")!;

  // 基底:基部略浅,尖端略深(模拟花瓣根部黄、尖端橙的暗度差)
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#f5f5f5");
  grad.addColorStop(0.4, "#fafafa");
  grad.addColorStop(1, "#c8c8c8");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 中脉
  ctx.strokeStyle = "rgba(80,40,10,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();

  // 纵向细纹
  ctx.strokeStyle = "rgba(80,40,10,0.18)";
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 14; i++) {
    const yOffset = (i / 14 - 0.5) * H * 0.7 + H / 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.1, yOffset);
    ctx.bezierCurveTo(
      W * 0.4, yOffset + (Math.random() - 0.5) * 6,
      W * 0.7, yOffset + (Math.random() - 0.5) * 6,
      W * 0.95, yOffset + (Math.random() - 0.5) * 4,
    );
    ctx.stroke();
  }

  // 边缘暗化
  const margin = ctx.createLinearGradient(0, 0, 0, H);
  margin.addColorStop(0, "rgba(0,0,0,0.2)");
  margin.addColorStop(0.1, "rgba(0,0,0,0)");
  margin.addColorStop(0.9, "rgba(0,0,0,0)");
  margin.addColorStop(1, "rgba(0,0,0,0.2)");
  ctx.fillStyle = margin;
  ctx.fillRect(0, 0, W, H);

  // 尖端微光晕(模拟花瓣老化时尖端褪色)
  const tipGrad = ctx.createLinearGradient(W * 0.85, 0, W, 0);
  tipGrad.addColorStop(0, "rgba(255,255,255,0)");
  tipGrad.addColorStop(1, "rgba(255,255,255,0.18)");
  ctx.fillStyle = tipGrad;
  ctx.fillRect(W * 0.85, 0, W * 0.15, H);

  speckle(ctx, W, H, 1000, 0.04);

  const tex = makeColorTexture(c);
  _cache.set(key, tex);
  return tex;
}

/* ============================================================
 * 花盘 bumpMap:Vogel 螺旋种子的高度场,白 = 凸起,黑 = 凹陷
 * 用作 MeshStandardMaterial.bumpMap,让花盘在光照下有真实的 3D 颗粒感
 * ============================================================ */
export function getDiscBumpTexture(): THREE.Texture {
  const key = "disc-bump-v1";
  const cached = _cache.get(key);
  if (cached) return cached;

  const SIZE = 512;
  const c = getCanvas(SIZE, SIZE);
  const ctx = c.getContext("2d")!;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = SIZE / 2 - 2;

  // 背景:中性灰(无凸起)
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 每颗种子用径向渐变:中心白 → 边缘灰
  const GOLDEN = 137.508 * (Math.PI / 180);
  const N = 480;
  const maxR = Math.sqrt(N);
  for (let i = 0; i < N; i++) {
    const r = (Math.sqrt(i + 0.5) / maxR) * (R - 8);
    const theta = i * GOLDEN;
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    const seedR = 4 + (1 - r / R) * 4;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, seedR);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.6, "#a0a0a0");
    grad.addColorStop(1, "#606060");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, seedR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 圆外缘略略下沉,形成"花盘边缘塌进去"的感觉
  const margin = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R);
  margin.addColorStop(0, "rgba(128,128,128,0)");
  margin.addColorStop(1, "rgba(60,60,60,1)");
  ctx.fillStyle = margin;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  const tex = makeDataTexture(c);
  _cache.set(key, tex);
  return tex;
}

/* ============================================================
 * 花盘"管状花"密堆纹理 — 用于平面 disc geometry 替代上千个小球
 * 输出:深褐色背景 + Vogel 螺旋上的暗色种子点
 * ============================================================ */
export function getDiscTexture(opts: {
  outerColor: string;
  centerColor: string;
}): THREE.Texture {
  const key = `disc:${opts.outerColor}|${opts.centerColor}`;
  const cached = _cache.get(key);
  if (cached) return cached;

  const SIZE = 512;
  const c = getCanvas(SIZE, SIZE);
  const ctx = c.getContext("2d")!;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = SIZE / 2 - 2;

  // 径向渐变:中心深棕→外环略黄
  const radial = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  radial.addColorStop(0, opts.centerColor);
  radial.addColorStop(0.7, opts.centerColor);
  radial.addColorStop(1, opts.outerColor);
  ctx.fillStyle = radial;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();

  // 外圈花粉黄(开花期管状花顶端的雄蕊外露)
  ctx.strokeStyle = "rgba(240,190,40,0.5)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 8, 0, Math.PI * 2);
  ctx.stroke();

  // Vogel 螺旋种子点
  const GOLDEN = 137.508 * (Math.PI / 180);
  const N = 480;
  const maxR = Math.sqrt(N);
  for (let i = 0; i < N; i++) {
    const r = (Math.sqrt(i + 0.5) / maxR) * (R - 8);
    const theta = i * GOLDEN;
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    const seedR = 3 + (1 - r / R) * 4;
    // 中心暗,外围略亮
    const lerp = r / R;
    const seedColor = `rgba(${20 + lerp * 50},${10 + lerp * 30},${5 + lerp * 10},0.95)`;
    ctx.fillStyle = seedColor;
    ctx.beginPath();
    ctx.arc(x, y, seedR, 0, Math.PI * 2);
    ctx.fill();
    // 高光小点
    ctx.fillStyle = "rgba(255,240,180,0.45)";
    ctx.beginPath();
    ctx.arc(x - seedR * 0.3, y - seedR * 0.3, seedR * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  speckle(ctx, SIZE, SIZE, 3000, 0.05);

  const tex = makeColorTexture(c);
  _cache.set(key, tex);
  return tex;
}
