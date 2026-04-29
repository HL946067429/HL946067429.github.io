import { useMemo } from "react";
import * as THREE from "three";

export default function Ground() {
  const geo = useMemo(() => new THREE.PlaneGeometry(60, 60, 1, 1), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3a4a2a",
        roughness: 0.95,
        metalness: 0,
      }),
    [],
  );

  return (
    <mesh
      geometry={geo}
      material={mat}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    />
  );
}
