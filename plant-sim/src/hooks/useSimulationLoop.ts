import { useEffect, useRef } from "react";
import { useTimeline } from "@/stores/timelineStore";

/**
 * 主仿真循环：当 playing=true 时按 speed 推进 timeline.now。
 * 用 requestAnimationFrame 而非 useFrame，因为需要在 UI 层（非 r3f Canvas 内部）触发。
 */
export function useSimulationLoop() {
  const playing = useTimeline((s) => s.playing);
  const advance = useTimeline((s) => s.advance);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      lastRef.current = null;
      return;
    }
    let raf = 0;
    const tick = (ts: number) => {
      if (lastRef.current !== null) {
        advance(ts - lastRef.current);
      }
      lastRef.current = ts;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lastRef.current = null;
    };
  }, [playing, advance]);
}
