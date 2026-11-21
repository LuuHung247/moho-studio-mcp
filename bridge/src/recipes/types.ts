import type { Operation } from "../tooling/batch.js";

export type { Operation };

export interface BoneInfo {
  id: number;
  name: string;
  /** Rest angle in radians (relative to parent). */
  angle: number;
  position: { x: number; y: number };
  length: number;
  parentId: number;
}

export type Side = "L" | "R";

export type Role =
  | "hip" | "spine" | "neck" | "head"
  | "shoulder_L" | "shoulder_R"
  | "upper_arm_L" | "upper_arm_R"
  | "forearm_L" | "forearm_R"
  | "hand_L" | "hand_R"
  | "hip_L" | "hip_R"
  | "thigh_L" | "thigh_R"
  | "shin_L" | "shin_R"
  | "foot_L" | "foot_R";

export type RoleMap = Partial<Record<Role, BoneInfo>>;

export const TWO_PI = Math.PI * 2;

export function boneOp(
  layerId: number,
  bone: BoneInfo,
  frame: number,
  values: { angle?: number; posX?: number; posY?: number; scale?: number },
): Operation {
  return { method: "bone.setTransform", params: { layerId, boneId: bone.id, frame, ...values } };
}

/** Deterministic PRNG (mulberry32) so generated animation is reproducible. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function requireRole(roles: RoleMap, role: Role): BoneInfo {
  const bone = roles[role];
  if (!bone) {
    throw new Error(
      `Rig has no bone for role "${role}". Name your bones accordingly (e.g. "${role}") or build the rig with rig_buildHumanoid.`,
    );
  }
  return bone;
}
