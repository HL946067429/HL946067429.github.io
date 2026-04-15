import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, Gift, Star, RotateCw, Trophy, X, ChevronRight, Flower, Info } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ICON_MAP } from './icons';
import { useItems } from './useItems';
import type { RawItem } from './types';

/* ------------------------------------------------------------------ */
/*  幸运大转盘                                                         */
/* ------------------------------------------------------------------ */

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
  const [wonIndices, setWonIndices] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [wonItem, setWonItem] = useState<{ item: RawItem; index: number } | null>(null);
  const [allDone, setAllDone] = useState(false);

  const items = config?.items ?? [];
  const n = items.length;
  const sliceAngle = n > 0 ? 360 / n : 0;

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
        // 已揭示：标题 + ✓
        ctx.fillStyle = '#aaa';
        ctx.font = `bold ${Math.min(13, Math.max(9, 200 / n))}px "Noto Serif SC", "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = items[i].title.length > 5 ? items[i].title.slice(0, 5) + '…' : items[i].title;
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
    if (spinning || n === 0) return;
    const available = items.map((_, i) => i).filter(i => !wonIndices.has(i));
    if (available.length === 0) { setAllDone(true); return; }

    setSpinning(true);
    setShowModal(false);

    const targetIdx = available[Math.floor(Math.random() * available.length)];
    const targetSliceCenter = targetIdx * sliceAngle + sliceAngle / 2;
    const baseAngle = 360 - targetSliceCenter;
    const extraSpins = (4 + Math.floor(Math.random() * 3)) * 360;
    const finalAngle = currentAngle + extraSpins + ((baseAngle - (currentAngle % 360)) + 360) % 360;

    setCurrentAngle(finalAngle);

    setTimeout(() => {
      setWonItem({ item: items[targetIdx], index: targetIdx });
      setWonIndices(prev => new Set(prev).add(targetIdx));
      setShowModal(true);
      setSpinning(false);

      const fire = (delay: number, opts: confetti.Options) => setTimeout(() => confetti(opts), delay);
      fire(0, { particleCount: 100, spread: 65, origin: { y: 0.5 }, colors: ['#c41e3a', '#d4af37', '#003366', '#f5d76e'] });
      fire(200, { particleCount: 50, angle: 60, spread: 50, origin: { x: 0, y: 0.6 }, colors: ['#c41e3a', '#d4af37'] });
      fire(400, { particleCount: 50, angle: 120, spread: 50, origin: { x: 1, y: 0.6 }, colors: ['#c41e3a', '#d4af37'] });

      if (wonIndices.size + 1 >= n) {
        setTimeout(() => setAllDone(true), 1500);
      }
    }, 4500);
  };

  const resetAll = () => {
    setWonIndices(new Set());
    setCurrentAngle(0);
    setShowModal(false);
    setWonItem(null);
    setAllDone(false);
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
            <span className="text-gray-500 text-xs font-bold">已揭晓</span>
            <span className="font-black text-[#c41e3a] text-sm">{wonIndices.size}</span>
            <span className="text-gray-400 text-xs">/</span>
            <span className="font-black text-gray-700 text-sm">{n}</span>
          </div>
          <button
            onClick={() => setShowRules(true)}
            className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-[#d4af37]/30 shadow-sm text-gray-600 text-xs font-bold hover:border-[#d4af37] hover:shadow-md transition-all"
          >
            <Info className="w-3.5 h-3.5 text-[#d4af37]" />
            规则
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
            onClick={spin}
            disabled={spinning || allDone}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all disabled:cursor-not-allowed"
            style={{
              background: spinning || allDone
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
            ) : allDone ? (
              <Trophy className="w-7 h-7 text-[#d4af37]" />
            ) : (
              <div className="flex flex-col items-center leading-none">
                <span className="text-[22px] font-black text-[#d4af37] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">GO</span>
                <span className="text-[8px] font-bold text-[#d4af37]/60 tracking-widest mt-0.5">SPIN</span>
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
                      {item.title}
                      <span className="font-mono text-[10px] opacity-50">{item.value}</span>
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
      </motion.div>

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

                <motion.h2
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="text-[22px] font-black text-gray-900 mb-1"
                >
                  {wonItem.item.title}
                </motion.h2>
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={`text-2xl font-black font-mono mb-5 ${
                    isReal ? 'text-[#c41e3a]' : isFiller ? 'text-gray-400' : 'text-[#c41e3a]/70'
                  }`}
                >
                  {wonItem.item.value}
                </motion.p>

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
                    {wonIndices.size >= n
                      ? <><Trophy className="w-4 h-4" /> 全部揭晓！</>
                      : <><ChevronRight className="w-4 h-4" /> 继续抽奖</>
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
        {allDone && !showModal && (
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
                  <p className="gold-text font-black text-sm tracking-wider leading-tight">所有奖品已揭晓！</p>
                  <p className="text-[#d4af37]/70 text-[10px] font-bold mt-0.5 tracking-widest">HAPPY ANNIVERSARY · ALL REVEALED</p>
                </div>
                <Sparkles className="w-5 h-5 text-[#d4af37] animate-pulse" />
              </div>
            </div>
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
                          <th className="py-2 px-3 text-left font-bold text-gray-500">奖级</th>
                          <th className="py-2 px-3 text-right font-bold text-gray-500">对应奖品</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-red-50/30 transition-colors">
                          <td className="py-2 px-3 font-bold">
                            <span className="inline-flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-[#d4af37]" />特等奖
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-black text-[#c41e3a]">三套定制键帽</td>
                        </tr>
                        <tr className="hover:bg-red-50/30 transition-colors">
                          <td className="py-2 px-3 font-bold">
                            <span className="inline-flex items-center gap-1">
                              <Flower className="w-3 h-3 text-pink-500" />一等奖
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-black text-[#c41e3a]">一束浪漫鲜花</td>
                        </tr>
                        <tr className="hover:bg-red-50/30 transition-colors">
                          <td className="py-2 px-3 font-bold">
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-[#003366]" />幸运奖
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-gray-600">趣味券 / 奶茶 / 电影</td>
                        </tr>
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
