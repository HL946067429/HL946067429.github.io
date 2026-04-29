import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildCordateLeaf } from "./leafGeometry";

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
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();
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
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: false,
        side: THREE.DoubleSide,
        roughness: 0.55,
        metalness: 0,
      }),
    [],
  );

  // count 上限固定,以便 InstancedMesh 复用
  const maxCount = leaves.length;

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // 每帧根据 leaves 内容刷新实例矩阵和颜色
  useEffect(() => {
    const im = ref.current;
    if (!im) return;
    for (let i = 0; i < maxCount; i++) {
      const slot = leaves[i];
      if (!slot || !slot.attached || slot.length <= 0.001) {
        _m.makeScale(0, 0, 0);
        im.setMatrixAt(i, _m);
        continue;
      }
      // 叶子位置:沿茎升高 y,绕茎旋转 azimuth(茎几乎垂直,先按垂直茎计算)
      // 顶端弯曲对叶子位置只做简单线性偏移近似
      const y = slot.yFrac * stemHeight;
      const xBend = Math.sin(stemBend) * stemHeight * 0.35 * slot.yFrac * slot.yFrac;
      _pos.set(xBend, y, 0);

      // 叶子局部坐标:+X=叶尖方向,+Y=叶面法向(向上),+Z=叶宽方向
      // 旋转顺序(从内到外):curl 绕 X(沿叶轴卷曲),pitch 绕 Z(叶尖抬升/下垂),azimuth 绕 Y(绕茎旋转)
      _qCurl.setFromAxisAngle(_AXIS_X, slot.curl * 0.9);
      _qPitch.setFromAxisAngle(_AXIS_Z, slot.pitch); // 正值 = 叶尖向上
      _qAz.setFromAxisAngle(_AXIS_Y, slot.azimuth);
      _q.copy(_qAz).multiply(_qPitch).multiply(_qCurl);

      const s = slot.length / Math.max(0.001, unitLength);
      _scale.set(s, s, s);
      _m.compose(_pos, _q, _scale);
      im.setMatrixAt(i, _m);

      _color.setRGB(slot.color[0], slot.color[1], slot.color[2]);
      im.setColorAt(i, _color);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
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
