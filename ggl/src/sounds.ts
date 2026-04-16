/**
 * 程序化音效（Web Audio API）+ 触觉反馈
 * 不依赖任何音频文件，所有声音用 oscillator/noise 实时合成
 */

const MUTE_KEY = 'ggl:muted';

let _ctx: AudioContext | null = null;
let _muted: boolean =
  typeof window !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';

const listeners = new Set<(muted: boolean) => void>();

export const isMuted = () => _muted;

export const setMuted = (m: boolean) => {
  _muted = m;
  if (typeof window !== 'undefined') {
    if (m) localStorage.setItem(MUTE_KEY, '1');
    else localStorage.removeItem(MUTE_KEY);
  }
  if (m) stopScratch();
  listeners.forEach((fn) => fn(m));
};

export const subscribeMute = (fn: (m: boolean) => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const getCtx = (): AudioContext | null => {
  if (_muted) return null;
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    _ctx = new Ctx();
  }
  // resume if suspended (autoplay policy)
  if (_ctx && _ctx.state === 'suspended') _ctx.resume();
  return _ctx;
};

/* ---------- 基础合成 ---------- */

const tone = (
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.18,
  delay = 0,
) => {
  const ctx = getCtx();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
};

const sweep = (
  fromFreq: number,
  toFreq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.18,
  delay = 0,
) => {
  const ctx = getCtx();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, toFreq), start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
};

/* ---------- 刮卡：循环白噪声 ---------- */

let scratchSource: AudioBufferSourceNode | null = null;
let scratchGain: GainNode | null = null;

export const startScratch = () => {
  const ctx = getCtx();
  if (!ctx || scratchSource) return;
  const dur = 1;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.7;
  scratchSource = ctx.createBufferSource();
  scratchSource.buffer = buffer;
  scratchSource.loop = true;
  // 高通滤波让噪声更像金属摩擦
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1800;
  scratchGain = ctx.createGain();
  scratchGain.gain.setValueAtTime(0, ctx.currentTime);
  scratchGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.05);
  scratchSource.connect(filter).connect(scratchGain).connect(ctx.destination);
  scratchSource.start();
};

export const stopScratch = () => {
  const ctx = _ctx;
  if (!scratchSource || !scratchGain || !ctx) return;
  scratchGain.gain.cancelScheduledValues(ctx.currentTime);
  scratchGain.gain.setValueAtTime(scratchGain.gain.value, ctx.currentTime);
  scratchGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
  const src = scratchSource;
  setTimeout(() => {
    try { src.stop(); } catch { /* ignore */ }
  }, 100);
  scratchSource = null;
  scratchGain = null;
};

/* ---------- 各类预设音效 ---------- */

// 中奖（实物）：清亮上扬+和弦
export const playWinReal = () => {
  tone(523, 0.12, 'triangle', 0.2);            // C5
  tone(659, 0.18, 'triangle', 0.18, 0.08);     // E5
  tone(784, 0.32, 'triangle', 0.18, 0.16);     // G5
  tone(1047, 0.5, 'sine', 0.12, 0.24);         // C6
};

// 中奖（趣味）：温和叮咚
export const playWinFunny = () => {
  tone(523, 0.15, 'triangle', 0.18);
  tone(784, 0.25, 'triangle', 0.15, 0.1);
};

// 谢谢参与：下行哀叹
export const playLose = () => {
  sweep(400, 200, 0.5, 'sawtooth', 0.1);
  tone(180, 0.4, 'triangle', 0.08, 0.2);
};

// 揭奖小提示
export const playReveal = () => {
  tone(880, 0.08, 'triangle', 0.12);
};

// 红包弹出
export const playEnvelope = () => {
  tone(392, 0.1, 'triangle', 0.15);
  tone(523, 0.15, 'triangle', 0.12, 0.08);
};

// 拆红包
export const playOpenEnvelope = () => {
  tone(523, 0.08, 'triangle', 0.2);
  tone(659, 0.08, 'triangle', 0.18, 0.06);
  tone(784, 0.08, 'triangle', 0.18, 0.12);
  tone(1047, 0.4, 'sine', 0.15, 0.18);
};

// 转盘咔嗒
export const playTick = (volume = 0.08) => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(2200, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
};

// 全部完成：欢快和弦
export const playAllDone = () => {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.6, 'triangle', 0.15, i * 0.08));
};

// 作弊黑客音
export const playHack = () => {
  for (let i = 0; i < 5; i++) tone(800 + Math.random() * 600, 0.06, 'square', 0.05, i * 0.15);
};

// 作弊失败警报
export const playAlarm = () => {
  sweep(1200, 600, 0.25, 'sawtooth', 0.12);
  sweep(1200, 600, 0.25, 'sawtooth', 0.12, 0.3);
};

/* ---------- 触觉反馈 ---------- */

export const vibrate = (pattern: number | number[]) => {
  if (_muted) return; // 跟随静音开关
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
};

export const vibrateWin = () => vibrate(150);
export const vibrateBigWin = () => vibrate([60, 40, 60, 40, 200]);
export const vibrateLose = () => vibrate(30);
