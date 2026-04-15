import React, { useCallback, useEffect, useRef, useState } from 'react';
import { startScratch, stopScratch } from '../sounds';

interface ScratchCardProps {
  onComplete?: () => void;
  onZoneReveal?: (index: number) => void;
  rows?: number;
  cols?: number;
  children: React.ReactNode;
  brushSize?: number;
  /** 单格达到该比例（0-100）后整格一次性揭开 */
  threshold?: number;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({
  onComplete,
  onZoneReveal,
  rows = 1,
  cols = 1,
  children,
  brushSize = 28,
  threshold = 35,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const revealedZones = useRef<Set<number>>(new Set());

  const getZoneRect = useCallback(
    (index: number) => {
      if (dimensions.w === 0) return null;
      const c = index % cols;
      const r = Math.floor(index / cols);
      const w = dimensions.w / cols;
      const h = dimensions.h / rows;
      return { x: c * w, y: r * h, w, h };
    },
    [dimensions, rows, cols]
  );

  const getZoneAt = useCallback(
    (x: number, y: number) => {
      if (dimensions.w === 0) return null;
      const w = dimensions.w / cols;
      const h = dimensions.h / rows;
      const c = Math.min(cols - 1, Math.max(0, Math.floor(x / w)));
      const r = Math.min(rows - 1, Math.max(0, Math.floor(y / h)));
      return r * cols + c;
    },
    [dimensions, rows, cols]
  );

  // 监听容器尺寸
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const rect = container.getBoundingClientRect();
      setDimensions({ w: rect.width, h: rect.height });
    };

    const observer = new ResizeObserver(update);
    observer.observe(container);
    update();
    const t = setTimeout(update, 100);

    return () => {
      observer.disconnect();
      clearTimeout(t);
    };
  }, []);

  // 初始化涂层
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.w === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = dimensions.w;
    canvas.height = dimensions.h;

    // 底色
    ctx.fillStyle = '#B8B8B8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 金属径向
    const radial = ctx.createRadialGradient(
      dimensions.w / 2,
      dimensions.h / 2,
      0,
      dimensions.w / 2,
      dimensions.h / 2,
      Math.max(dimensions.w, dimensions.h) / 1.2
    );
    radial.addColorStop(0, '#F5F5F5');
    radial.addColorStop(0.4, '#D8D8D8');
    radial.addColorStop(1, '#9E9E9E');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, dimensions.w, dimensions.h);

    // 斜向光泽
    const sheen = ctx.createLinearGradient(0, 0, dimensions.w, dimensions.h);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
    sheen.addColorStop(0.6, 'rgba(0, 0, 0, 0.06)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, dimensions.w, dimensions.h);

    // 金属噪点
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 64;
    noiseCanvas.height = 64;
    const nctx = noiseCanvas.getContext('2d');
    if (nctx) {
      const noiseData = nctx.createImageData(64, 64);
      for (let i = 0; i < noiseData.data.length; i += 4) {
        const v = Math.random() * 255;
        noiseData.data[i] = v;
        noiseData.data[i + 1] = v;
        noiseData.data[i + 2] = v;
        noiseData.data[i + 3] = 28;
      }
      nctx.putImageData(noiseData, 0, 0);
      const pattern = ctx.createPattern(noiseCanvas, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, dimensions.w, dimensions.h);
      }
    }

    // 外框
    ctx.strokeStyle = 'rgba(170, 119, 28, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, dimensions.w - 2, dimensions.h - 2);

    // 中央"刮我"提示
    ctx.fillStyle = 'rgba(110, 80, 40, 0.5)';
    ctx.font = 'bold 18px "Noto Serif SC", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('刮 我', dimensions.w / 2, dimensions.h / 2);

    // 顶部小提示
    ctx.fillStyle = 'rgba(90, 80, 60, 0.6)';
    ctx.font = '600 9px "Inter", sans-serif';
    ctx.fillText('· SCRATCH TO REVEAL ·', dimensions.w / 2, 10);

    // 重置状态
    revealedZones.current = new Set();
    setIsComplete(false);
  }, [dimensions, rows, cols]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let cx = 0;
    let cy = 0;
    if ('touches' in e) {
      const t = e.touches[0] || (e as React.TouchEvent).changedTouches?.[0];
      if (!t) return { x: 0, y: 0 };
      cx = t.clientX;
      cy = t.clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    return { x: cx - rect.left, y: cy - rect.top };
  };

  // 检查某格是否刮够比例，够则一次性揭开
  const maybeRevealZone = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (revealedZones.current.has(index)) return;

      const rect = getZoneRect(index);
      if (!rect) return;
      const ix = Math.max(0, Math.floor(rect.x));
      const iy = Math.max(0, Math.floor(rect.y));
      const iw = Math.min(canvas.width - ix, Math.ceil(rect.w));
      const ih = Math.min(canvas.height - iy, Math.ceil(rect.h));
      if (iw <= 0 || ih <= 0) return;

      const img = ctx.getImageData(ix, iy, iw, ih);
      const data = img.data;
      let transparent = 0;
      let total = 0;
      for (let i = 3; i < data.length; i += 16) {
        if (data[i] < 100) transparent++;
        total++;
      }
      if (total === 0) return;
      const ratio = (transparent / total) * 100;

      if (ratio >= threshold) {
        // 整格一次性揭开
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.restore();

        revealedZones.current.add(index);
        onZoneReveal?.(index);

        if (revealedZones.current.size >= rows * cols && !isComplete) {
          setIsComplete(true);
          onComplete?.();
        }
      }
    },
    [getZoneRect, threshold, onZoneReveal, onComplete, rows, cols, isComplete]
  );

  // 自由刮——不限制在某一格内，笔刷经过哪些格就检查哪些
  const scratch = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas || isComplete) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 在两点之间插值画圆，让笔触连续不断裂
      const last = lastPosRef.current;
      const points: { x: number; y: number }[] = [];
      if (last) {
        const dx = x - last.x;
        const dy = y - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = Math.max(2, brushSize / 4);
        const count = Math.ceil(dist / step);
        for (let i = 0; i <= count; i++) {
          const t = count === 0 ? 1 : i / count;
          points.push({ x: last.x + dx * t, y: last.y + dy * t });
        }
      } else {
        points.push({ x, y });
      }
      lastPosRef.current = { x, y };

      // 一次性绘制所有插值点
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, brushSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 收集笔刷路径覆盖的所有格子并检查
      const zonesToCheck = new Set<number>();
      for (const p of points) {
        // 检查笔刷范围四角 + 中心涉及的格子
        for (const [ox, oy] of [[0, 0], [-brushSize, -brushSize], [brushSize, -brushSize], [-brushSize, brushSize], [brushSize, brushSize]]) {
          const zone = getZoneAt(p.x + ox, p.y + oy);
          if (zone !== null && !revealedZones.current.has(zone)) {
            zonesToCheck.add(zone);
          }
        }
      }
      for (const z of zonesToCheck) {
        maybeRevealZone(z);
      }
    },
    [isComplete, brushSize, getZoneAt, maybeRevealZone]
  );

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getPos(e);
    isDrawingRef.current = true;
    lastPosRef.current = null;
    startScratch();
    scratch(x, y);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const { x, y } = getPos(e);
    scratch(x, y);
  };

  const handleEnd = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
    stopScratch();
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl shadow-inner bg-gray-100 w-full h-full min-h-[200px]"
    >
      {/* Prize Content */}
      <div className="absolute inset-0 z-0 w-full h-full">{children}</div>

      {/* Scratch Layer */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-10 cursor-crosshair transition-opacity duration-700 ease-in-out ${
          isComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        style={{ touchAction: 'none', width: '100%', height: '100%' }}
      />
    </div>
  );
};
