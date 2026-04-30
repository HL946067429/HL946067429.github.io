import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildPetal } from "./leafGeometry";
import { getDiscBumpTexture, getDiscTexture, getPetalDetailTexture } from "./textures";

export interface FlowerHeadProps {
  /** 花盘半径(米) */
  radius: number;
  /** 花瓣数 */
  petalCount: number;
  /** 花瓣绽放进度 0(蕾)→1(完全开) */
  bloom: number;
  /** 管状花开放前线 0(外缘未开始)→1(全部开完到中心) */
  bloomFront: number;
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

/**
 * 向日葵花盘:
 *   - Disc:平面 + Vogel 螺旋种子点纹理(替代上千个小球,性能/视觉双赢)
 *   - Petals:一圈舌状花
 *   - Sepal:背面绿色萼片
 */
export default function FlowerHead({
  radius,
  petalCount,
  bloom,
  bloomFront,
  wilt,
  ripeness,
  petalColor,
  petalTipColor,
  discColor,
  discCenterColor,
  petalSenescentColor,
  sepalColor,
}: FlowerHeadProps) {
  // -- 花盘 (一张 CircleGeometry + 程序化纹理) --
  const discGeometry = useMemo(
    () => new THREE.CircleGeometry(radius, 64),
    [radius],
  );
  const discTexture = useMemo(
    () =>
      getDiscTexture({
        outerColor: discColor,
        centerColor: discCenterColor ?? "#2a1808",
      }),
    [discColor, discCenterColor],
  );
  const discBumpTexture = useMemo(() => getDiscBumpTexture(), []);
  const discMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: discTexture,
      bumpMap: discBumpTexture,
      bumpScale: 0.04,
      roughness: 0.78,
      metalness: 0,
      side: THREE.FrontSide,
    });
    // 注入 shader,实现"管状花开放前线"由外向内推进
    const uniforms = { uBloomFront: { value: 0 } };
    m.userData.uniforms = uniforms;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uBloomFront = uniforms.uBloomFront;
      shader.fragmentShader =
        `uniform float uBloomFront;\n` +
        shader.fragmentShader.replace(
          "#include <map_fragment>",
          `
          #include <map_fragment>
          // 计算到花盘中心的归一化半径(CircleGeometry 默认 UV 中心 (0.5,0.5))
          vec2 uvCentered = vMapUv - vec2(0.5);
          float rDisc = length(uvCentered) * 2.0; // 0 中心,1 外缘
          float ringR = 1.0 - uBloomFront;
          // 内侧未开放(preTint 偏绿黄),外侧已开放(保留 map 的棕色)
          float bloomedSide = smoothstep(ringR - 0.02, ringR + 0.02, rDisc);
          // 开放前线 = 一圈亮黄(花粉色)
          float ringBand = exp(-pow((rDisc - ringR) * 14.0, 2.0));
          vec3 preTint = vec3(0.6, 0.65, 0.28);
          vec3 ringColor = vec3(1.0, 0.78, 0.18);
          diffuseColor.rgb = mix(diffuseColor.rgb * preTint * 1.55, diffuseColor.rgb, bloomedSide);
          diffuseColor.rgb = mix(diffuseColor.rgb, ringColor, clamp(ringBand, 0.0, 1.0) * 0.88);
          `,
        );
    };
    return m;
  }, [discTexture, discBumpTexture]);

  // 成熟度调色 + 开放前线推进
  useEffect(() => {
    const c = new THREE.Color(0xffffff);
    const dark = new THREE.Color(0x6a4a20);
    c.lerp(dark, ripeness);
    discMat.color.copy(c);
    const u = (discMat.userData as { uniforms?: { uBloomFront: { value: number } } })
      .uniforms;
    if (u?.uBloomFront) u.uBloomFront.value = bloomFront;
  }, [discMat, ripeness, bloomFront]);

  // -- Petals --
  const petalGeometry = useMemo(() => {
    return buildPetal({
      length: radius * 1.55,
      width: radius * 0.45,
      segments: 8,
    });
  }, [radius]);
  const petalDetailTex = useMemo(() => getPetalDetailTexture(), []);
  const petalMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: petalDetailTex,
        side: THREE.DoubleSide,
        roughness: 0.55,
        metalness: 0,
      }),
    [petalDetailTex],
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
    const axisY = new THREE.Vector3(0, 1, 0);
    const axisZ = new THREE.Vector3(0, 0, 1);

    // 花瓣局部:+X=花瓣尖向外,+Y=法向(向上),+Z=宽
    // bloom 0(蕾,瓣向心轴上抬)→1(完全展开,水平外伸)
    // wilt  0(鲜)→1(瓣下垂)
    for (let i = 0; i < petalCount; i++) {
      const azimuth = (i / petalCount) * Math.PI * 2;
      const jitter = ((i * 1234567) % 100) / 100 - 0.5;
      // 花瓣"上抬量":bud 时 ~80° 几乎贴着花蕾轴心,完全开放时几乎水平
      const closingTilt = (1 - bloom) * (Math.PI * 0.45);
      // 凋谢"下垂量":让花瓣超越水平往下垂
      const droopTilt = -wilt * 0.7;
      const tilt = closingTilt + droopTilt;
      // 花瓣根部贴花盘外缘
      const baseR = radius * 0.78;
      pos.set(
        Math.cos(azimuth) * baseR,
        0.005,
        Math.sin(azimuth) * baseR,
      );
      // 顺序:先把花瓣"提起"(qz),再绕花心 Y 轴转到对应方位
      // 注意:qy 旋转角度 = -azimuth(让 +X 落到 (cos az, 0, sin az))
      qy.setFromAxisAngle(axisY, -azimuth);
      qz.setFromAxisAngle(axisZ, tilt);
      q.copy(qy).multiply(qz);
      // 凋谢时尺寸缩小
      const sLen = (0.5 + 0.5 * bloom) * (1 - 0.6 * wilt);
      const sWid = (0.6 + 0.4 * bloom) * (1 - 0.4 * wilt);
      scale.set(sLen, sWid * (1 + 0.04 * jitter), sWid);
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
      {/* 花盘(管状花)*/}
      <mesh
        geometry={discGeometry}
        material={discMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
        castShadow
        receiveShadow
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
