import { useMemo } from "react";
import * as THREE from "three";

export interface StemProps {
  /** 茎当前长度(米) */
  height: number;
  /** 基径(米) */
  baseRadius: number;
  /** 顶径(米) */
  topRadius: number;
  /** 顶端弯曲角度(弧度,正值表示朝 +X 方向倾倒) */
  bendAngle?: number;
  /** 颜色 */
  color: THREE.ColorRepresentation;
  /** 段数(沿轴),默认 24 */
  segments?: number;
  /** 径向段数 */
  radialSegments?: number;
  /** 风扰(随当前帧动态调整最上端弯曲量,接入风模型后用) */
  windOffset?: [number, number];
}

/**
 * 程序化茎:沿三次贝塞尔曲线生成的渐变锥度管。
 * 上端可受 bendAngle 控制弯曲(用于花期成熟头部下垂)。
 */
export default function Stem({
  height,
  baseRadius,
  topRadius,
  bendAngle = 0,
  color,
  segments = 24,
  radialSegments = 10,
  windOffset = [0, 0],
}: StemProps) {
  const geometry = useMemo(() => {
    const tipDx = Math.sin(bendAngle) * height * 0.35 + windOffset[0];
    const tipDz = windOffset[1];
    const tipDy = Math.cos(bendAngle) * height;

    // 自然 S 形:在中段把控制点往随机方向偏移(对齐文档"曲线生长"原则)
    // 真实向日葵在生长过程中,茎并非笔直,而是有自然弯曲。
    // 这里幅度提到 3% 株高 + 上下两段反向(更明显的 S 形)。
    const sway = height * 0.03;
    const p0 = new THREE.Vector3(0, 0, 0);
    // P1 偏 +X、-Z;P2 反向偏 -X、+Z → 形成 S 形拐
    const p1 = new THREE.Vector3(sway * 1.2, height * 0.35, -sway * 0.6);
    const p2 = new THREE.Vector3(
      tipDx * 0.3 - sway * 1.4,
      height * 0.7,
      tipDz * 0.3 + sway * 0.9,
    );
    const p3 = new THREE.Vector3(tipDx, tipDy, tipDz);
    const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);

    // 自定义 TubeGeometry,支持沿 t 渐变半径
    const points = curve.getPoints(segments);
    const frames = curve.computeFrenetFrames(segments, false);

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const r = THREE.MathUtils.lerp(baseRadius, topRadius, t);
      const center = points[i];
      const N = frames.normals[i];
      const B = frames.binormals[i];
      for (let j = 0; j < radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        const nx = cos * N.x + sin * B.x;
        const ny = cos * N.y + sin * B.y;
        const nz = cos * N.z + sin * B.z;
        positions.push(
          center.x + r * nx,
          center.y + r * ny,
          center.z + r * nz,
        );
        normals.push(nx, ny, nz);
        uvs.push(j / radialSegments, t);
      }
    }
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * radialSegments + j;
        const b = i * radialSegments + ((j + 1) % radialSegments);
        const c = (i + 1) * radialSegments + j;
        const d = (i + 1) * radialSegments + ((j + 1) % radialSegments);
        indices.push(a, c, b, b, c, d);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    return g;
  }, [
    height,
    baseRadius,
    topRadius,
    bendAngle,
    segments,
    radialSegments,
    windOffset[0],
    windOffset[1],
  ]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.75} metalness={0} />
    </mesh>
  );
}

/**
 * 给定茎参数,返回顶端世界坐标(用于挂载花头/果实)
 */
export function stemTipPosition(
  height: number,
  bendAngle: number,
  windOffset: [number, number] = [0, 0],
): [number, number, number] {
  const tipDx = Math.sin(bendAngle) * height * 0.35 + windOffset[0];
  const tipDz = windOffset[1];
  const tipDy = Math.cos(bendAngle) * height;
  return [tipDx, tipDy, tipDz];
}

/** 顶端切线方向,用于把花头摆正(沿茎方向法向) */
export function stemTipDirection(bendAngle: number): [number, number, number] {
  // 取贝塞尔末段的近似切线
  return [Math.sin(bendAngle), Math.cos(bendAngle), 0];
}
