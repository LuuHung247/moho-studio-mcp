/** Skeleton specs -> bone.addBone operations (pure, unit-testable). */

import { config } from "../config.js";
import type { Operation } from "./types.js";

export interface BoneSpec {
  name: string;
  /** Name of the parent bone, omitted for a root bone. */
  parent?: string;
  /** Bone length in layer units. */
  length: number;
  /** Rest angle in radians. Root: world angle. Child: relative to the parent. */
  angle?: number;
  /** Root only: world position. */
  x?: number;
  y?: number;
  /** Child only: attach at the parent's "tip" (default) or its "start". */
  attach?: "tip" | "start";
}

export interface SkeletonPlan {
  operations: Operation[];
  /** bone name -> bone index (valid when the layer's skeleton starts empty). */
  indexByName: Record<string, number>;
}

/**
 * Convert a skeleton spec to addBone operations.
 * `existingBones` offsets indices when adding to a non-empty skeleton.
 */
export function planSkeleton(
  layerId: number,
  bones: readonly BoneSpec[],
  existingBones = 0,
  origin: "start" | "tip" = config.boneOrigin,
): SkeletonPlan {
  const index: Record<string, number> = {};
  const byName = new Map<string, BoneSpec>();
  const operations: Operation[] = [];

  bones.forEach((spec, i) => {
    if (byName.has(spec.name)) {
      throw new Error(`Duplicate bone name "${spec.name}"`);
    }
    if (!(spec.length > 0)) {
      throw new Error(`Bone "${spec.name}" needs a positive length`);
    }

    const params: Record<string, unknown> = {
      layerId,
      name: spec.name,
      length: spec.length,
      angle: spec.angle ?? 0,
    };

    if (spec.parent === undefined) {
      params.posX = spec.x ?? 0;
      params.posY = spec.y ?? 0;
      params.parentBoneId = -1;
    } else {
      const parent = byName.get(spec.parent);
      if (!parent) {
        throw new Error(
          `Bone "${spec.name}": parent "${spec.parent}" must be defined earlier in the list`,
        );
      }
      const attachAtTip = (spec.attach ?? "tip") === "tip";
      const offset = attachAtTip
        ? origin === "start" ? parent.length : 0
        : origin === "start" ? 0 : -parent.length;
      params.posX = offset;
      params.posY = 0;
      params.parentBoneId = existingBones + (index[spec.parent] as number);
    }

    index[spec.name] = i;
    byName.set(spec.name, spec);
    operations.push({ method: "bone.addBone", params });
  });

  return {
    operations,
    indexByName: Object.fromEntries(
      Object.entries(index).map(([name, i]) => [name, existingBones + i]),
    ),
  };
}
