import React, { useCallback, useEffect, useRef, useState } from 'react';
type Toast = { id: number; text: string; x: number };
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, Gift, Star, RotateCw, Trophy, X, ChevronRight, Flower, Info, Bug, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ICON_MAP } from './icons';
import { useItems } from './useItems';
import { useMute } from './useMute';
import {
  playWinReal, playWinFunny, playLose, playTick, playAllDone,
  playHack, playAlarm, playEnvelope, playOpenEnvelope,
  vibrate, vibrateWin, vibrateBigWin, vibrateLose,
} from './sounds';
import type { RawItem } from './types';
import { getTier, groupByTier } from './types';

/* ------------------------------------------------------------------ */
/*  幸运大转盘                                                         */
/* ------------------------------------------------------------------ */

import type { ToastsConfig } from './types';

const FALLBACK_TOASTS: ToastsConfig = {
  real: ['哇塞！'], funny: ['哈哈！'], filler: ['加油！'],
};
const pickToast = (toasts: ToastsConfig, type: string) => {
  const pool = type === 'real' ? toasts.real : type === 'filler' ? toasts.filler : toasts.funny;
  return pool[Math.floor(Math.random() * pool.length)];
};

const SPINS_KEY = 'ggl:wheel-spins-used';
const WON_KEY = 'ggl:wheel-won-indices';
const DEFAULT_SPINS = 3;

const SLICE_PAIRS = [
  ['#c41e3a', '#a0162a'],
  ['#003366', '#001d3d'],
  ['#b8192e', '#8b0f24'],
  ['#002855', '#001a3d'],
];
const GOLD = '#d4af37';
const DARK_GOLD = '#aa771c';

