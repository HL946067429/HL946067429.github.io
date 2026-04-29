import { create } from "zustand";

interface TimelineState {
  // 仿真时刻（毫秒时间戳，UTC）
  now: number;
  // 是否正在播放
  playing: boolean;
  // 时间倍速：1 = 真实时间，3600 = 一秒过一小时
  speed: number;
  setNow: (t: number) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: number) => void;
  // 推进 dt 毫秒（受 speed 影响）
  advance: (dtMs: number) => void;
  // 跳到指定日期/时分
  setDate: (year: number, month: number, day: number) => void;
  setHourOfDay: (hours: number) => void;
}

const initial = (() => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.getTime();
})();

export const useTimeline = create<TimelineState>((set, get) => ({
  now: initial,
  playing: false,
  speed: 3600, // 默认一秒推进一小时
  setNow: (t) => set({ now: t }),
  setPlaying: (p) => set({ playing: p }),
  setSpeed: (s) => set({ speed: s }),
  advance: (dtMs) => {
    const { now, speed } = get();
    set({ now: now + dtMs * speed });
  },
  setDate: (year, month, day) => {
    const cur = new Date(get().now);
    const next = new Date(year, month - 1, day, cur.getHours(), cur.getMinutes(), 0, 0);
    set({ now: next.getTime() });
  },
  setHourOfDay: (hours) => {
    const d = new Date(get().now);
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    d.setHours(h, m, 0, 0);
    set({ now: d.getTime() });
  },
}));
