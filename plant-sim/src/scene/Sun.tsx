import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { computeSolar } from "@/models/solar";
import { useTimeline } from "@/stores/timelineStore";
import { useEnv } from "@/stores/envStore";

const SUN_DISTANCE = 80;

export default function Sun() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);

  const sunGeo = useMemo(() => new THREE.SphereGeometry(2, 24, 24), []);
  const sunMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffe8a8" }),
    [],
  );

  useFrame(() => {
    const now = useTimeline.getState().now;
    const loc = useEnv.getState().location;
    const s = computeSolar(new Date(now), loc.lat, loc.lon);

    const [dx, dy, dz] = s.direction;
    if (lightRef.current) {
      lightRef.current.position.set(
        dx * SUN_DISTANCE,
        Math.max(0.01, dy) * SUN_DISTANCE,
        dz * SUN_DISTANCE,
      );
      // 夜间淡出，白天按 cosZenith 调强度
      const intensity = s.isDay ? 0.5 + 2.2 * s.cosZenith : 0;
      lightRef.current.intensity = intensity;
      lightRef.current.color.setHSL(
        // 日出/日落偏暖
        0.08 + 0.04 * s.cosZenith,
        0.6 - 0.3 * s.cosZenith,
        0.55,
      );
    }
    if (sunMeshRef.current) {
      sunMeshRef.current.position.set(
        dx * SUN_DISTANCE,
        dy * SUN_DISTANCE,
        dz * SUN_DISTANCE,
      );
      sunMeshRef.current.visible = s.altitude > -0.05;
    }
    if (ambientRef.current) {
      // 白天保留充足环境光,避免叶面背向太阳时一片漆黑
      ambientRef.current.intensity = s.isDay ? 0.55 + 0.25 * s.cosZenith : 0.12;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.3} />
      <directionalLight
        ref={lightRef}
        castShadow
        intensity={1.5}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <mesh ref={sunMeshRef} geometry={sunGeo} material={sunMat} />
    </>
  );
}
