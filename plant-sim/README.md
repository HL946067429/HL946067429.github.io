# 🌱 Plant Sim · 植物生长仿真

科研级 functional-structural plant model（FSPM）的浏览器实现，目标是支持移动端、纯静态部署到 GitHub Pages。

## 部署

跟根仓库 GitHub Actions 共用同一个 workflow（`.github/workflows/deploy.yml`），push 到 `main` 自动部署。

线上地址：`https://hl946067429.github.io/plant-sim/`

## 本地开发

```bash
cd plant-sim
npm install
npm run dev          # http://localhost:3100
npm run build        # 输出到 dist/
npm run lint         # tsc --noEmit
```

## 技术栈

| 层 | 选型 |
|----|------|
| 构建 | Vite 6 + React 18 + TypeScript |
| 3D | react-three-fiber + drei (Three.js) |
| 状态 | Zustand |
| UI | Tailwind CSS 4 |
| 太阳计算 | suncalc (NREL SPA) |

## 模型蓝图

| 模块 | 算法 | 状态 |
|------|------|------|
| 太阳位置 | suncalc | ✅ |
| 时间轴 | UTC ms + speed | ✅ |
| 多预设地点 | lat/lon/elevation/timezone | ✅ |
| 天空着色 | drei `<Sky>` (Preetham) | ✅ |
| 气象数据 | Open-Meteo API | ⏳ |
| 冠层辐射 | Beer-Lambert 多层 | ⏳ |
| 光合作用 | Farquhar-von Caemmerer-Berry (C3) + Collatz (C4) | ⏳ |
| 气孔/蒸腾 | Ball-Berry + Penman-Monteith | ⏳ |
| 物候 | GDD（积温） | ⏳ |
| 形态结构 | L-System + Space Colonization，与碳分配耦合 | ⏳ |
| 土壤水分 | tipping bucket → Richards | ⏳ |

## 目录结构

```
src/
├── main.tsx
├── App.tsx
├── scene/        # r3f 渲染层
├── models/       # 纯函数仿真算法（无 DOM）
├── stores/       # zustand 状态
├── hooks/        # React hooks
├── components/   # UI（控制面板等）
└── api/          # 外部 API（气象等）
```

约定：`models/` 下的代码必须可在 Web Worker 内运行，不引用 DOM/Three.js。
