import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, Trophy, Star, Ghost, Coffee, Utensils, Zap, Smile, Coins, Gift, Flower, Keyboard, ShoppingCart, Ticket, Moon, Sun, Cloud, Music, Camera, RefreshCw, Hand } from 'lucide-react';
import { ScratchCard } from './components/ScratchCard';
import confetti from 'canvas-confetti';

// 20 items to match the image grid (4x5)
const ALL_ITEMS = [
  { id: 1, title: '三套定制键帽', icon: <Keyboard className="w-5 h-5 text-blue-600" />, value: '¥888', type: 'real' },
  { id: 2, title: '洗碗券一次', icon: <Utensils className="w-5 h-5 text-green-600" />, value: '¥10', type: 'funny' },
  { id: 3, title: '一束浪漫鲜花', icon: <Flower className="w-5 h-5 text-pink-600" />, value: '¥520', type: 'real' },
  { id: 4, title: '不准生气券', icon: <Ghost className="w-5 h-5 text-purple-600" />, value: '¥99', type: 'funny' },
  { id: 5, title: '一份真刮刮乐', icon: <Trophy className="w-5 h-5 text-yellow-600" />, value: '¥100', type: 'real' },
  { id: 6, title: '亲亲一个', icon: <Smile className="w-5 h-5 text-red-500" />, value: '¥1314', type: 'funny' },
  { id: 7, title: '再来一瓶空气', icon: <Zap className="w-5 h-5 text-cyan-500" />, value: '¥0', type: 'funny' },
  { id: 8, title: '陪逛街不喊累', icon: <Star className="w-5 h-5 text-orange-500" />, value: '¥200', type: 'funny' },
  { id: 9, title: '清空购物车', icon: <ShoppingCart className="w-5 h-5 text-amber-700" />, value: '¥100', type: 'funny' },
  { id: 10, title: '捏脚10分钟', icon: <Coins className="w-5 h-5 text-yellow-700" />, value: '¥50', type: 'funny' },
  { id: 11, title: '奶茶一杯', icon: <Coffee className="w-5 h-5 text-amber-800" />, value: '¥25', type: 'real' },
  { id: 12, title: '电影票两张', icon: <Ticket className="w-5 h-5 text-red-600" />, value: '¥120', type: 'real' },
  { id: 13, title: '承包一周早餐', icon: <Sun className="w-5 h-5 text-orange-400" />, value: '¥150', type: 'funny' },
  { id: 14, title: '最美称号', icon: <Heart className="w-5 h-5 text-pink-400" />, value: '¥∞', type: 'funny' },
  { id: 15, title: '听我唠叨一次', icon: <Music className="w-5 h-5 text-indigo-500" />, value: '¥200', type: 'funny' },
  { id: 16, title: '美美合照一张', icon: <Camera className="w-5 h-5 text-teal-500" />, value: '¥88', type: 'real' },
  { id: 17, title: '睡前故事一则', icon: <Moon className="w-5 h-5 text-violet-500" />, value: '¥30', type: 'funny' },
  { id: 18, title: '承包家务一天', icon: <Cloud className="w-5 h-5 text-sky-500" />, value: '¥200', type: 'funny' },
  { id: 19, title: '谢谢参与', icon: <Gift className="w-5 h-5 text-gray-400" />, value: '¥0', type: 'filler' },
  { id: 20, title: '谢谢参与', icon: <Star className="w-5 h-5 text-gray-400" />, value: '¥0', type: 'filler' },
];