export default function Wheel() {
  const { config } = useItems();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [spinning, setSpinning] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [wonIndices, setWonIndices] = useState<Set<number>>(() => {
    try { const s = localStorage.getItem(WON_KEY); return s ? new Set(JSON.parse(s)) : new Set(); }
    catch { return new Set(); }
  });
  const [spinsUsed, setSpinsUsed] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(SPINS_KEY) || '0', 10) || 0; }
    catch { return 0; }
  });
  const [showModal, setShowModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [wonItem, setWonItem] = useState<{ item: RawItem; index: number } | null>(null);
  const [wonQuip, setWonQuip] = useState('');
  const [allDone, setAllDone] = useState(false);
  const [fillerStreak, setFillerStreak] = useState(0);
  // 作弊系统
  const [cheatPhase, setCheatPhase] = useState<'idle' | 'hacking' | 'failed'>('idle');
  const [cheatMsg, setCheatMsg] = useState('');
  const [muted, setMuted] = useMute();
  // 红包模式
  const [envelope, setEnvelope] = useState<'sealed' | 'opening' | null>(null);
  // 搞怪弹幕
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const addToast = useCallback((text: string) => {
    const id = ++toastIdRef.current;
    const x = 15 + Math.random() * 70;
    setToasts(prev => [...prev, { id, text, x }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200);
  }, []);

  const items = config?.items ?? [];
  const n = items.length;
  const sliceAngle = n > 0 ? 360 / n : 0;
  const maxSpins = config?.wheelSpins ?? DEFAULT_SPINS;
  const remainingSpins = Math.max(0, maxSpins - spinsUsed);
  const hasWonReal = items.some((item, i) => wonIndices.has(i) && item.type === 'real');
  const spinsExhausted = remainingSpins <= 0;

  // 摇一摇：用 ref 追踪最新状态，避免闭包过时（先声明，spin 定义后赋值）
  const spinRef = useRef<() => void>(() => {});
  const canShakeRef = useRef(false);
  const [shakeEnabled, setShakeEnabled] = useState(false);

  // 持久化到 localStorage
  useEffect(() => {
    localStorage.setItem(SPINS_KEY, String(spinsUsed));
  }, [spinsUsed]);
  useEffect(() => {
    localStorage.setItem(WON_KEY, JSON.stringify([...wonIndices]));
  }, [wonIndices]);

  /* -------- Canvas 绘制 -------- */
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || n === 0) return;
    const size = canvas.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = size / 2;
    const cy = size / 2;
    const R = size / 2 - 8;
    const slice = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, size, size);

    // 外圈深色底环
    ctx.beginPath();
    ctx.arc(cx, cy, R + 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fill();

    for (let i = 0; i < n; i++) {
      const start = i * slice - Math.PI / 2;
      const end = start + slice;
      const mid = start + slice / 2;
      const revealed = wonIndices.has(i);

      // 扇形渐变填充
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, start, end);
      ctx.closePath();

      if (revealed) {
        const g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
        g.addColorStop(0, '#e8e8e8');
        g.addColorStop(1, '#d0d0d0');
        ctx.fillStyle = g;
      } else {
        const pair = SLICE_PAIRS[i % SLICE_PAIRS.length];
        const g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
        g.addColorStop(0, pair[0]);
        g.addColorStop(1, pair[1]);
        ctx.fillStyle = g;
      }
      ctx.fill();

      // 高光条（顶部一条微亮）
      if (!revealed) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, start, start + slice * 0.3);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(0, 0, size, size);
        ctx.restore();
      }

      // 描边
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, start, end);
      ctx.closePath();
      ctx.strokeStyle = revealed ? 'rgba(180,180,180,0.6)' : `rgba(212,175,55,0.5)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 文字（沿径向旋转）
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);

      if (revealed) {
        // 已揭示：奖级 + ✓
        ctx.fillStyle = '#aaa';
        ctx.font = `bold ${Math.min(13, Math.max(9, 200 / n))}px "Noto Serif SC", "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tier = getTier(items[i]);
        const label = tier.length > 5 ? tier.slice(0, 5) + '…' : tier;
        ctx.fillText(label, R * 0.56, 0);
        ctx.fillStyle = '#bbb';
        ctx.font = `bold 10px sans-serif`;
        ctx.fillText('✓', R * 0.83, 0);
      } else {
        // 未揭示：大 "?" + 小序号
        // 问号带阴影
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = `bold ${Math.min(20, Math.max(12, 300 / n))}px "Noto Serif SC", "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', R * 0.5, 0);
        ctx.shadowColor = 'transparent';
        // 序号
        ctx.fillStyle = `rgba(212,175,55,0.8)`;
        ctx.font = `bold ${Math.max(7, 130 / n)}px "JetBrains Mono", monospace`;
        ctx.fillText(`${i + 1}`, R * 0.83, 0);
      }
      ctx.restore();
    }

    // 外圈金色描边
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 内圈装饰环
    ctx.beginPath();
    ctx.arc(cx, cy, R - 3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(212,175,55,0.25)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // 中心渐变圆 + 金环
    const cGrad = ctx.createRadialGradient(cx, cy - 6, 0, cx, cy, 40);
    cGrad.addColorStop(0, '#ffffff');
    cGrad.addColorStop(0.6, '#f5f5f5');
    cGrad.addColorStop(1, '#e0e0e0');
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fillStyle = cGrad;
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4;
    ctx.stroke();
    // 内金环
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(212,175,55,0.35)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [n, items, wonIndices]);

  useEffect(() => { drawWheel(); }, [drawWheel]);

  /* -------- 抽奖逻辑 -------- */
  const spin = () => {
    if (spinning || n === 0 || spinsExhausted) return;
    const available = items.map((_, i) => i).filter(i => !wonIndices.has(i));
    if (available.length === 0) { setAllDone(true); return; }

    setSpinning(true);
    setShowModal(false);

    // 保底：最后一次机会 + 还没中过实物 → 强制从实物里选
    let pool = available;
    if (remainingSpins === 1 && !hasWonReal) {
      const realPool = available.filter(i => items[i].type === 'real');
      if (realPool.length > 0) pool = realPool;
    }
    const targetIdx = pool[Math.floor(Math.random() * pool.length)];
    const targetSliceCenter = targetIdx * sliceAngle + sliceAngle / 2;
    const baseAngle = 360 - targetSliceCenter;
    const extraSpins = (4 + Math.floor(Math.random() * 3)) * 360;
    const finalAngle = currentAngle + extraSpins + ((baseAngle - (currentAngle % 360)) + 360) % 360;

    setCurrentAngle(finalAngle);

    // 咔嗒声调度：用 ease-out 近似 cubic-bezier，按角度变化触发 tick
    const totalDelta = finalAngle - currentAngle;
    const totalDuration = 4200; // 与 CSS 动画一致
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const tickAt: number[] = [];
    let lastSliceIdx = -1;
    const stepMs = 30;
    for (let t = 0; t <= totalDuration; t += stepMs) {
      const angle = currentAngle + totalDelta * easeOut(t / totalDuration);
      const sliceIdx = Math.floor(angle / sliceAngle);
      if (sliceIdx !== lastSliceIdx) {
        tickAt.push(t);
        lastSliceIdx = sliceIdx;
      }
    }
    const tickTimers = tickAt.map((t, i) =>
      setTimeout(() => playTick(0.05 + Math.max(0, 0.05 * (1 - i / tickAt.length))), t)
    );

    setTimeout(() => {
      tickTimers.forEach(clearTimeout);
      const won = items[targetIdx];
      setWonItem({ item: won, index: targetIdx });
      setWonQuip(pickToast(config?.toasts ?? FALLBACK_TOASTS, won.type));
      setWonIndices(prev => new Set(prev).add(targetIdx));
      setSpinsUsed(prev => prev + 1);
      setSpinning(false);

      // 弹出红包（封口状态），等玩家点击拆开
      setEnvelope('sealed');
      playEnvelope();
      vibrate(80);
    }, 4500);
  };

  // 摇一摇 ref 赋值（必须在 spin 定义之后）
  spinRef.current = spin;
  canShakeRef.current = !spinning && !spinsExhausted && !allDone && !envelope && !showModal && !showRules;

  // iOS 需要用户手势触发权限请求
  const requestShake = useCallback(async () => {
    try {
      const DME = DeviceMotionEvent as any;
      if (typeof DME.requestPermission === 'function') {
        const perm = await DME.requestPermission();
        if (perm === 'granted') setShakeEnabled(true);
      } else {
        setShakeEnabled(true);
      }
    } catch { /* ignore */ }
  }, []);

  // 首次点击 GO 时顺带请求摇一摇权限
  const spinWithShake = useCallback(() => {
    if (!shakeEnabled) requestShake();
    spin();
  }, [spin, shakeEnabled, requestShake]);

  // 注册 devicemotion 监听
  useEffect(() => {
    if (!shakeEnabled || typeof window === 'undefined') return;
    let lastShake = 0;
    let lastX = 0, lastY = 0, lastZ = 0;
    const threshold = 25;
    const cooldown = 2000;
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;
      const { x = 0, y = 0, z = 0 } = acc;
      const delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);
      lastX = x!; lastY = y!; lastZ = z!;
      if (delta > threshold && Date.now() - lastShake > cooldown) {
        lastShake = Date.now();
        if (canShakeRef.current) spinRef.current();
      }
    };
    window.addEventListener('devicemotion', handler);
    return () => window.removeEventListener('devicemotion', handler);
  }, [shakeEnabled]);

  const resetAll = () => {
    setWonIndices(new Set());
    setSpinsUsed(0);
    setCurrentAngle(0);
    setShowModal(false);
    setWonItem(null);
    setWonQuip('');
    setAllDone(false);
    setFillerStreak(0);
    localStorage.removeItem(SPINS_KEY);
    localStorage.removeItem(WON_KEY);
  };

  // 拆红包
  const openEnvelope = () => {
    if (envelope !== 'sealed' || !wonItem) return;
    setEnvelope('opening');
    playOpenEnvelope();

    // 音效 + 震动
    const won = wonItem.item;
    if (won.type === 'real') { setTimeout(playWinReal, 300); vibrateBigWin(); }
    else if (won.type === 'filler') { setTimeout(playLose, 300); vibrateLose(); }
    else { setTimeout(playWinFunny, 300); vibrateWin(); }

    // 弹幕
    addToast(pickToast(config?.toasts ?? FALLBACK_TOASTS, won.type));

    // 连续谢谢参与检测
    if (won.type === 'filler') {
      setFillerStreak(prev => prev + 1);
    } else {
      setFillerStreak(0);
    }

    // 彩纸
    const fire = (delay: number, opts: confetti.Options) => setTimeout(() => confetti(opts), delay);
    fire(300, { particleCount: 100, spread: 65, origin: { y: 0.5 }, colors: ['#c41e3a', '#d4af37', '#003366', '#f5d76e'] });
    fire(500, { particleCount: 50, angle: 60, spread: 50, origin: { x: 0, y: 0.6 }, colors: ['#c41e3a', '#d4af37'] });
    fire(700, { particleCount: 50, angle: 120, spread: 50, origin: { x: 1, y: 0.6 }, colors: ['#c41e3a', '#d4af37'] });

    // 延迟后切换到奖品弹窗
    setTimeout(() => {
      setEnvelope(null);
      setShowModal(true);
      if (wonIndices.size >= n || spinsUsed >= maxSpins) {
        setTimeout(() => { setAllDone(true); playAllDone(); vibrateBigWin(); }, 1500);
      }
    }, 1200);
  };

  // 作弊按钮
  const triggerCheat = () => {
    if (cheatPhase !== 'idle' || spinning) return;
    setCheatPhase('hacking');
    playHack();
    const msgs = [
      '正在入侵转盘系统…',
      '绕过防火墙中…',
      '破解随机算法…',
      '修改中奖概率…',
      '植入木马程序…',
    ];
    let i = 0;
    setCheatMsg(msgs[0]);
    const timer = setInterval(() => {
      i++;
      if (i < msgs.length) {
        setCheatMsg(msgs[i]);
        playHack();
      } else {
        clearInterval(timer);
        setCheatPhase('failed');
        setCheatMsg('');
        playAlarm();
        vibrate([100, 60, 100, 60, 200]);
      }
    }, 800);
  };

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        <Sparkles className="w-5 h-5 mr-2 text-[#d4af37] animate-pulse" />正在准备惊喜…
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative select-none">
      {/* 背景 */}
      <div className="absolute inset-0 bg-noise pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.18, 0], scale: [0.5, 1.2, 0.5], y: [0, -200, 0], x: [0, Math.random() * 100 - 50, 0] }}
            transition={{ duration: 8 + Math.random() * 8, repeat: Infinity, delay: i * 1.3 }}
            className="absolute"
            style={{ left: Math.random() * 100 + '%', top: Math.random() * 100 + '%' }}
          >
            {i % 3 === 0
              ? <Sparkles className="text-[#d4af37]" size={10 + Math.random() * 10} />
              : <Heart className="text-red-400 fill-current" size={10 + Math.random() * 12} />
            }
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-5 text-center z-10 relative">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-[#d4af37] to-[#d4af37]" />
          <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
          <div className="h-[1px] w-10 bg-gradient-to-l from-transparent via-[#d4af37] to-[#d4af37]" />
        </div>
        <h1 className="gold-shimmer text-[36px] sm:text-[42px] font-black font-serif tracking-[0.18em] leading-none">幸运大转盘</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#d4af37]" />
          <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.3em]">LUCKY WHEEL · ONE YEAR</span>
          <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#d4af37]" />
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-1.5 rounded-full border border-[#d4af37]/30 shadow-sm">
            <span className="text-gray-500 text-xs font-bold">剩余</span>
            <span className={`font-black text-sm ${remainingSpins <= 1 ? 'text-[#c41e3a]' : 'text-[#003366]'}`}>{remainingSpins}</span>
            <span className="text-gray-400 text-xs">次</span>
            <span className="text-gray-300 mx-0.5">|</span>
            <span className="text-gray-500 text-xs font-bold">已得</span>
            <span className="font-black text-[#c41e3a] text-sm">{wonIndices.size}</span>
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-[#d4af37]/30 shadow-sm text-gray-600 text-xs font-bold hover:border-[#d4af37] hover:shadow-md transition-all"
          >
            <Info className="w-3.5 h-3.5 text-[#d4af37]" />
            规则
          </button>
          <button
            onClick={() => setMuted(!muted)}
            title={muted ? '开启音效' : '关闭音效'}
            className="inline-flex items-center justify-center w-8 h-8 bg-white/70 backdrop-blur-sm rounded-full border border-[#d4af37]/30 shadow-sm text-gray-600 hover:border-[#d4af37] hover:text-[#c41e3a] transition-all"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </motion.div>

      {/* 转盘主体 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 18, delay: 0.2 }}
        className="relative z-10"
      >
        {/* 指针 */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 flex flex-col items-center drop-shadow-lg">
          <svg width="36" height="30" viewBox="0 0 36 30" fill="none">
            <defs>
              <linearGradient id="ptrGold" x1="18" y1="0" x2="18" y2="30" gradientUnits="userSpaceOnUse">
                <stop stopColor="#f5d76e" />
                <stop offset="0.5" stopColor="#d4af37" />
                <stop offset="1" stopColor="#aa771c" />
              </linearGradient>
            </defs>
            <path d="M18 28 L4 2 Q18 6 32 2 Z" fill="url(#ptrGold)" stroke="#aa771c" strokeWidth="1" />
            <circle cx="18" cy="8" r="3" fill="#fff" opacity="0.5" />
          </svg>
        </div>

        {/* 外圈装饰框 */}
        <div className="w-[320px] h-[320px] sm:w-[370px] sm:h-[370px] rounded-full relative p-[5px]"
          style={{
            background: `conic-gradient(from 0deg, ${GOLD}, ${DARK_GOLD}, ${GOLD}, ${DARK_GOLD}, ${GOLD}, ${DARK_GOLD}, ${GOLD}, ${DARK_GOLD}, ${GOLD})`,
            boxShadow: `0 0 0 4px rgba(170,119,28,0.4), 0 12px 40px rgba(0,0,0,0.35), inset 0 0 15px rgba(255,255,255,0.2)`,
          }}
        >
          {/* 灯泡点 */}
          <div className="absolute inset-0 rounded-full z-10 pointer-events-none">
            {[...Array(28)].map((_, i) => {
              const angle = (i / 28) * Math.PI * 2;
              const pct = 49.5;
              return (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 6, height: 6,
                    top: `${50 - pct * Math.cos(angle)}%`,
                    left: `${50 + pct * Math.sin(angle)}%`,
                    transform: 'translate(-50%, -50%)',
                    background: i % 2 === 0 ? '#fffbe6' : '#c41e3a',
                    boxShadow: i % 2 === 0
                      ? '0 0 6px 2px rgba(255,251,230,0.9)'
                      : '0 0 6px 2px rgba(196,30,58,0.7)',
                    animation: `bulb-blink 1.6s ease-in-out infinite ${i % 2 === 0 ? '0s' : '0.8s'}`,
                  }}
                />
              );
            })}
          </div>

          {/* 转盘 canvas 容器 */}
          <div
            className="w-full h-full rounded-full overflow-hidden"
            style={{
              transform: `rotate(${currentAngle}deg)`,
              transition: spinning ? 'transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="w-full h-full"
            />
          </div>

          {/* 中心按钮 */}
          <button
            onClick={spinWithShake}
            disabled={spinning || allDone || spinsExhausted}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all disabled:cursor-not-allowed"
            style={{
              background: spinning || allDone || spinsExhausted
                ? 'linear-gradient(135deg, #999, #777)'
                : 'linear-gradient(135deg, #c41e3a 0%, #a0162a 50%, #8b0f24 100%)',
              border: `3.5px solid ${GOLD}`,
              boxShadow: spinning
                ? '0 2px 10px rgba(0,0,0,0.3)'
                : `0 0 0 2px rgba(170,119,28,0.3), 0 6px 20px rgba(196,30,58,0.5), inset 0 -3px 6px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.15)`,
            }}
          >
            {spinning ? (
              <RotateCw className="w-7 h-7 text-[#d4af37] animate-spin" />
            ) : allDone || spinsExhausted ? (
              <Trophy className="w-7 h-7 text-[#d4af37]" />
            ) : (
              <div className="flex flex-col items-center leading-none">
                <span className="text-[22px] font-black text-[#d4af37] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">GO</span>
                <span className="text-[8px] font-bold text-[#d4af37]/60 tracking-widest mt-0.5">📱 摇一摇</span>
              </div>
            )}
          </button>
        </div>
      </motion.div>

      {/* 已获得的奖品 */}
      <AnimatePresence>
        {wonIndices.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 w-full max-w-[380px] z-10"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-[#d4af37]/30 shadow-md p-4">
              <h3 className="text-xs font-black text-gray-700 mb-3 flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-[#c41e3a]" />
                已获得的奖品
                <span className="ml-auto text-[10px] text-gray-400 font-mono">{wonIndices.size} items</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {[...wonIndices].sort((a, b) => a - b).map(idx => {
                  const item = items[idx];
                  const IconComp = ICON_MAP[item.icon] ?? Star;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border transition-colors ${
                        item.type === 'real'
                          ? 'bg-gradient-to-r from-[#fff9e6] to-[#fff3c4] border-[#d4af37]/50 text-[#c41e3a]'
                          : item.type === 'filler'
                          ? 'bg-gray-50 border-gray-200 text-gray-500'
                          : 'bg-white border-pink-200/60 text-gray-700'
                      }`}
                    >
                      <IconComp className={`w-3.5 h-3.5 ${item.iconColor}`} />
                      <span>{getTier(item)}</span>
                      <span className="opacity-50 text-[10px]">· {item.title}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部导航 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-5 flex items-center gap-3 z-10"
      >
        <a
          href={import.meta.env.BASE_URL}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-600 shadow-md border border-gray-200/80 hover:border-[#d4af37] hover:shadow-lg transition-all"
        >
          ← 刮刮乐
        </a>
        {wonIndices.size > 0 && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-600 shadow-md border border-gray-200/80 hover:border-[#c41e3a] hover:shadow-lg transition-all"
          >
            <RotateCw className="w-3.5 h-3.5" /> 重新开始
          </button>
        )}
        {/* 半隐藏的作弊按钮 */}
        <button
          onClick={triggerCheat}
          disabled={cheatPhase !== 'idle' || spinning}
          className="px-2.5 py-2.5 rounded-full bg-white/50 text-gray-300 hover:text-red-500 hover:bg-white/90 transition-all disabled:opacity-30"
          title="?"
        >
          <Bug className="w-3.5 h-3.5" />
        </button>
      </motion.div>

      {/* ===================== 红包弹窗 ===================== */}
      <AnimatePresence>
        {envelope && wonItem && (
          <motion.div
            key="envelope-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            {/* 封口状态：等玩家点击 */}
            {envelope === 'sealed' && (
              <motion.div
                initial={{ scale: 0.3, y: 100, rotateZ: -10 }}
                animate={{ scale: 1, y: 0, rotateZ: 0 }}
                transition={{ type: 'spring', stiffness: 250, damping: 16 }}
                onClick={openEnvelope}
                className="relative cursor-pointer select-none"
              >
                {/* 红包主体 */}
                <div className="w-[260px] h-[360px] rounded-3xl relative overflow-hidden shadow-[0_20px_60px_rgba(196,30,58,0.5)]"
                  style={{ background: 'linear-gradient(135deg, #e63946 0%, #c41e3a 40%, #a0162a 100%)' }}
                >
                  {/* 装饰图案 */}
                  <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:14px_14px]" />
                  </div>

                  {/* 顶部金色封口 */}
                  <div className="absolute top-0 left-0 right-0 h-[140px]"
                    style={{
                      background: 'linear-gradient(180deg, #f5d76e 0%, #d4af37 60%, #aa771c 100%)',
                      borderRadius: '24px 24px 0 0',
                      clipPath: 'ellipse(65% 100% at 50% 0%)',
                    }}
                  >
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.3)_1px,transparent_1px)] [background-size:8px_8px]" />
                    </div>
                  </div>

                  {/* 中央圆形印章 */}
                  <div className="absolute top-[90px] left-1/2 -translate-x-1/2 w-[100px] h-[100px] rounded-full flex items-center justify-center z-10"
                    style={{
                      background: 'linear-gradient(135deg, #f5d76e, #d4af37)',
                      boxShadow: '0 8px 20px rgba(170,119,28,0.5), inset 0 -2px 4px rgba(0,0,0,0.1)',
                      border: '4px solid #aa771c',
                    }}
                  >
                    <span className="text-[#8b0f24] text-3xl font-black font-serif drop-shadow-sm">福</span>
                  </div>

                  {/* 奖级文字 */}
                  <div className="absolute bottom-[90px] left-0 right-0 text-center">
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-[#d4af37] text-3xl font-black tracking-[0.2em] font-serif drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                    >
                      {getTier(wonItem.item)}
                    </motion.p>
                  </div>

                  {/* 底部提示 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute bottom-6 left-0 right-0 text-center"
                  >
                    <span className="text-[#d4af37]/80 text-xs font-bold tracking-widest">👆 点击拆开</span>
                  </motion.div>
                </div>

                {/* 浮动金币装饰 */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-2xl pointer-events-none"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 0.8, 0],
                      scale: [0.5, 1.2, 0.5],
                      y: [0, -40 - Math.random() * 40, 0],
                      x: [0, (Math.random() - 0.5) * 80, 0],
                    }}
                    transition={{ duration: 2 + Math.random(), repeat: Infinity, delay: i * 0.4 }}
                    style={{ top: '40%', left: `${20 + i * 12}%` }}
                  >
                    ✨
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* 拆开动画 */}
            {envelope === 'opening' && (
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.15, 0], rotateZ: [0, 0, 15], opacity: [1, 1, 0] }}
                transition={{ duration: 1, ease: 'easeIn' }}
                className="relative"
              >
                <div className="w-[260px] h-[360px] rounded-3xl overflow-hidden shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, #e63946, #c41e3a, #a0162a)' }}
                >
                  {/* 拆裂效果 —— 光芒爆发 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 3, 5] }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-32 h-32 rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.8),transparent_70%)]" />
                  </motion.div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 2, 3], opacity: [1, 1, 0] }}
                      transition={{ duration: 0.8 }}
                      className="text-[60px]"
                    >
                      🧧
                    </motion.span>
                  </div>
                </div>

                {/* 金币爆发 */}
                {[...Array(12)].map((_, i) => {
                  const angle = (i / 12) * Math.PI * 2;
                  return (
                    <motion.div
                      key={i}
                      className="absolute text-xl pointer-events-none"
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{
                        x: Math.cos(angle) * 160,
                        y: Math.sin(angle) * 160,
                        opacity: 0,
                        scale: 0.3,
                      }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ top: '50%', left: '50%', marginTop: -12, marginLeft: -12 }}
                    >
                      {i % 3 === 0 ? '🪙' : i % 3 === 1 ? '✨' : '💰'}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== 奖品弹窗 ===================== */}
      <AnimatePresence>
        {showModal && wonItem && (() => {
          const IconComp = ICON_MAP[wonItem.item.icon] ?? Star;
          const isReal = wonItem.item.type === 'real';
          const isFiller = wonItem.item.type === 'filler';
          return (
            <motion.div
              key="prize-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.3, y: 60, rotateZ: -8 }}
                animate={{ scale: 1, y: 0, rotateZ: 0 }}
                exit={{ scale: 0.8, y: 30, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-b from-white via-white to-[#fffdf7] rounded-3xl p-7 shadow-[0_25px_60px_rgba(0,0,0,0.3)] max-w-[340px] w-full text-center relative overflow-hidden"
                style={{
                  border: isReal ? `3px solid ${GOLD}` : isFiller ? '2px solid #e5e5e5' : '2px solid rgba(236,72,153,0.4)',
                }}
              >
                <div className="absolute inset-0 bg-noise pointer-events-none" />
                {isReal && <div className="absolute inset-0 bg-paper opacity-[0.04] pointer-events-none" />}

                {/* 顶部金色装饰 */}
                {isReal && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
                )}

                {/* 关闭 */}
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 transition z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* 标签 */}
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-wider mb-4 ${
                    isReal ? 'bg-[#fff3c4] text-[#aa771c]' : isFiller ? 'bg-gray-100 text-gray-500' : 'bg-pink-50 text-pink-600'
                  }`}
                >
                  {isReal ? <><Trophy className="w-3 h-3" /> 实物奖品</> : isFiller ? '参与奖' : <><Sparkles className="w-3 h-3" /> 甜蜜惊喜</>}
                </motion.div>

                {/* 大图标 */}
                <motion.div
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 250, delay: 0.15 }}
                  className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center shadow-xl mb-5 relative ${
                    isReal
                      ? 'bg-gradient-to-br from-[#fff9e6] to-[#fff3c4]'
                      : isFiller
                      ? 'bg-gray-100'
                      : 'bg-gradient-to-br from-pink-50 to-white'
                  }`}
                  style={{
                    border: isReal ? `3px solid ${GOLD}` : isFiller ? '2px solid #e5e5e5' : '2px solid rgba(236,72,153,0.3)',
                    boxShadow: isReal
                      ? `0 8px 25px rgba(212,175,55,0.3), inset 0 -2px 4px rgba(0,0,0,0.05)`
                      : '0 8px 20px rgba(0,0,0,0.08)',
                  }}
                >
                  <IconComp className={`w-12 h-12 ${wonItem.item.iconColor}`} />
                  {isReal && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute -top-1 -right-1"
                    >
                      <Sparkles className="w-4 h-4 text-[#d4af37]" />
                    </motion.div>
                  )}
                </motion.div>

                {/* 奖级（大标题） */}
                <motion.h2
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className={`text-[28px] font-black mb-1 tracking-wider ${
                    isReal ? 'text-[#c41e3a]' : isFiller ? 'text-gray-400' : 'text-pink-600'
                  }`}
                >
                  {getTier(wonItem.item)}
                </motion.h2>
                {/* 具体奖品 */}
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.32 }}
                  className="text-base text-gray-700 font-bold mb-2"
                >
                  {wonItem.item.title}
                </motion.p>
                {/* 搞怪副标题 */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="text-xs text-gray-500 font-bold mt-2 mb-5"
                >
                  {wonQuip}
                </motion.p>
                {/* 连续谢谢参与彩蛋 */}
                {isFiller && fillerStreak >= 2 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.6 }}
                    className="mb-4 bg-gray-900 text-white px-4 py-2 rounded-xl text-[11px] font-black"
                  >
                    {fillerStreak >= 3
                      ? '🏆 非洲人认证：连续 ' + fillerStreak + ' 次谢谢参与！'
                      : '🌍 非洲预警：已连续 ' + fillerStreak + ' 次谢谢参与…'}
                  </motion.div>
                )}

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-3.5 rounded-xl text-sm font-black tracking-wider shadow-lg hover:shadow-xl active:scale-[0.97] transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #c41e3a 0%, #a0162a 100%)',
                    color: GOLD,
                    boxShadow: '0 4px 15px rgba(196,30,58,0.4)',
                  }}
                >
                  <span className="flex items-center justify-center gap-2">
                    {wonIndices.size >= n || spinsUsed >= maxSpins
                      ? <><Trophy className="w-4 h-4" /> 抽奖结束！</>
                      : <><ChevronRight className="w-4 h-4" /> 继续抽奖（剩 {maxSpins - spinsUsed} 次）</>
                    }
                  </span>
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* 全部完成 */}
      <AnimatePresence>
        {(allDone || spinsExhausted) && !showModal && !spinning && (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="mt-4 max-w-[380px] w-full z-10"
          >
            <div className="velvet-red border-2 border-[#d4af37] rounded-2xl px-5 py-3.5 shadow-xl relative overflow-hidden shine-sweep">
              <div className="absolute inset-0 bg-noise opacity-20" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 bg-[#d4af37] rounded-full flex items-center justify-center shrink-0 shadow-md">
                  <Trophy className="w-5 h-5 text-[#c41e3a]" />
                </div>
                <div className="flex-1">
                  <p className="gold-text font-black text-sm tracking-wider leading-tight">
                    {wonIndices.size >= n ? '所有奖品已揭晓！' : `${maxSpins} 次机会已用完！`}
                  </p>
                  <p className="text-[#d4af37]/70 text-[10px] font-bold mt-0.5 tracking-widest">
                    {wonIndices.size >= n ? 'ALL REVEALED' : `已获得 ${wonIndices.size} 个奖品`}
                  </p>
                </div>
                <Sparkles className="w-5 h-5 text-[#d4af37] animate-pulse" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 搞怪弹幕 */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.7 }}
              animate={{ opacity: 1, y: -80, scale: 1 }}
              exit={{ opacity: 0, y: -160, scale: 0.5 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              className="absolute bottom-[45%]"
              style={{ left: `${t.x}%`, transform: 'translateX(-50%)' }}
            >
              <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-black whitespace-nowrap shadow-xl border border-white/10">
                {t.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ===================== 作弊弹窗 ===================== */}
      <AnimatePresence>
        {cheatPhase === 'hacking' && (
          <motion.div
            key="cheat-hacking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-[320px] w-full text-center border border-green-500/50 shadow-[0_0_30px_rgba(0,255,0,0.2)]"
            >
              <div className="font-mono text-green-400 text-sm mb-4 animate-pulse">
                {'>'} {cheatMsg}_
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-500 to-green-300"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 4, ease: 'linear' }}
                />
              </div>
              <p className="text-gray-500 text-[10px] mt-3 font-mono">SYSTEM BREACH IN PROGRESS...</p>
            </motion.div>
          </motion.div>
        )}
        {cheatPhase === 'failed' && (
          <motion.div
            key="cheat-failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80"
            onClick={() => setCheatPhase('idle')}
          >
            <motion.div
              initial={{ scale: 0.3, rotateZ: 10 }}
              animate={{ scale: 1, rotateZ: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-7 max-w-[320px] w-full text-center shadow-2xl border-2 border-red-400"
            >
              <div className="text-5xl mb-4">🚨</div>
              <h2 className="text-xl font-black text-gray-900 mb-2">作弊失败！</h2>
              <p className="text-sm text-gray-600 font-bold mb-1">系统检测到异常操作</p>
              <p className="text-xs text-gray-400 mb-5">
                处罚：请立即亲男朋友一口 💋
              </p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
                <p className="text-[11px] text-red-600 font-bold">
                  ⚠️ 本转盘采用量子加密技术<br />
                  作弊概率：0.000000%
                </p>
              </div>
              <button
                onClick={() => setCheatPhase('idle')}
                className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-black active:scale-95 transition"
              >
                我认罚 😘
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================== 规则弹窗 ===================== */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            key="rules-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRules(false)}
          >
            <motion.div
              initial={{ scale: 0.3, y: 60 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-b from-white via-white to-[#fffdf7] rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.3)] max-w-[380px] w-full relative overflow-hidden border-2 border-[#d4af37]/30"
            >
              <div className="absolute inset-0 bg-noise pointer-events-none" />
              <div className="absolute inset-0 bg-paper opacity-[0.04] pointer-events-none" />
              {/* 装饰角花 */}
              <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#d4af37]/50 rounded-tl-lg" />
              <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#d4af37]/50 rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#d4af37]/50 rounded-bl-lg" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#d4af37]/50 rounded-br-lg" />

              {/* 关闭 */}
              <button
                onClick={() => setShowRules(false)}
                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 transition z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-2 mb-5 relative z-10">
                <div className="w-10 h-10 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center border border-red-200/50 shadow-sm">
                  <Heart className="w-5 h-5 text-red-500 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-black text-[#003366]">
                    <Star className="w-3.5 h-3.5 fill-current text-[#d4af37]" />
                    公益体彩 乐善人生
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Lucky Wheel · Official Rules</span>
                </div>
              </div>

              {/* 使用须知 */}
              <div className="space-y-4 relative z-10">
                <section>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-1 h-4 bg-gradient-to-b from-[#c41e3a] to-[#003366] rounded-full" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">使用须知</h3>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-gray-200 to-transparent" />
                  </div>
                  <ul className="text-[10px] space-y-1.5 text-gray-600 font-medium leading-relaxed list-disc list-inside px-1 marker:text-[#c41e3a]">
                    <li>本券仅限一周年纪念使用，最终解释权归男朋友所有。</li>
                    <li>点击 GO 按钮旋转转盘，每次随机揭示一个奖品。</li>
                    <li>奖品包含实物与搞怪券，请理性对待，不得拒收。</li>
                    <li>如抽到"谢谢参与"，请给男朋友一个拥抱作为安慰。</li>
                  </ul>
                </section>

                {/* 奖等对照 */}
                <section>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-1 h-4 bg-gradient-to-b from-[#c41e3a] to-[#003366] rounded-full" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">奖等对照</h3>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-gray-200 to-transparent" />
                  </div>
                  <div className="border border-[#d4af37]/30 rounded-xl overflow-hidden shadow-sm bg-white/60 backdrop-blur-sm">
                    <table className="w-full text-[10px]">
                      <thead className="bg-gradient-to-r from-[#fff9e6] to-[#fff3c4] border-b border-[#d4af37]/30">
                        <tr>
                          <th className="py-2 px-3 text-left font-bold text-gray-500 w-20">奖级</th>
                          <th className="py-2 px-3 text-right font-bold text-gray-500">对应奖品</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {groupByTier(items).map(group => {
                          const isFillerGroup = group.tier === '谢谢参与';
                          const isTopTier = group.tier === '特等奖';
                          return (
                            <tr key={group.tier} className="hover:bg-red-50/30 transition-colors">
                              <td className="py-2 px-3 font-bold align-top">
                                <span className="inline-flex items-center gap-1">
                                  {isTopTier ? <Trophy className="w-3 h-3 text-[#d4af37]" /> : isFillerGroup ? null : <Sparkles className="w-3 h-3 text-[#d4af37]" />}
                                  {group.tier}
                                </span>
                              </td>
                              <td className={`py-2 px-3 text-right font-black ${isFillerGroup ? 'text-gray-400' : 'text-[#c41e3a]'}`}>
                                {Array.from(new Set(group.items.map(i => i.title))).join(' / ')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 浪漫寄语 */}
                <section>
                  <div className="bg-gradient-to-br from-red-50/70 to-pink-50/70 border border-red-100/60 rounded-xl p-3.5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-20">
                      <Heart className="w-7 h-7 text-red-400 fill-current" />
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-600 font-medium italic relative z-10">
                      "每一次旋转，都是命运的小惊喜——<br />
                      就像遇见你，是我最大的幸运。"
                    </p>
                    <p className="text-right text-[9px] text-gray-400 mt-2 tracking-widest">— FOR YOU, WITH LOVE</p>
                  </div>
                </section>
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={() => setShowRules(false)}
                className="mt-5 w-full py-3 rounded-xl text-sm font-black tracking-wider shadow-lg hover:shadow-xl active:scale-[0.97] transition-all relative z-10"
                style={{
                  background: 'linear-gradient(135deg, #c41e3a 0%, #a0162a 100%)',
                  color: GOLD,
                  boxShadow: '0 4px 15px rgba(196,30,58,0.4)',
                }}
              >
                知道啦
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 灯泡闪烁动画 */}
      <style>{`
        @keyframes bulb-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
