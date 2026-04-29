import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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
      camera={{ position: [4, 2.5, 5], fov: 50, near: 0.1, far: 500 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Sky />
      <Sun />
      <Ground />
      <PlantRegistry />
      <OrbitControls
        makeDefault
        enableDamping
        target={[0, 1.2, 0]}
        minDistance={2}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </Canvas>
  );
}
