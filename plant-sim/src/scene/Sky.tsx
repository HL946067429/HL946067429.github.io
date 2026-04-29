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
      const [x, y, z] = s.direction;
      ref.current.material.uniforms.sunPosition.value.set(x, y, z);
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