export default function App() {
  const [isComplete, setIsComplete] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [revealedItems, setRevealedItems] = useState<Set<number>>(new Set());

  const handleComplete = useCallback(() => {
    setIsComplete(true);
    const fire = (delay: number, opts: confetti.Options) => {
      setTimeout(() => confetti(opts), delay);
    };
    fire(0, {
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#c41e3a', '#d4af37', '#003366', '#ffffff', '#f5d76e']
    });
    fire(250, {
      particleCount: 60,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#c41e3a', '#d4af37']
    });
    fire(450, {
      particleCount: 60,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#c41e3a', '#d4af37']
    });
  }, []);

  const handleZoneReveal = useCallback((index: number) => {
    setRevealedItems(prev => new Set(prev).add(index));
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-red-100 flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden relative">
      <div className="absolute inset-0 bg-noise pointer-events-none" />

      {/* 印章装饰（角落） */}
      <div className="hidden sm:block absolute top-8 right-8 w-20 h-20 pointer-events-none opacity-40 spin-slow">
        <div className="w-full h-full rounded-full border-[3px] border-[#c41e3a] flex items-center justify-center">
          <span className="text-[#c41e3a] font-serif text-[10px] font-black tracking-widest">ANNIVERSARY · 2024</span>
        </div>
      </div>

      {/* Header Controls */}
      <div className="w-full max-w-[400px] flex justify-between items-center mb-6 z-50">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center border border-[#d4af37]/40 relative">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#d4af37] rounded-full animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-800 leading-none tracking-wide">ANNIVERSARY</h2>
            <span className="text-[10px] text-gray-500 font-bold tracking-[0.2em]">ONE YEAR · TOGETHER</span>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex items-center gap-2 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg border border-[#d4af37]/40 text-gray-700 font-bold text-xs transition-all hover:shadow-xl hover:border-[#d4af37]"
        >
          <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-700 ${isFlipped ? 'rotate-180' : ''}`} />
          {isFlipped ? '正面' : '规则'}
        </motion.button>
      </div>

      {/* Main Card Container */}
      <div className="relative w-full max-w-[380px] aspect-[2/3.3] perspective-1000">
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.8, type: 'spring', stiffness: 100, damping: 20 }}
          className="w-full h-full relative preserve-3d"
          style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d' as any }}
        >
          {/* FRONT SIDE */}
          <div
            className="absolute inset-0 backface-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
              WebkitTransform: 'rotateY(0deg)',
            }}
          >
            <div className="velvet-navy rounded-[20px] p-1.5 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.5),0_10px_30px_-5px_rgba(196,30,58,0.3)] relative overflow-hidden h-full flex flex-col gold-border">
              {/* Decorative Background Pattern */}
              <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:18px_18px]" />
              </div>
              <div className="absolute inset-0 bg-paper opacity-[0.06] pointer-events-none mix-blend-overlay" />

              <div className="rounded-xl p-3 flex flex-col items-center h-full relative z-10">
                {/* Top Title */}
                <div className="w-full text-center mb-4 relative shine-sweep">
                  <h1 className="gold-shimmer text-[44px] font-black tracking-[0.2em] font-serif leading-none">喜相逢</h1>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="h-[1px] w-10 bg-gradient-to-r from-transparent via-[#d4af37] to-[#d4af37]" />
                    <Sparkles className="w-3 h-3 text-[#d4af37]" />
                    <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.3em]">ONE YEAR ANNIVERSARY</span>
                    <Sparkles className="w-3 h-3 text-[#d4af37]" />
                    <div className="h-[1px] w-10 bg-gradient-to-l from-transparent via-[#d4af37] to-[#d4af37]" />
                  </div>
                </div>

                {/* Main Visual Area */}
                <div className="relative w-full flex justify-center mb-6">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.3 }}
                    className="w-36 h-36 velvet-red border-[4px] border-[#d4af37] rounded-full flex items-center justify-center relative pulse-red float-breathe"
                  >
                    {/* 外圈装饰环 */}
                    <div className="absolute -inset-2 rounded-full border border-[#d4af37]/40" />
                    <div className="absolute inset-2 border border-[#d4af37]/40 rounded-full" />
                    <div className="absolute inset-4 border border-dashed border-[#d4af37]/30 rounded-full" />

                    <div className="flex flex-col items-center justify-center leading-none text-[#d4af37] z-10">
                      <span className="text-5xl font-black tracking-tighter mb-1 font-serif drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">喜</span>
                      <div className="flex gap-4 items-center">
                        <span className="text-xl font-bold opacity-70">相</span>
                        <span className="text-xl font-bold opacity-70">逢</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Side Banners */}
                  <motion.div
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 velvet-red text-[#d4af37] w-7 py-4 rounded-r-lg border-y border-r-2 border-[#d4af37] shadow-[2px_2px_8px_rgba(0,0,0,0.3)] flex flex-col items-center gap-1"
                  >
                    <span className="text-[11px] font-black">鹏</span>
                    <span className="text-[11px] font-black">程</span>
                    <span className="text-[11px] font-black">万</span>
                    <span className="text-[11px] font-black">里</span>
                  </motion.div>
                  <motion.div
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 velvet-red text-[#d4af37] w-7 py-4 rounded-l-lg border-y border-l-2 border-[#d4af37] shadow-[-2px_2px_8px_rgba(0,0,0,0.3)] flex flex-col items-center gap-1"
                  >
                    <span className="text-[11px] font-black">鸿</span>
                    <span className="text-[11px] font-black">运</span>
                    <span className="text-[11px] font-black">千</span>
                    <span className="text-[11px] font-black">秋</span>
                  </motion.div>
                </div>

                {/* Status Bar */}
                <div className="w-full velvet-red py-2 mb-4 border-y-[2px] border-[#d4af37] text-center relative overflow-hidden shine-sweep">
                  <div className="absolute inset-0 bg-noise opacity-20" />
                  <p className="text-[#d4af37] font-black text-xl tracking-[0.8em] relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">财运亨通</p>
                </div>

                {/* Scratch Area */}
                <div className="w-full h-[360px] velvet-red p-2 rounded-2xl border-[3px] border-[#d4af37] shadow-[inset_0_2px_8px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.2)] mb-4 overflow-hidden relative">
                  {/* 角花装饰 */}
                  <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-[#d4af37]/60 rounded-tl" />
                  <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-[#d4af37]/60 rounded-tr" />
                  <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-[#d4af37]/60 rounded-bl" />
                  <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-[#d4af37]/60 rounded-br" />

                  <ScratchCard
                    threshold={30}
                    brushSize={20}
                    onComplete={handleComplete}
                    onZoneReveal={handleZoneReveal}
                    rows={5}
                    cols={4}
                  >
                    <div className="grid grid-cols-4 gap-2 w-full h-full p-2 bg-gradient-to-br from-white via-[#fffdf7] to-[#fff7e6] rounded-xl shadow-inner overflow-hidden">
                      {ALL_ITEMS.map((item, index) => (
                        <div
                          key={item.id}
                          className={`relative flex flex-col items-center justify-between p-1.5 rounded-lg border overflow-hidden h-full transition-colors ${
                            revealedItems.has(index)
                              ? item.type === 'real'
                                ? 'border-[#d4af37]/60 bg-gradient-to-br from-[#fff9e6] to-[#fff3c4] shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                                : item.type === 'filler'
                                ? 'border-gray-200 bg-gray-50'
                                : 'border-pink-200/60 bg-gradient-to-br from-pink-50 to-white'
                              : 'border-gray-50 bg-[#fafafa] shadow-sm'
                          }`}
                        >
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={revealedItems.has(index) ? {
                              scale: [0, 1.3, 1],
                              opacity: 1,
                              rotate: [0, 10, -10, 0]
                            } : { scale: 0, opacity: 0 }}
                            transition={{
                              type: 'spring',
                              stiffness: 400,
                              damping: 12,
                            }}
                            className="flex-1 flex flex-col items-center justify-between w-full h-full"
                          >
                            <div className="flex-1 flex items-center justify-center">
                              {item.icon}
                            </div>
                            <div className="w-full text-center mt-auto">
                              <span className="text-[6px] font-bold text-gray-500 block leading-none mb-1 uppercase tracking-tighter">
                                {item.title}
                              </span>
                              <span className={`text-[11px] font-black font-mono leading-none block ${
                                item.type === 'real' ? 'text-[#c41e3a]' : item.type === 'filler' ? 'text-gray-400' : 'text-[#c41e3a]/70'
                              }`}>
                                {item.value}
                              </span>
                            </div>
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  </ScratchCard>
                </div>

                {/* Bottom Info */}
                <div className="w-full flex justify-between items-end px-1">
                  <div className="flex flex-col gap-1">
                    <div className="gold-gradient text-[#003366] px-3 py-1 rounded-full text-[9px] font-black shadow-md border border-[#aa771c]/30">
                      保安区刮开无效
                    </div>
                    <span className="text-[#d4af37]/50 font-mono text-[7px] tracking-widest">NO. 20240520-001</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="bg-white p-1 rounded-md shadow-md">
                      <div className="w-24 h-6 bg-[repeating-linear-gradient(90deg,black,black_1px,white_1px,white_3px)]" />
                    </div>
                    <span className="gold-text font-black text-[11px] italic tracking-wider">金玉满堂</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BACK SIDE */}
          <div
            className="absolute inset-0 backface-hidden rotate-y-180"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              WebkitTransform: 'rotateY(180deg)',
            }}
          >
            <div className="bg-gradient-to-br from-white via-[#fffdf7] to-[#fff8e6] rounded-[20px] p-6 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.3)] border-2 border-[#d4af37]/30 h-full flex flex-col text-gray-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-paper opacity-10 pointer-events-none" />
              {/* 装饰角花 */}
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#d4af37]/50 rounded-tl-lg" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#d4af37]/50 rounded-tr-lg" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#d4af37]/50 rounded-bl-lg" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#d4af37]/50 rounded-br-lg" />

              {/* Back Header */}
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-sm font-black text-[#003366]">
                    <Star className="w-4 h-4 fill-current text-[#d4af37]" />
                    <span>公益体彩 乐善人生</span>
                  </div>
                  <span className="text-[9px] text-gray-400 font-mono tracking-widest mt-1 uppercase">Official Anniversary Ticket</span>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center border border-red-200/50 shadow-sm">
                  <Heart className="w-6 h-6 text-red-500 fill-current" />
                </div>
              </div>

              {/* Main Rules Content */}
              <div className="flex-1 space-y-5 relative z-10">
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-gradient-to-b from-[#c41e3a] to-[#003366] rounded-full" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">使用须知</h3>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-gray-200 to-transparent" />
                  </div>
                  <ul className="text-[10px] space-y-2 text-gray-600 font-medium leading-relaxed list-disc list-inside px-1 marker:text-[#c41e3a]">
                    <li>本券仅限一周年纪念使用，最终解释权归男朋友所有。</li>
                    <li>刮开区域后请及时联系兑奖，逾期不候（其实永远有效）。</li>
                    <li>奖品包含实物与搞怪券，请理性对待，不得拒收。</li>
                    <li>如刮出"谢谢参与"，请给男朋友一个拥抱作为安慰。</li>
                  </ul>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-3">
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
                <section className="relative">
                  <div className="bg-gradient-to-br from-red-50/70 to-pink-50/70 border border-red-100/60 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-20">
                      <Heart className="w-8 h-8 text-red-400 fill-current" />
                    </div>
                    <p className="text-[11px] leading-relaxed text-gray-600 font-medium italic relative z-10">
                      "一年的时光像一张小小的刮刮乐——<br />
                      每一次刮开，都是新的惊喜。"
                    </p>
                    <p className="text-right text-[9px] text-gray-400 mt-2 tracking-widest">— FOR YOU, WITH LOVE</p>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="mt-auto pt-4 border-t border-[#d4af37]/20 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white border-2 border-gray-900 p-1.5 rounded-lg shadow-md">
                    <div className="w-full h-full bg-[repeating-conic-gradient(black_0%_25%,white_0%_50%)] bg-[length:4px_4px]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-900">扫码领奖</span>
                    <span className="text-[10px] font-bold text-[#003366]">相信自己 · 顶呱刮</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="w-20 h-7 bg-[repeating-linear-gradient(90deg,black,black_1px,white_1px,white_3px)] opacity-80 rounded-sm" />
                  <span className="text-[8px] font-mono text-gray-400 mt-2">BATCH: 2024-0520-888</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 完成后的祝福条 */}
      <AnimatePresence>
        {isComplete && !isFlipped && (
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.3 }}
            className="mt-6 max-w-[380px] w-full"
          >
            <div className="velvet-red border-2 border-[#d4af37] rounded-2xl px-5 py-3 shadow-xl relative overflow-hidden shine-sweep">
              <div className="absolute inset-0 bg-noise opacity-20" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 bg-[#d4af37] rounded-full flex items-center justify-center shrink-0 shadow-md">
                  <Gift className="w-5 h-5 text-[#c41e3a]" />
                </div>
                <div className="flex-1">
                  <p className="gold-text font-black text-sm tracking-wider leading-tight">恭喜中奖 · 周年快乐</p>
                  <p className="text-[#d4af37]/80 text-[10px] font-bold mt-0.5 tracking-widest">HAPPY ANNIVERSARY · 2024 → 2025</p>
                </div>
                <Sparkles className="w-5 h-5 text-[#d4af37] animate-pulse" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 引导手势（刮前） */}
      <AnimatePresence>
        {!isComplete && revealedItems.size === 0 && !isFlipped && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-4 flex items-center gap-2 text-gray-500 text-xs font-bold tracking-wider"
          >
            <Hand className="w-4 h-4 wobble" />
            <span>用手指刮开银色涂层</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background floating hearts */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {[...Array(14)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.18, 0],
              scale: [0.5, 1.2, 0.5],
              y: [0, -220, 0],
              x: [0, Math.random() * 120 - 60, 0]
            }}
            transition={{
              duration: 8 + Math.random() * 8,
              repeat: Infinity,
              delay: i * 1.3
            }}
            className="absolute"
            style={{
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%'
            }}
          >
            {i % 3 === 0 ? (
              <Sparkles className="text-[#d4af37]" size={Math.random() * 10 + 10} />
            ) : (
              <Heart className="text-red-400 fill-current" size={Math.random() * 15 + 10} />
            )}
          </motion.div>
        ))}
      </div>

    </div>
  );
}
