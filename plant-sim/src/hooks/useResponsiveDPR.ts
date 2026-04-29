import { useEffect, useState } from "react";

/**
 * 移动端用更低的 DPR 上限，避免高分屏帧率掉到不可用。
 * 桌面：[1, 2]；移动端：[1, 1.5]
 */
export function useResponsiveDPR(): [number, number] {
  const [dpr, setDpr] = useState<[number, number]>(() => detect());
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = () => setDpr(detect());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dpr;
}

function detect(): [number, number] {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  return isMobile ? [1, 1.5] : [1, 2];
}
