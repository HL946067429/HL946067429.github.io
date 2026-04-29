import { useMemo } from "react";
import * as THREE from "three";

/**
 * 占位植物：茎 + 几片叶子。
 * 后续替换为 L-System 生成的真实形态结构。
 */
export default function Plant() {
  const stemGeo = useMemo(() => new THREE.CylinderGeometry(0.06, 0.08, 2.4, 12), []);
  const stemMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#5b7a3a", roughness: 0.7 }),
    [],
  );
  const leafGeo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.35, 16, 12);
    g.scale(1.4, 0.18, 0.9);
    return g;
  }, []);
  const leafMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4f8a3a",
        roughness: 0.5,
        side: THREE.DoubleSide,
      }),
    [],
  );

  // 叶子位置（高度 + 绕茎角度）
  const leaves = useMemo(() => {
    const arr: { y: number; angle: number; tilt: number }[] = [];
    for (let i = 0; i < 6; i++) {
      arr.push({
        y: 0.5 + i * 0.32,
        angle: i * (Math.PI * 2 * 0.382), // 黄金角散布
        tilt: 0.25 + (i % 2) * 0.1,
      });
    }
    return arr;
  }, []);

  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={stemGeo} material={stemMat} position={[0, 1.2, 0]} castShadow />
      {leaves.map((l, i) => (
        <mesh
          key={i}
          geometry={leafGeo}
          material={leafMat}
          position={[
            Math.cos(l.angle) * 0.45,
            l.y,
            Math.sin(l.angle) * 0.45,
          ]}
          rotation={[l.tilt, l.angle, 0]}
          castShadow
        />
      ))}
    </group>
  );
}
