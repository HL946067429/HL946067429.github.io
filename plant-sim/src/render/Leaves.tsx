import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildCordateLeaf } from "./leafGeometry";
import { getLeafDetailTexture, getLeafRoughnessTexture } from "./textures";
import { computeSolar } from "@/models/solar";
import { useTimeline } from "@/stores/timelineStore";
import { useEnv } from "@/stores/envStore";

export interface LeafSlot {
  /** 沿茎的高度比例 0(基)→1(顶) */
  yFrac: number;
  /** 绕茎的角度(弧度) */
  azimuth: number;
  /** 当前叶长(米),由阶段动态推送 */
  length: number;
  /** 叶柄向上倾角(弧度) */
  pitch: number;
  /** 叶颜色 RGB(0-1 三元组) */
  color: [number, number, number];
  /** 是否还附着在植株上 */
  attached: boolean;
  /** 卷曲度 0-1(衰老时增大) */
  curl: number;
}

export interface LeavesProps {
  /** 茎当前高度 */
  stemHeight: number;
  /** 茎顶弯曲角度(用于把叶子粗略跟随茎弯) */
  stemBend: number;
  /** 全部叶子槽位 */
  leaves: LeafSlot[];
  /** 单叶基础 mesh 大小(用于 InstancedMesh 缩放) */
  unitLength: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _qAz = new THREE.Quaternion();
const _qPitch = new THREE.Quaternion();
const _qCurl = new THREE.Quaternion();
const _qPhoto = new THREE.Quaternion();
const _qIdentity = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();
const _normal = new THREE.Vector3();
const _sunDir = new THREE.Vector3();
const _AXIS_X = new THREE.Vector3(1, 0, 0);
const _AXIS_Y = new THREE.Vector3(0, 1, 0);
const _AXIS_Z = new THREE.Vector3(0, 0, 1);

/**
 * 用 InstancedMesh 渲染所有叶子;每个槽位对应一个实例。
 * 叶子的"长大"通过 scale 实现,凋落通过 visible/scale=0 实现。
 */
export default function Leaves({
  stemHeight,
  stemBend,
  leaves,
  unitLength,
}: LeavesProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(
    () => buildCordateLeaf({ length: unitLength, serration: 0.6 }),
    [unitLength],
  );
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff, // 实际颜色来自 instanceColor;贴图提供细节
      map: getLeafDetailTexture(),
      roughnessMap: getLeafRoughnessTexture(),
      roughness: 0.62,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    return m;
  }, []);

  // count 上限固定,以便 InstancedMesh 复用
  const maxCount = leaves.length;

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // 颜色只在 slot 变化时更新一次(无须每帧)
  useEffect(() => {
    const im = ref.current;
    if (!im) return;
    for (let i = 0; i < maxCount; i++) {
      const slot = leaves[i];
      if (!slot) continue;
      _color.setRGB(slot.color[0], slot.color[1], slot.color[2]);
      im.setColorAt(i, _color);
    }
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [leaves, maxCount]);

  // 每帧:风扰动 + 向光性 + 跟随茎弯。
  // 这是文档"算法驱动微动态 + 环境响应"原则的体现。
  useFrame((state) => {
    const im = ref.current;
    if (!im) return;
    const t = state.clock.elapsedTime;

    // 计算太阳方向(用于叶片向光性)
    const now = useTimeline.getState().now;
    const loc = useEnv.getState().location;
    const sun = computeSolar(new Date(now), loc.lat, loc.lon);
    _sunDir.set(sun.direction[0], sun.direction[1], sun.direction[2]);
    const isDay = sun.isDay && sun.altitude > 0.05;

    for (let i = 0; i < maxCount; i++) {
      const slot = leaves[i];
      if (!slot || !slot.attached || slot.length <= 0.001) {
        _m.makeScale(0, 0, 0);
        im.setMatrixAt(i, _m);
        continue;
      }

      // ==== 风扰动 ====
      // 频率/相位以叶子 azimuth+yFrac 为种子,使每片叶子节奏不同
      const phase = slot.azimuth * 1.7 + slot.yFrac * 3.2;
      const windAz = Math.sin(t * 1.3 + phase) * 0.05;
      const windPitch = Math.cos(t * 1.7 + phase * 0.6) * 0.04;
      // 茎尖弯曲幅度大时,叶子摇摆也大(模拟力矩传递)
      const swayAmp = 1 + slot.yFrac * 0.6;

      // ==== 位置:沿茎升高 + 茎弯近似偏移 ====
      const y = slot.yFrac * stemHeight;
      const xBend = Math.sin(stemBend) * stemHeight * 0.35 * slot.yFrac * slot.yFrac;
      _pos.set(xBend, y, 0);

      // ==== 基础旋转 ====
      _qCurl.setFromAxisAngle(_AXIS_X, slot.curl * 0.9);
      _qPitch.setFromAxisAngle(
        _AXIS_Z,
        slot.pitch + windPitch * swayAmp,
      );
      _qAz.setFromAxisAngle(_AXIS_Y, slot.azimuth + windAz * swayAmp);
      _q.copy(_qAz).multiply(_qPitch).multiply(_qCurl);

      // ==== 叶片向光性 ====
      // 把叶面法向(默认 +Y,经 _q 变换后)朝太阳方向偏一点
      // 衰老叶子(curl 大)对光不再敏感
      if (isDay && slot.curl < 0.3) {
        _normal.set(0, 1, 0).applyQuaternion(_q);
        // 计算从 normal 到 sunDir 的微旋转
        _qPhoto.setFromUnitVectors(_normal, _sunDir);
        // slerp 到 identity 的 0.18 处:只取 18% 的转向量
        _qIdentity.identity();
        _qPhoto.slerp(_qIdentity, 0.82);
        // 在世界空间预乘
        _q.premultiply(_qPhoto);
      }

      const s = slot.length / Math.max(0.001, unitLength);
      _scale.set(s, s, s);
      _m.compose(_pos, _q, _scale);
      im.setMatrixAt(i, _m);
    }
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, maxCount]}
      castShadow
      receiveShadow
    />
  );
}
