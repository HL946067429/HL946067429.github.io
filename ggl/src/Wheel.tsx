import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, Gift, Star, RotateCw, Trophy, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ICON_MAP } from './icons';
import { useItems } from './useItems';
import type { RawItem } from './types';

/* ------------------------------------------------------------------ */
/*  大转盘页面                                                         */
/* ------------------------------------------------------------------ */

// 扇形配色（循环使用）
const SLICE_COLORS = [
  '#c41e3a', '#003366', '#a0162a', '#002244',
  '#b8192e', '#001d3d', '#d42a4c', '#002855',
];
const SLICE_GOLD = '#d4af37';

export default function Wheel() {
  const { config } = useItems();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const [spinning, setSpinning] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [wonIndices, setWonIndices] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [wonItem, setWonItem] = useState<{ item: RawItem; index: number } | null>(null);
  const [allDone, setAllDone] = useState(false);

  const items = config?.items ?? [];
  const n = items.length;
  const sliceAngle = n > 0 ? 360 / n : 0;

  /* -------- 绘制转盘 -------- */
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || n === 0) return;
    const size = canvas.width;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 6;
    const slice = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, size, size);

    // 外圈阴影
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < n; i++) {
      const start = i * slice - Math.PI / 2; // 12 点钟起
      const end = start + slice;
      const revealed = wonIndices.has(i);

      // 扇形
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();

      if (revealed) {
        ctx.fillStyle = '#e5e5e5';
      } else {
        ctx.fillStyle = SLICE_COLORS[i % SLICE_COLORS.length];
      }
      ctx.fill();

      // 金色描边
      ctx.strokeStyle = SLICE_GOLD;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 文字（沿径向）
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + slice / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (revealed) {
        // 已揭示：显示简短标题
        ctx.fillStyle = '#aaa';
        ctx.font = `bold ${Math.min(14, Math.max(9, 200 / n))}px "Inter", sans-serif`;
        const label = items[i].title.length > 5 ? items[i].title.slice(0, 5) + '…' : items[i].title;
        ctx.fillText(label, r * 0.58, 0);
        // 小勾
        ctx.fillStyle = '#999';
        ctx.font = '10px sans-serif';
        ctx.fillText('✓', r * 0.82, 0);
      } else {
        // 未揭示：问号 + 序号
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold ${Math.min(18, Math.max(11, 260 / n))}px "Inter", sans-serif`;
        ctx.fillText('?', r * 0.55, 0);
        ctx.fillStyle = 'rgba(212,175,55,0.7)';
        ctx.font = `bold ${Math.max(8, 140 / n)}px "JetBrains Mono", monospace`;
        ctx.fillText(`${i + 1}`, r * 0.82, 0);
      }
      ctx.restore();
    }

    // 中心装饰圈
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 36);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#f0f0f0');
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = SLICE_GOLD;
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [n, items, wonIndices]);

  useEffect(() => { drawWheel(); }, [drawWheel]);

  /* -------- 抽奖逻辑 -------- */
  const spin = () => {
    if (spinning || n === 0) return;
    // 可用奖池
    const available = items.map((_, i) => i).filter(i => !wonIndices.has(i));
    if (available.length === 0) { setAllDone(true); return; }

    setSpinning(true);
    setShowModal(false);

    // 随机选中
    const targetIdx = available[Math.floor(Math.random() * available.length)];

    // 目标角度：让指针（12 点钟）指向 targetIdx 扇形中心
    // 扇形中心角（从 12 点钟顺时针）= targetIdx * sliceAngle + sliceAngle / 2
    // 转盘需要旋转的角度 = 360 - (targetIdx * sliceAngle + sliceAngle / 2)  让那个扇形到顶
    const targetSliceCenter = targetIdx * sliceAngle + sliceAngle / 2;
    const baseAngle = 360 - targetSliceCenter;
    const extraSpins = (4 + Math.floor(Math.random() * 3)) * 360; // 4-6 圈
    const finalAngle = currentAngle + extraSpins + ((baseAngle - (currentAngle % 360)) + 360) % 360;

    setCurrentAngle(finalAngle);

    // 动画结束后揭晓
    setTimeout(() => {
      setWonItem({ item: items[targetIdx], index: targetIdx });
      setWonIndices(prev => new Set(prev).add(targetIdx));
      setShowModal(true);
      setSpinning(false);

      // 撒花
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ['#c41e3a', '#d4af37', '#003366'] });

      // 全部抽完？
      if (wonIndices.size + 1 >= n) {
        setTimeout(() => setAllDone(true), 1500);
      }
    }, 4500); // 匹配 CSS transition 时长
  };

  const resetAll = () => {
    setWonIndices(new Set());
    setCurrentAngle(0);
    setShowModal(false);
    setWonItem(null);
    setAllDone(false);
  };

  /* -------- Loading -------- */
  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        <Sparkles className="w-5 h-5 mr-2 text-[#d4af37] animate-pulse" />
        正在准备惊喜…
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden relative select-none">
      {/* 背景 */}
      <div className="absolute inset-0 bg-noise pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.15, 0], y: [0, -180, 0] }}
            transition={{ duration: 8 + Math.random() * 6, repeat: Infinity, delay: i * 1.5 }}
            className="absolute"
            style={{ left: Math.random() * 100 + '%', top: Math.random() * 100 + '%' }}
          >
            {i % 2 === 0
              ? <Sparkles className="text-[#d4af37]" size={12 + Math.random() * 10} />
              : <Heart className="text-red-400 fill-current" size={12 + Math.random() * 10} />
            }
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center z-10">
        <h1 className="gold-shimmer text-3xl sm:text-4xl font-black font-serif tracking-[0.15em] leading-none">幸运大转盘</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#d4af37]" />
          <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.3em]">LUCKY WHEEL</span>
          <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#d4af37]" />
        </div>
        <p className="text-gray-500 text-xs mt-2 font-medium">
          已揭晓 <span className="font-black text-[#c41e3a]">{wonIndices.size}</span> / {n}
        </p>
      </motion.div>

      {/* 转盘区域 */}
      <div className="relative z-10">
        {/* 指针（三角形 + 圆点，固定在 12 点钟） */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-30 flex flex-col items-center">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[22px] border-t-[#d4af37] drop-shadow-lg" />
        </div>

        {/* 外圈装饰 */}
        <div className="w-[330px] h-[330px] sm:w-[380px] sm:h-[380px] rounded-full bg-gradient-to-br from-[#d4af37] via-[#f5d76e] to-[#aa771c] p-[6px] shadow-[0_10px_40px_rgba(0,0,0,0.3)] relative">
          {/* 灯泡装饰点 */}
          <div className="absolute inset-0 rounded-full">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: i % 2 === 0 ? '#fff' : '#c41e3a',
                  boxShadow: i % 2 === 0 ? '0 0 4px rgba(255,255,255,0.8)' : '0 0 4px rgba(196,30,58,0.8)',
                  top: `${50 - 48 * Math.cos((i / 24) * Math.PI * 2)}%`,
                  left: `${50 + 48 * Math.sin((i / 24) * Math.PI * 2)}%`,
                  transform: 'translate(-50%, -50%)',
                  animation: `pulse-red ${1.5 + (i % 3) * 0.5}s ease-in-out infinite ${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* 旋转容器 */}
          <div
            ref={wheelRef}
            className="w-full h-full rounded-full overflow-hidden"
            style={{
              transform: `rotate(${currentAngle}deg)`,
              transition: spinning ? 'transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            <canvas
              ref={canvasRef}
              width={380}
              height={380}
              className="w-full h-full"
            />
          </div>

          {/* 中心按钮 */}
          <button
            onClick={spin}
            disabled={spinning || allDone}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-gradient-to-br from-[#c41e3a] to-[#8b0f24] text-[#d4af37] font-black text-base shadow-[0_4px_15px_rgba(196,30,58,0.5)] border-[3px] border-[#d4af37] hover:scale-110 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {spinning ? (
              <RotateCw className="w-6 h-6 animate-spin" />
            ) : allDone ? (
              <Trophy className="w-6 h-6" />
            ) : (
              <span className="text-lg leading-none">GO</span>
            )}
          </button>
        </div>
      </div>

      {/* 已中奖列表 */}
      {wonIndices.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 w-full max-w-[380px] z-10"
        >
          <h3 className="text-xs font-black text-gray-700 mb-2 flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 text-[#c41e3a]" />
            已获得的奖品
          </h3>
          <div className="flex flex-wrap gap-2">
            {[...wonIndices].sort((a, b) => a - b).map(idx => {
              const item = items[idx];
              const IconComp = ICON_MAP[item.icon] ?? Star;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border ${
                    item.type === 'real'
                      ? 'bg-gradient-to-r from-[#fff9e6] to-[#fff3c4] border-[#d4af37]/50 text-[#c41e3a]'
                      : item.type === 'filler'
                      ? 'bg-gray-100 border-gray-200 text-gray-500'
                      : 'bg-white border-pink-200 text-gray-700'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${item.iconColor}`} />
                  {item.title}
                  <span className="font-mono text-[10px] opacity-60">{item.value}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* 底部操作 */}
      <div className="mt-5 flex items-center gap-3 z-10">
        <a
          href={import.meta.env.BASE_URL}
          className="px-4 py-2 rounded-full bg-white/80 backdrop-blur text-xs font-bold text-gray-600 shadow-sm border border-gray-200 hover:border-[#d4af37] transition"
        >
          ← 刮刮乐
        </a>
        {wonIndices.size > 0 && (
          <button
            onClick={resetAll}
            className="px-4 py-2 rounded-full bg-white/80 backdrop-blur text-xs font-bold text-gray-600 shadow-sm border border-gray-200 hover:border-[#c41e3a] transition"
          >
            重新开始
          </button>
        )}
      </div>

      {/* 奖品弹窗 */}
      <AnimatePresence>
        {showModal && wonItem && (() => {
          const IconComp = ICON_MAP[wonItem.item.icon] ?? Star;
          return (
            <motion.div
              key="prize-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.5, y: 40 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 30, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-[#d4af37]/50 max-w-sm w-full text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-noise pointer-events-none" />

                {/* 关闭 */}
                <button
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 transition z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* 大图标 */}
                <motion.div
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center shadow-lg mb-4 ${
                    wonItem.item.type === 'real'
                      ? 'bg-gradient-to-br from-[#fff9e6] to-[#fff3c4] border-2 border-[#d4af37]'
                      : wonItem.item.type === 'filler'
                      ? 'bg-gray-100 border-2 border-gray-200'
                      : 'bg-gradient-to-br from-pink-50 to-white border-2 border-pink-200'
                  }`}
                >
                  <IconComp className={`w-10 h-10 ${wonItem.item.iconColor}`} />
                </motion.div>

                <h2 className="text-2xl font-black text-gray-900 mb-1 relative z-10">{wonItem.item.title}</h2>
                <p className={`text-xl font-black font-mono mb-4 ${
                  wonItem.item.type === 'real' ? 'text-[#c41e3a]' : wonItem.item.type === 'filler' ? 'text-gray-400' : 'text-[#c41e3a]/70'
                }`}>
                  {wonItem.item.value}
                </p>

                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 mb-5">
                  <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                  {wonItem.item.type === 'real' ? '恭喜获得实物奖品！' : wonItem.item.type === 'filler' ? '下次好运！' : '甜蜜惊喜！'}
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c41e3a] to-[#a0162a] text-[#d4af37] font-black tracking-wider shadow-lg hover:shadow-xl active:scale-95 transition text-sm"
                >
                  {wonIndices.size >= n ? '全部揭晓！' : '继续抽奖'}
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* 全部完成庆祝 */}
      <AnimatePresence>
        {allDone && !showModal && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 z-10"
          >
            <div className="velvet-red border-2 border-[#d4af37] rounded-2xl px-5 py-3 shadow-xl relative overflow-hidden shine-sweep">
              <div className="absolute inset-0 bg-noise opacity-20" />
              <div className="flex items-center gap-3 relative z-10">
                <Trophy className="w-6 h-6 text-[#d4af37]" />
                <div>
                  <p className="gold-text font-black text-sm tracking-wider">所有奖品已揭晓！</p>
                  <p className="text-[#d4af37]/70 text-[10px] font-bold mt-0.5">HAPPY ANNIVERSARY</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
