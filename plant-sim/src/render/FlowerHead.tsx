import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildPetal } from "./leafGeometry";

export interface FlowerHeadProps {
  /** 花盘半径(米) */
  radius: number;
  /** 花瓣数 */
  petalCount: number;
  /** 花瓣绽放进度 0(蕾)→1(完全开) */
  bloom: number;
  /** 花瓣凋谢进度 0(鲜)→1(凋落) */
  wilt: number;
  /** 花盘成熟度 0(青色)→1(籽实棕褐) */
  ripeness: number;
  /** 花瓣颜色 */
  petalColor: string;
  /** 花瓣末端颜色 */
  petalTipColor?: string;
  /** 花盘颜色(青年) */
  discColor: string;
  /** 花盘中心更暗的颜色 */
  discCenterColor?: string;
  /** 凋谢花瓣颜色 */
  petalSenescentColor: string;
  /** 萼片颜色 */
  sepalColor: string;
}

const GOLDEN_ANGLE = 137.508 * (Math.PI / 180);

/**
 * 向日葵花盘:
 *   - DiscFlorets:数百朵管状花,Vogel 模型(Phyllotaxis)排列
 *   - Petals:一圈舌状花
 *   - Sepal:背面绿色萼片
 */
export default function FlowerHead({
  radius,
  petalCount,
  bloom,
  wilt,
  ripeness,
  petalColor,
  petalTipColor,
  discColor,
  discCenterColor,
  petalSenescentColor,
  sepalColor,
}: FlowerHeadProps) {
  // -- DiscFlorets --
  const discGeometry = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const discMat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    [],
  );
  const discRef = useRef<THREE.InstancedMesh>(null);
  const FLORET_COUNT = 240;

  useEffect(() => {
    const im = discRef.current;
    if (!im) return;
    const tmp = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const colorYoung = new THREE.Color(discColor);
    const colorRipe = new THREE.Color(discCenterColor ?? "#2a1808");
    const c = new THREE.Color();
    // 中心最先变深(灌浆从中心起),整体随 ripeness 全变深
    const maxR = Math.sqrt(FLORET_COUNT);
    const floretRadius = (radius * 0.04) * 1.4;
    for (let i = 0; i < FLORET_COUNT; i++) {
      const r = (Math.sqrt(i + 0.5) / maxR) * radius * 0.92;
      const theta = i * GOLDEN_ANGLE;
      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);
      // 略略凸起(中心高,边缘平),且凹进表面 0.005
      const y = 0.012 * (1 - r / radius);
      pos.set(x, y, z);
      quat.identity();
      const fR = floretRadius * (0.6 + 0.4 * (1 - r / radius));
      scale.set(fR, fR * 1.3, fR);
      tmp.compose(pos, quat, scale);
      im.setMatrixAt(i, tmp);

      // 颜色:中心+成熟度共同决定深浅
      const tCenter = 1 - r / radius;
      const t = Math.min(1, ripeness + 0.4 * tCenter * ripeness);
      c.copy(colorYoung).lerp(colorRipe, t);
      im.setColorAt(i, c);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [radius, discColor, discCenterColor, ripeness]);

  // -- Petals --
  const petalGeometry = useMemo(() => {
    return buildPetal({
      length: radius * 1.55,
      width: radius * 0.45,
      segments: 8,
    });
  }, [radius]);
  const petalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        side: THREE.DoubleSide,
        roughness: 0.6,
        vertexColors: false,
      }),
    [],
  );
  const petalRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const im = petalRef.current;
    if (!im) return;
    const tmp = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const qy = new THREE.Quaternion();
    const qz = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const colorFresh = new THREE.Color(petalColor);
    const colorTip = new THREE.Color(petalTipColor ?? petalColor);
    const colorWilt = new THREE.Color(petalSenescentColor);
    const c = new THREE.Color();

    // bloom 决定花瓣外翻角度:0 时几乎竖直贴着花蕾,1 时水平向外
    // 轻微随机化让花瓣不完全对齐
    for (let i = 0; i < petalCount; i++) {
      const azimuth = (i / petalCount) * Math.PI * 2;
      // 略微随机相位
      const jitter = ((i * 1234567) % 100) / 100 - 0.5;
      const tilt = (1 - bloom) * (Math.PI * 0.55) + wilt * 0.6 - 0.05; // 蕾期向上,凋谢下垂
      // 位置:花瓣根部贴在花盘外缘
      const baseR = radius * 0.85;
      pos.set(
        Math.cos(azimuth) * baseR,
        0.005,
        Math.sin(azimuth) * baseR,
      );
      qy.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -azimuth + Math.PI / 2);
      qz.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -tilt);
      q.copy(qy).multiply(qz);
      // 凋谢时尺寸缩小
      const sLen = (0.4 + 0.6 * bloom) * (1 - 0.6 * wilt);
      const sWid = (0.5 + 0.5 * bloom) * (1 - 0.5 * wilt);
      scale.set(sLen, sWid + 0.001 * jitter, sWid);
      tmp.compose(pos, q, scale);
      im.setMatrixAt(i, tmp);

      // 颜色:成熟时基色 + 末端橙;凋谢时变为枯黄
      c.copy(colorFresh).lerp(colorTip, 0.35);
      c.lerp(colorWilt, wilt);
      im.setColorAt(i, c);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [
    radius,
    petalCount,
    bloom,
    wilt,
    petalColor,
    petalTipColor,
    petalSenescentColor,
  ]);

  // 花瓣完全凋落时整组 InstancedMesh 不显示
  const petalsVisible = wilt < 0.99;

  // -- Sepal(萼片背面)--
  const sepalGeo = useMemo(() => new THREE.CircleGeometry(radius * 1.05, 32), [radius]);
  const sepalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: sepalColor,
        roughness: 0.85,
        side: THREE.DoubleSide,
      }),
    [sepalColor],
  );
  // 萼片随成熟度变枯
  useEffect(() => {
    const c = new THREE.Color(sepalColor);
    const dead = new THREE.Color("#5a3a1a");
    sepalMat.color.copy(c).lerp(dead, ripeness * 0.6);
  }, [sepalColor, sepalMat, ripeness]);

  return (
    <group>
      {/* 萼片背面(略低于花盘)*/}
      <mesh
        geometry={sepalGeo}
        material={sepalMat}
        position={[0, -0.012, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      />
      {/* 管状花阵列 */}
      <instancedMesh
        ref={discRef}
        args={[discGeometry, discMat, FLORET_COUNT]}
        castShadow
      />
      {/* 舌状花瓣 */}
      <instancedMesh
        ref={petalRef}
        args={[petalGeometry, petalMat, petalCount]}
        visible={petalsVisible}
        castShadow
      />
    </group>
  );
}
