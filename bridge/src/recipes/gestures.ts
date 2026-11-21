/** Single-shot gestures and generic oscillation. */

import { boneOp, requireRole, TWO_PI, type BoneInfo, type Operation, type RoleMap, type Side } from "./types.js";

export interface WaveParams {
  layerId: number;
  roles: RoleMap;
  side: Side;
  startFrame: number;
  /** Total frames of the gesture, including raise and lower. */
  duration: number;
  swings: number;
  /** Forearm swing amplitude (radians). */
  amplitude: number;
}

const RAISE_RADIANS = Math.PI * 0.8;
const RAISE_FRACTION = 0.2;
const LOWER_FRACTION = 0.2;

/** Raise an arm, wave the forearm, lower it. */
export function waveOps(p: WaveParams): Operation[] {
  if (!(p.duration >= 10)) throw new Error("duration must be >= 10 frames");
  if (!(p.swings >= 1)) throw new Error("swings must be >= 1");

  const arm = requireRole(p.roles, `upper_arm_${p.side}`);
  const fore = requireRole(p.roles, `forearm_${p.side}`);
  const dir = p.side === "L" ? 1 : -1; // raising rotates +angle for L, -angle for R

  const raised = arm.angle + dir * RAISE_RADIANS;
  const s = p.startFrame;
  const raiseEnd = s + Math.round(p.duration * RAISE_FRACTION);
  const lowerStart = s + p.duration - Math.round(p.duration * LOWER_FRACTION);
  const end = s + p.duration;

  const ops: Operation[] = [
    boneOp(p.layerId, arm, s, { angle: arm.angle }),
    boneOp(p.layerId, fore, s, { angle: fore.angle }),
    boneOp(p.layerId, arm, raiseEnd, { angle: raised }),
    boneOp(p.layerId, arm, lowerStart, { angle: raised }),
    boneOp(p.layerId, arm, end, { angle: arm.angle }),
    boneOp(p.layerId, fore, end, { angle: fore.angle }),
  ];

  const waveSpan = lowerStart - raiseEnd;
  const step = waveSpan / (p.swings * 2);
  for (let i = 0; i <= p.swings * 2; i += 1) {
    const sign = i % 2 === 0 ? 1 : -1;
    ops.push(boneOp(p.layerId, fore, Math.round(raiseEnd + i * step), { angle: fore.angle + sign * p.amplitude }));
  }
  return ops;
}

export type OscillateProperty = "angle" | "posX" | "posY" | "scale";

export interface OscillateParams {
  layerId: number;
  bone: BoneInfo;
  property: OscillateProperty;
  startFrame: number;
  /** Frames per oscillation. */
  period: number;
  cycles: number;
  amplitude: number;
  /** Radians; shifts the wave in time. */
  phase?: number;
  samplesPerCycle?: number;
}

function restValue(bone: BoneInfo, property: OscillateProperty): number {
  switch (property) {
    case "angle": return bone.angle;
    case "posX": return bone.position.x;
    case "posY": return bone.position.y;
    case "scale": return 1;
  }
}

/** Sine-wave a bone property around its rest value: breathing, nodding, tail wag, floating. */
export function oscillateOps(p: OscillateParams): Operation[] {
  if (!(p.period >= 4)) throw new Error("period must be >= 4 frames");
  if (!(p.cycles > 0)) throw new Error("cycles must be > 0");

  const samples = p.samplesPerCycle ?? 4;
  const total = Math.round(samples * p.cycles);
  const rest = restValue(p.bone, p.property);
  const ops: Operation[] = [];
  let last = Number.NaN;

  for (let k = 0; k <= total; k += 1) {
    const t = k / samples;
    const frame = p.startFrame + Math.round(t * p.period);
    if (frame === last) continue;
    last = frame;
    const value = rest + p.amplitude * Math.sin(TWO_PI * t + (p.phase ?? 0));
    ops.push(boneOp(p.layerId, p.bone, frame, { [p.property]: value }));
  }
  return ops;
}
