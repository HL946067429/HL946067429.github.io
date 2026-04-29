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
  const hemiRef = useRef<THREE.HemisphereLight>(null);

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
      // 夜间淡出,白天按 cosZenith 调强度(物理曝光配合 ACES 色调映射,数值偏大)
      const intensity = s.isDay ? 1.2 + 3.5 * s.cosZenith : 0;
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
      // 环境光基底(模拟散射 + 多次反弹,补偿 ACES 后的暗部)
      ambientRef.current.intensity = s.isDay ? 0.35 + 0.2 * s.cosZenith : 0.08;
    }
    if (hemiRef.current) {
      // 半球光:天空蓝从上撒下,地面棕从下反弹
      hemiRef.current.intensity = s.isDay ? 0.55 + 0.25 * s.cosZenith : 0.1;
      // 日出日落天空偏暖
      const skyHue = 0.55 - 0.05 * (1 - s.cosZenith);
      const skySat = 0.35 + 0.25 * s.cosZenith;
      hemiRef.current.color.setHSL(skyHue, skySat, 0.65);
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.3} />
      <hemisphereLight
        ref={hemiRef}
        color="#a8c8ff"
        groundColor="#7a6a3a"
        intensity={0.5}
      />
      <directionalLight
        ref={lightRef}
        castShadow
        intensity={3.5}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <mesh ref={sunMeshRef} geometry={sunGeo} material={sunMat} />
    </>
  );
}
