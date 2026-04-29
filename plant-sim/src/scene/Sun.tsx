import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { computeSolar } from "@/models/solar";
import { useTimeline } from "@/stores/timelineStore";
import { useEnv } from "@/stores/envStore";

const SUN_DISTANCE = 80;

export default function Sun() {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const moonLightRef = useRef<THREE.DirectionalLight>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);

  const sunGeo = useMemo(() => new THREE.SphereGeometry(2, 24, 24), []);
  const sunMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffe8a8" }),
    [],
  );
  const moonGeo = useMemo(() => new THREE.SphereGeometry(1.4, 24, 24), []);
  const moonMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#dde6f5" }),
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

    // 月光:简化处理为"太阳的反方向 + 永远朝下"。位置在天顶偏一点,
    // 强度只在夜间生效,色调冷蓝。这不是天体力学准确的月相,只是为了夜里能看见植物。
    const isNight = !s.isDay;
    if (moonLightRef.current) {
      // 反方向 + 抬到天顶
      const mx = -dx * 0.4;
      const my = Math.max(0.6, -dy + 0.5); // 始终在上方
      const mz = -dz * 0.4;
      const moonLen = Math.sqrt(mx * mx + my * my + mz * mz);
      moonLightRef.current.position.set(
        (mx / moonLen) * SUN_DISTANCE,
        (my / moonLen) * SUN_DISTANCE,
        (mz / moonLen) * SUN_DISTANCE,
      );
      moonLightRef.current.intensity = isNight ? 0.55 : 0;
    }
    if (moonMeshRef.current) {
      moonMeshRef.current.visible = isNight;
      if (isNight) {
        const mx = -dx * 0.6;
        const my = Math.max(0.55, -dy + 0.45);
        const mz = -dz * 0.6;
        const moonLen = Math.sqrt(mx * mx + my * my + mz * mz);
        moonMeshRef.current.position.set(
          (mx / moonLen) * SUN_DISTANCE,
          (my / moonLen) * SUN_DISTANCE,
          (mz / moonLen) * SUN_DISTANCE,
        );
      }
    }

    if (ambientRef.current) {
      // 环境光:白天散射,夜间提到 0.28 让叶面有最低亮度,避免画面全黑
      ambientRef.current.intensity = s.isDay
        ? 0.35 + 0.2 * s.cosZenith
        : 0.28;
    }
    if (hemiRef.current) {
      // 半球光:夜间切换为"夜空蓝从上,深棕色从下"
      if (s.isDay) {
        hemiRef.current.intensity = 0.55 + 0.25 * s.cosZenith;
        const skyHue = 0.55 - 0.05 * (1 - s.cosZenith);
        const skySat = 0.35 + 0.25 * s.cosZenith;
        hemiRef.current.color.setHSL(skyHue, skySat, 0.65);
        hemiRef.current.groundColor.set("#7a6a3a");
      } else {
        hemiRef.current.intensity = 0.4;
        hemiRef.current.color.set("#3a4a78"); // 月夜深蓝
        hemiRef.current.groundColor.set("#1a1c20");
      }
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
      {/* 月光:冷蓝色,夜间生效;不投影,避免双套阴影计算 */}
      <directionalLight
        ref={moonLightRef}
        color="#9bb6e8"
        intensity={0}
      />
      <mesh ref={sunMeshRef} geometry={sunGeo} material={sunMat} />
      <mesh ref={moonMeshRef} geometry={moonGeo} material={moonMat} />
    </>
  );
}
