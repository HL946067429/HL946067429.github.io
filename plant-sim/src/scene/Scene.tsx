import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Sun from "./Sun";
import Sky from "./Sky";
import Ground from "./Ground";
import PlantRegistry from "./PlantRegistry";
import { useResponsiveDPR } from "@/hooks/useResponsiveDPR";

export default function Scene() {
  const dpr = useResponsiveDPR();

  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ position: [3, 2, 4], fov: 45, near: 0.05, far: 500 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
    >
      <Sky />
      <Sun />
      <Ground />
      <PlantRegistry />
      <OrbitControls
        makeDefault
        enableDamping
        target={[0, 1.2, 0]}
        minDistance={1.2}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </Canvas>
  );
}
