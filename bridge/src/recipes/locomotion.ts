/** Walk and run cycles as keyframe operations. */

import { boneOp, requireRole, TWO_PI, type BoneInfo, type Operation, type RoleMap } from "./types.js";

export interface LocomotionParams {
  layerId: number;
  roles: RoleMap;
  startFrame: number;
  /** Frames for one full cycle (two steps). */
  frames: number;
  cycles: number;
  /** Thigh swing amplitude (radians). */
  stride: number;
  armSwing: number;
  kneeBend: number;
  /** Vertical hip bob (layer units). */
  bounce: number;
  /** Forward torso lean (radians, + leans toward +x). */
  lean: number;
  /** Horizontal distance the hip travels per cycle (0 = walk in place). */
  travel: number;
  /** Keyframes per cycle; Moho smooths between them. */
  samplesPerCycle: number;
}

export const WALK_PRESET = { frames: 24, stride: 0.45, armSwing: 0.4, kneeBend: 0.7, bounce: 0.025, lean: 0.03 };
export const RUN_PRESET = { frames: 14, stride: 0.85, armSwing: 0.9, kneeBend: 1.3, bounce: 0.06, lean: 0.15 };

const ELBOW_BEND_FACTOR = 0.5;
const FOOT_COMPENSATION = 0.6;

function legPhase(side: "L" | "R", phase: number): number {
  return side === "L" ? phase : phase + Math.PI;
}

function legOps(p: LocomotionParams, side: "L" | "R", frame: number, phase: number): Operation[] {
  const thigh = requireRole(p.roles, `thigh_${side}`);
  const ops: Operation[] = [];
  const ph = legPhase(side, phase);
  const swing = p.stride * Math.sin(ph);
  const knee = -p.kneeBend * Math.max(0, Math.cos(ph));

  ops.push(boneOp(p.layerId, thigh, frame, { angle: thigh.angle + swing }));

  const shin = p.roles[`shin_${side}`];
  if (shin) ops.push(boneOp(p.layerId, shin, frame, { angle: shin.angle + knee }));

  const foot = p.roles[`foot_${side}`];
  if (foot) {
    const keepFlat = -(swing + knee) * FOOT_COMPENSATION;
    ops.push(boneOp(p.layerId, foot, frame, { angle: foot.angle + keepFlat }));
  }

  // The arm on the same side swings against the leg.
  const arm = p.roles[`upper_arm_${side}`];
  if (arm) {
    ops.push(boneOp(p.layerId, arm, frame, { angle: arm.angle - p.armSwing * Math.sin(ph) }));
    const fore = p.roles[`forearm_${side}`];
    if (fore) {
      const bend = ELBOW_BEND_FACTOR * p.armSwing * Math.max(0, -Math.sin(ph));
      ops.push(boneOp(p.layerId, fore, frame, { angle: fore.angle + bend }));
    }
  }
  return ops;
}

function torsoOps(p: LocomotionParams, hip: BoneInfo, frame: number, phase: number, t: number): Operation[] {
  const ops: Operation[] = [
    boneOp(p.layerId, hip, frame, {
      posX: hip.position.x + p.travel * t,
      posY: hip.position.y + p.bounce * Math.cos(2 * phase),
    }),
  ];
  const spine = p.roles.spine;
  if (spine) {
    ops.push(boneOp(p.layerId, spine, frame, { angle: spine.angle - p.lean + 0.03 * Math.sin(phase) }));
  }
  const head = p.roles.head;
  if (head && spine) {
    ops.push(boneOp(p.layerId, head, frame, { angle: head.angle + p.lean * 0.6 - 0.02 * Math.sin(phase) }));
  }
  return ops;
}

export function locomotionOps(p: LocomotionParams): Operation[] {
  if (!(p.frames >= 4)) throw new Error("frames per cycle must be >= 4");
  if (!(p.cycles >= 1)) throw new Error("cycles must be >= 1");
  if (!(p.samplesPerCycle >= 4)) throw new Error("samplesPerCycle must be >= 4");

  const hip = requireRole(p.roles, "hip");
  requireRole(p.roles, "thigh_L");
  requireRole(p.roles, "thigh_R");

  const total = p.samplesPerCycle * p.cycles;
  const ops: Operation[] = [];
  let lastFrame = Number.NaN;

  for (let k = 0; k <= total; k += 1) {
    const t = k / p.samplesPerCycle; // cycles elapsed
    const frame = p.startFrame + Math.round(t * p.frames);
    if (frame === lastFrame) continue; // tiny cycles: avoid duplicate keys
    lastFrame = frame;
    const phase = TWO_PI * t;
    ops.push(...torsoOps(p, hip, frame, phase, t));
    ops.push(...legOps(p, "L", frame, phase));
    ops.push(...legOps(p, "R", frame, phase));
  }
  return ops;
}
