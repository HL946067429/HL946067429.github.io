import { Sky as DreiSky } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { computeSolar } from "@/models/solar";
import { useTimeline } from "@/stores/timelineStore";
import { useEnv } from "@/stores/envStore";

export default function Sky() {
  const ref = useRef<any>(null);

  useFrame(() => {
    const now = useTimeline.getState().now;
    const loc = useEnv.getState().location;
    const s = computeSolar(new Date(now), loc.lat, loc.lon);
    if (ref.current?.material?.uniforms?.sunPosition) {
      // 把 Sky 的"假太阳"高度限制在地平线略下,夜间维持深蓝暮色而不是死黑;
      // 真正的天体仰角(用于光照/向日性)仍走 computeSolar,不受此影响。
      const [x, y, z] = s.direction;
      const yClamped = Math.max(y, -0.05);
      ref.current.material.uniforms.sunPosition.value.set(x, yClamped, z);
    }
  });

  // turbidity / rayleigh 值随后续天气模型动态改变
  return (
    <DreiSky
      ref={ref}
      distance={450000}
      turbidity={6}
      rayleigh={2.5}
      mieCoefficient={0.005}
      mieDirectionalG={0.8}
    />
  );
}
